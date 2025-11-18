This directory will contain the admin dashboard app. To migrate:

- Move `src/pages/admin` and any admin-only assets into `apps/admin/src`.
- Create `apps/admin/package.json` with its dependencies and scripts.
- Adjust CI to run admin builds/tests separately.


