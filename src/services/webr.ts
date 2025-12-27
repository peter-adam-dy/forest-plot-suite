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
      await this.installPackages(['meta', 'metafor', 'grid', 'jsonlite'])
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
      // Use PNG device with WebR's virtual filesystem
      const plotCode = `
        # Create PNG device with filename directly
        png("/tmp/plot.png", width=1200, height=800, res=120)

        # Execute the plot code
        ${code}

        # Close the device
        dev.off()

        # Read the file and encode as base64
        con <- file("/tmp/plot.png", "rb")
        img_raw <- readBin(con, "raw", n = 1e6)
        close(con)

        # Convert to base64
        paste0(as.character(jsonlite::base64_enc(img_raw)))
      `

      const result = await this.webR.evalR(plotCode)
      const imageData: unknown = await result.toJs()

      // imageData is an R object with values array
      if (imageData && typeof imageData === 'object' && 'values' in imageData) {
        const values = (imageData as any).values
        if (Array.isArray(values) && values.length > 0 && typeof values[0] === 'string') {
          return `data:image/png;base64,${values[0]}`
        }
      }

      // Fallback: if it's a plain string
      if (typeof imageData === 'string' && imageData.length > 0) {
        return `data:image/png;base64,${imageData}`
      }

      console.error('Unexpected image data type:', typeof imageData, imageData)
      throw new Error('Invalid image data format')
    } catch (error) {
      console.error('Failed to generate plot:', error)
      // Try to close any open devices
      try {
        await this.webR.evalR('graphics.off()')
      } catch (e) {
        // Ignore errors when closing devices
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
}

// Singleton instance
let webRServiceInstance: WebRServiceImpl | null = null

export function getWebRService(): WebRService {
  if (!webRServiceInstance) {
    webRServiceInstance = new WebRServiceImpl()
  }
  return webRServiceInstance
}
