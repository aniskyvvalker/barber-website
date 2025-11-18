This package will hold shared UI components (design system).

Migration steps:
- Move `src/components/ui/` here into `packages/ui/src`.
- Add a `package.json` for this package and export components for other apps to consume.
- Use workspace-level tooling to reference this package from `apps/*` via workspaces.


