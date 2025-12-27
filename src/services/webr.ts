import { WebR } from 'webr'

export interface WebRService {
  initialize(): Promise<void>
  isReady(): boolean
  executeCode(code: string): Promise<string>
  generatePlot(code: string): Promise<string>
  installPackages(packages: string[]): Promise<void>
}

class WebRServiceImpl implements WebRService {
  private webR: WebR | null = null
  private ready: boolean = false
  private initializing: boolean = false
  private initializationPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.ready) return
    if (this.initializing && this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializing = true
    this.initializationPromise = this._initialize()
    return this.initializationPromise
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('Initializing WebR...')

      this.webR = new WebR({
        baseUrl: 'https://webr.r-wasm.org/latest/',
        interactive: false,
      })

      await this.webR.init()
      console.log('WebR initialized successfully')

      // Install required packages
      console.log('Installing R packages...')
      await this.installPackages(['meta', 'metafor', 'grid'])
      console.log('R packages installed successfully')

      this.ready = true
      this.initializing = false
    } catch (error) {
      this.initializing = false
      console.error('Failed to initialize WebR:', error)
      throw error
    }
  }

  isReady(): boolean {
    return this.ready
  }

  async executeCode(code: string): Promise<string> {
    if (!this.webR || !this.ready) {
      throw new Error('WebR is not initialized')
    }

    try {
      const result = await this.webR.evalR(code)
      const output = await result.toJs()
      return JSON.stringify(output)
    } catch (error) {
      console.error('Failed to execute R code:', error)
      throw error
    }
  }

  async generatePlot(code: string): Promise<string> {
    if (!this.webR || !this.ready) {
      throw new Error('WebR is not initialized')
    }

    try {
      // Use WebR's canvas device
      await this.webR.evalR('webr::canvas(width=800, height=600)')

      // Execute the plot code
      await this.webR.evalR(code)

      // Flush the canvas and get the image
      const result = await this.webR.evalR('webr::canvas_capture()')
      const imageData: unknown = await result.toJs()

      // Close the device
      await this.webR.evalR('dev.off()')

      // imageData should be a base64-encoded PNG
      if (typeof imageData === 'string' && imageData.length > 0) {
        return `data:image/png;base64,${imageData}`
      }

      // If it's an array, convert it
      if (Array.isArray(imageData)) {
        const uint8Array = new Uint8Array(imageData as number[])
        const base64 = this.arrayBufferToBase64(uint8Array)
        return `data:image/png;base64,${base64}`
      }

      console.error('Unexpected image data type:', typeof imageData, imageData)
      throw new Error('Invalid image data format')
    } catch (error) {
      console.error('Failed to generate plot:', error)
      // Try to close any open devices
      try {
        await this.webR.evalR('dev.off()')
      } catch (e) {
        // Ignore errors when closing device
      }
      throw error
    }
  }

  async installPackages(packages: string[]): Promise<void> {
    if (!this.webR || !this.ready) {
      // If not ready yet but webR exists, we're in initialization
      if (!this.webR) {
        throw new Error('WebR is not initialized')
      }
    }

    try {
      for (const pkg of packages) {
        console.log(`Installing package: ${pkg}`)
        await this.webR.installPackages([pkg])
      }
    } catch (error) {
      console.error('Failed to install packages:', error)
      throw error
    }
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const len = buffer.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i] as number)
    }
    return btoa(binary)
  }
}

// Singleton instance
let webRServiceInstance: WebRServiceImpl | null = null

export function getWebRService(): WebRService {
  if (!webRServiceInstance) {
    webRServiceInstance = new WebRServiceImpl()
  }
  return webRServiceInstance
}
