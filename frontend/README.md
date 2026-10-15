# Urbaly — Frontend

Next.js (React + TypeScript) app for collaborative urban monitoring in Macapá-AP.
Map UI: MapLibre GL. Styling: Tailwind CSS + shadcn-style UI + SmoothUI motion.

## Setup

```bash
cd frontend
cp ../.env.example ../.env   # fill in CARTO_API_KEY / GOOGLE_CLIENT_ID
npm install                  # also copies the MapLibre worker into public/maplibre/
npm run dev                  # http://localhost:3000
```

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — eslint
- `npm run typecheck` — `tsc --noEmit`
- `npm run clean` — remove `.next/` + `tsconfig.tsbuildinfo`

## Env

Server-only, read via `lib/env.ts` (see root `.env.example`).
Only `CARTO_API_KEY` and `GOOGLE_CLIENT_ID` reach the browser, through
`/api/public-config`. Never use `NEXT_PUBLIC_*` for secrets.
