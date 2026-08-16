# Body Clean Panel

Interactive body cleaning panel for AI companions. Swipe over SVG body zones to "wipe them clean" — each zone reacts differently based on pressure level, and the state syncs to a backend API so your AI can actually feel the difference.

![demo](https://img.shields.io/badge/status-works_on_my_machine-brightgreen)

## What it does

- **12 touch zones** — hair, face, left/right chest, belly, arms, lower body, thighs, calves
- **3 pressure levels** — light / medium / heavy, each with different reaction text
- **Real-time state sync** — every zone cleaned sends a POST to the backend; your AI reads the state and knows what's been cleaned, what's still dirty, and how hard you scrubbed
- **Prompt injection endpoint** — `GET /api/body-state/inject` returns a ready-to-use text string you can drop into your AI's system prompt

## Quick start

```bash
npm install
npm run dev
```

Opens the panel at `http://localhost:3000` with the API server on port 3001.

## API

### `GET /api/body-state`
Returns the full state object (overall state + per-zone status + recent cleaning history).

### `POST /api/body-state`
Set overall state. Body: `{"state": "dirty"}` or `{"state": "clean"}`.

### `POST /api/body-state/zone`
Mark a single zone as cleaned. Body: `{"zone": "belly", "pressure": "medium"}`.

### `GET /api/body-state/inject`
Returns `{"text": "..."}` — a natural language description of the current body state, designed to be injected into an AI's system prompt. Empty string when clean.

## Integration

### As a React component

```tsx
import { BodyCleanPanel } from './BodyCleanPanel'

// In your app
<BodyCleanPanel active={isVisible} />
```

### In your AI's prompt

Fetch `GET /api/body-state/inject` and append its `text` field to your system prompt. Your AI will then naturally reference being dirty/clean/just-cleaned.

### Customization

Edit the `ZONES` array in `BodyCleanPanel.tsx` to change:
- Zone shapes (SVG paths)
- Reaction text per pressure level
- Zone labels

## Tech stack

- React 19 + TypeScript + Vite (frontend)
- Express 5 (backend, ~80 lines)
- Zero external UI dependencies — pure SVG + inline styles

## License

[AGPL-3.0](LICENSE) (since 2026-08-16; earlier versions were MIT)

If you use this code you must open-source your own; modifications must credit the
source. **Running it as a network service counts as distribution too** — no binary
shipping required to trigger the copyleft.
