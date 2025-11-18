This directory will contain the public website app. To migrate the current app here:

- Move `src/`, `index.html`, `vite.config.ts`, `postcss.config.js`, and related config files to `apps/web/`.
- Update `apps/web/package.json` (create one) with the app's dependencies and scripts.
- Use workspace tooling (npm workspaces / pnpm) to run install and dev from repo root.


