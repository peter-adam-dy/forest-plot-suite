# Forest Plot Generator

A modern web-based forest plot generator built with Vue 3, TypeScript, and Vuetify. This application allows users to create, manage, and export forest plots for meta-analysis and research purposes.

## Features

### Current Implementation

**Phase 1: Project Scaffolding & Session Management**
- ✅ **Project Scaffolding**: Vue 3 + TypeScript + Vite setup
- ✅ **Session Management**: Create, rename, delete, and manage multiple analysis sessions
- ✅ **IndexedDB Persistence**: All sessions automatically saved to browser storage
- ✅ **Import/Export**: Export sessions as JSON and import them back
- ✅ **Modern UI**: Vuetify 3 Material Design interface with responsive navigation
- ✅ **Type Safety**: Full TypeScript implementation with strict type checking

**Phase 2: Data Input & Management**
- ✅ **Data Editor**: Editable Vuetify data table with inline editing
- ✅ **CSV Import**: Upload and parse CSV/TSV files with configurable delimiters (comma, semicolon, tab, pipe, space)
- ✅ **Excel Import**: Advanced Excel/CSV import with sheet/range selection, orientation support, and delimiter selection
- ✅ **Data Validation**: Real-time validation with error and warning display
- ✅ **Column Mapping**: Intelligent column detection with manual override for flexible data import

**Phase 3: Plot Configuration & WebR Integration**
- ✅ **Plot Configuration**: Comprehensive configuration panel with all plot settings
  - Axis type selection (linear, log2, loge, log10)
  - Auto and manual axis limits
  - Title, subtitle, and axis labels
  - Effect measure selection (RR, OR, HR, MD, SMD)
  - Visual styling (point size, color schemes, show weights)
  - DPI selection for export quality (72, 150, 300, 600)
- ✅ **WebR Integration**: Full R environment running in the browser
  - Automatic WebR initialization with package installation
  - R code generation from data and configuration
  - Real-time plot generation without server backend
- ✅ **Plot Viewer**: Interactive plot display component
  - Live plot generation with loading states
  - Download plots as PNG
  - Copy plots to clipboard
  - Plot statistics and data summary
- ✅ **Code Viewer**: View and export generated R code
  - Syntax-highlighted R code display
  - Copy code to clipboard
  - Download as .R file
  - Code information and usage instructions

### Coming Soon (Phase 4+)
- 🔄 Advanced Export: SVG and PDF exports
- 🔄 Custom R Code: Edit and run custom R code
- 🔄 Additional Plot Types: Funnel plots, forest plots with subgroups
- 🔄 Data Versioning UI: Manage multiple data versions

## Tech Stack

- **Frontend Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Framework**: Vuetify 3
- **State Management**: Pinia
- **Database**: IndexedDB (via idb library)
- **Data Processing**: SheetJS (xlsx)
- **R Runtime**: WebR (R in WebAssembly)

## Project Structure

```
src/
├── components/          # Vue components
│   ├── session/        # Session management components
│   │   └── SessionManager.vue
│   ├── data/           # Data input/editing components
│   │   ├── DataEditor.vue
│   │   ├── CSVImporter.vue
│   │   └── ExcelImporter.vue
│   ├── plot/           # Plot viewer and configuration components
│   │   ├── PlotConfig.vue
│   │   ├── PlotViewer.vue
│   │   └── CodeViewer.vue
│   └── shared/         # Shared/common components
├── stores/             # Pinia stores
│   └── session.ts      # Session state management
├── db/                 # IndexedDB utilities
│   └── schema.ts       # Database schema and operations
├── services/           # Business logic services
│   ├── dataParser.ts   # CSV/Excel parsing
│   ├── webr.ts         # WebR service
│   └── rCodeGenerator.ts # R code generation
├── types/              # TypeScript type definitions
│   └── index.ts        # Core types and interfaces
├── App.vue             # Root component
└── main.ts             # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

### Session Management

The session store (`src/stores/session.ts`) provides the following functionality:

- `createSession(name)`: Create a new session
- `renameSession(id, name)`: Rename a session
- `deleteSession(id)`: Delete a session
- `setActiveSession(id)`: Set the active session
- `updateConfig(config)`: Update plot configuration
- `updateData(data)`: Update session data
- `exportSession(id)`: Export session as JSON
- `importSession(jsonData)`: Import session from JSON

### IndexedDB Schema

All sessions are persisted to IndexedDB with the following structure:

- **Database**: `forest-plot-app`
- **Store**: `sessions`
- **Key**: `session.id`

Each session contains:
- Unique ID and name
- Created/modified timestamps
- Multiple data versions (history)
- Plot configuration
- Generated R code

## Session Data Structure

```typescript
interface Session {
  id: string
  name: string
  created: Date
  modified: Date
  dataVersions: DataVersion[]
  config: PlotConfig
  generatedCode: string
}

interface DataVersion {
  id: string
  name: string
  timestamp: Date
  data: ForestPlotData[]
}

interface ForestPlotData {
  study: string
  effect: number
  ci_lower: number
  ci_upper: number
  weight?: number
}
```

## Contributing

This project follows a phased development approach:

1. ✅ Phase 1: Project scaffolding and session management
2. ✅ Phase 2: Data input and management
3. ✅ Phase 3: WebR integration and plot generation
4. 🔄 Phase 4: Advanced features and export options

## License

MIT

## Acknowledgments

- Built with [Vue.js](https://vuejs.org/)
- UI components by [Vuetify](https://vuetifyjs.com/)
- Icons by [Material Design Icons](https://materialdesignicons.com/)
