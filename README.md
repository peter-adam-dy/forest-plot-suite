# Forest Plot Generator

A modern web-based forest plot generator built with Vue 3, TypeScript, and Vuetify. This application allows users to create, manage, and export forest plots for meta-analysis and research purposes.

## Features

### Current Implementation (Phase 1)
- ✅ **Project Scaffolding**: Vue 3 + TypeScript + Vite setup
- ✅ **Session Management**: Create, rename, delete, and manage multiple analysis sessions
- ✅ **IndexedDB Persistence**: All sessions automatically saved to browser storage
- ✅ **Import/Export**: Export sessions as JSON and import them back
- ✅ **Modern UI**: Vuetify 3 Material Design interface with responsive navigation
- ✅ **Type Safety**: Full TypeScript implementation with strict type checking

### Coming Soon (Phase 2+)
- 🔄 Data Editor: Manual data entry with editable grid
- 🔄 CSV Import: Upload and parse CSV files
- 🔄 Excel Import: Advanced Excel import with sheet/range selection
- 🔄 Plot Configuration: Customize axis types, labels, colors, and more
- 🔄 WebR Integration: Generate forest plots using R in the browser
- 🔄 Plot Viewer: Interactive plot display with zoom/pan
- 🔄 Code Editor: View and edit generated R code
- 🔄 Export: PNG, SVG, and R code exports

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
│   ├── data/           # Data input/editing components (coming soon)
│   ├── plot/           # Plot viewer components (coming soon)
│   ├── code/           # Code editor components (coming soon)
│   └── shared/         # Shared/common components
├── stores/             # Pinia stores
│   └── session.ts      # Session state management
├── db/                 # IndexedDB utilities
│   └── schema.ts       # Database schema and operations
├── services/           # Business logic services
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
2. 🔄 Phase 2: Data input and management
3. 🔄 Phase 3: WebR integration and plot generation
4. 🔄 Phase 4: Export and advanced features

## License

MIT

## Acknowledgments

- Built with [Vue.js](https://vuejs.org/)
- UI components by [Vuetify](https://vuetifyjs.com/)
- Icons by [Material Design Icons](https://materialdesignicons.com/)
