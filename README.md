# solid-fe

A [SolidJS](https://www.solidjs.com/) project bundled with [webpack](https://webpack.js.org/) (instead of the default Vite).

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the dev server with HMR at `localhost:3000`. |
| `npm run build` | Build a production bundle into `dist/`. |
| `npm run typecheck` | Type-check the project without emitting. |

## How it works

- **`babel-loader` + `babel-preset-solid`** compiles Solid's JSX into its fine-grained reactive DOM calls.
- **`@babel/preset-typescript`** strips TypeScript types (type-checking is done separately via `tsc --noEmit`).
- **`html-webpack-plugin`** injects the bundle into `src/index.html`.

## Project structure

```text
src/
  index.html   # HTML template
  index.tsx    # App entry point — mounts <App /> to #root
  App.tsx      # Root component
  index.css    # Global styles
  App.css      # Component styles
webpack.config.js
tsconfig.json
```
