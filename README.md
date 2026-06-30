# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) (18+) and npm.

Install dependencies:

```bash
npm install
```

Start the dev server (with hot module reload):

```bash
npm run dev
```

Vite prints a local URL (default <http://localhost:5173>) — open it in your browser.

## Production build

Build the optimised, minified bundle into the `dist/` folder:

```bash
npm run build
```

Serve that build locally to verify it before deploying:

```bash
npm run preview
```

Or do both in one step — build, then serve:

```bash
npm start
```

`preview` runs on <http://localhost:4173> by default. To expose it on your
network (e.g. to test from another device), use:

```bash
npm run preview:host
```

To deploy, copy the contents of `dist/` to any static host (Netlify, Vercel,
GitHub Pages, S3, nginx, etc.). The output is plain static files — no Node
server is required in production.

## Scripts

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with HMR                          |
| `npm run build`        | Type-check (`tsc -b`) and build for production into `dist/` |
| `npm run preview`      | Serve the production build locally to preview it            |
| `npm run preview:host` | Preview the build on the local network (port 4173)          |
| `npm start`            | Build then serve the production build                       |
| `npm run lint`         | Lint the project with Oxlint                                |

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
