# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
応答は日本語で。

## Project Overview

FramePlanner is a manga creation tool that allows users to define manga frame structures as tree data (JSON) and arrange images within frames like windows. This is a Svelte-based web application with a complex layered canvas system for interactive manga editing.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server on http://localhost:5173
- `npm run dev-https` - Start development server with HTTPS support
- `npm run build` - Production build (runs stamp command first)
- `npm run devbuild` - Development build without optimizations
- `npm run check` - Run Svelte type checking

### Testing
- `npm run vitest` - Run Vitest test runner
- Test files use `.vitest.ts` extension (see `src/lib/layeredCanvas/tools/geometry/geometry.vitest.ts`)
- Test setup configured in `test/setup.ts` with fake IndexedDB and mocked Canvas APIs

### Other Utilities
- `npm run stamp` - Generate git log stamp (used in builds)
- `npm run deploy` - Deploy to Cloudflare Pages (only from sns_main branch)
- `npm run webp` - Convert images to WebP format

## Architecture Overview

### Core Systems

**LayeredCanvas System** (`src/lib/layeredCanvas/`)
- **Paper/Layer Architecture**: Multi-layered rendering system where each "Paper" contains multiple "Layers"
- **Viewport Management**: Handles canvas transformations, scaling, and coordinate conversions
- **Event Handling**: Sophisticated pointer event system with depth-based layering
- Key files: `system/layeredCanvas.ts`, `system/paperArray.ts`

**Book Data Model** (`src/lib/book/`)
- **Book Structure**: Books contain Pages, Pages contain FrameTrees and Bubbles
- **History Management**: Undo/redo system with tagged operations
- **Media Handling**: Support for images, videos, and remote media references
- Key files: `book.ts`, `envelope.ts` (for serialization)

**File System Abstraction** (`src/lib/filesystem/`)
- **Multi-Backend Support**: IndexedDB, File System Access API, Supabase, Firebase
- **Content Storage**: Separate image storage backends (Backblaze, Firebase)
- **Versioning**: Revision-based file tracking with ULIDs and prefixes
- Key files: `fileSystem.ts`, `contentStorage/`

**Component Architecture**
- **BookEditor**: Main editing workspace (`src/bookeditor/BookWorkspace.svelte`)
- **Inspectors**: Specialized panels for bubbles, frames, and pages
- **Generators**: AI image generation integrations
- **File Manager**: Tree-based file browser with drag-and-drop

### Data Flow

1. **Store-based State**: Svelte stores manage global state (`workspaceStore.ts`, `uiStore.ts`)
2. **Canvas Rendering**: LayeredCanvas handles real-time rendering and interaction
3. **File Operations**: FileSystem abstraction handles persistence across backends
4. **History Tracking**: Operations create reversible history entries

### Key Patterns

**Bubble System**: Speech bubbles with customizable shapes, fonts, and text layout
- Shape definitions in `src/lib/layeredCanvas/tools/draw/bubbleGraphic.ts`
- Font loading and management in `src/bookeditor/fontLoading.ts`

**Frame Tree**: Hierarchical layout system for manga panels
- Tree structure in `src/lib/layeredCanvas/dataModels/frameTree.ts`
- Physical layout calculation with constraints

**Film Stack**: Layered media elements within frames
- Film compositing in `src/lib/layeredCanvas/dataModels/film.ts`
- Effect processing and transformations

## Adding New Bubble Shapes

Based on the README instructions:
1. Add shape function to `src/lib/layeredCanvas/tools/draw/bubbleGraphic.ts`
2. Add entry to `drawBubble` function in same file
3. Add shape to the list in `src/bookeditor/bubbleinspector/ShapeChooser.svelte`

## Configuration Notes

- **TypeScript**: Configured with path aliases (`$bookTypes/*`, `$protocolTypes/*`)
- **Vite**: Custom config includes Paper.js optimization and WASM asset handling
- **Tailwind CSS**: Used for styling with Skeleton UI components
- **Testing**: Vitest with jsdom environment and mocked Canvas/IndexedDB APIs

## Development Environment

- **Target**: WSL2, Ubuntu 22 (as noted in README)
- **Font Loading**: Automatic Google Fonts integration for bubble text
- **Asset Management**: WebP conversion pipeline for optimized images
- **Deployment**: Cloudflare Pages with branch-based deployment protection

## File System Structure

- `/public/` - Static assets (fonts, favicons, banners)
- `/src/assets/` - UI icons and graphics organized by feature
- `/src/lib/` - Core libraries and data models
- `/src/bookeditor/` - Main editing interface components
- `/src/utils/` - Shared utilities and dialogs
- `/documents/` - Technical documentation and SQL schemas