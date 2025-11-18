Monorepo conversion guide

This repository is being transitioned to a monorepo layout. The goal is to keep the current code working while creating a clear structure for multiple apps and shared packages.

Recommended layout
- apps/web/        — public website (move current root app here)
- apps/admin/      — admin dashboard
- packages/ui/     — shared UI components and design system

Quick migration steps (safe, manual)
1. Create `apps/web/` and `apps/admin/` directories.
2. Move web-specific files into `apps/web/`:
   - Move `src/`, `index.html`, `postcss.config.js`, `vite.config.ts`, and `package.json`-related scripts into `apps/web/`. You can keep the current root `package.json` as the workspace root.
3. Create `packages/ui/` and move shared components (`src/components/ui`) there as a package with its own `package.json`.
4. Update import paths and workspace package.json settings.
5. Update CI to install workspaces and run per-app builds.

Notes
- This repo already has `workspaces` configured in `package.json`; you can migrate incrementally. Initially you can keep running the app from the root while files are moved.
- When moving files, run the app and tests after each step to catch import path issues early.

If you'd like, I can perform the file moves and update scripts automatically. Otherwise, follow these steps when ready.


