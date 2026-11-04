# Do not add routes here

This folder is intentionally empty apart from this README.

Next.js treats a root `pages/` folder as the Pages Router, and falls back to `src/pages/` if no root
folder exists. Feature-Sliced Design needs `src/pages/` for its *pages layer*, so this folder stops
Next.js from treating FSD page components as routes. Routes live in `app/`; page components live in
`src/pages/`.
