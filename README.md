# MONKEY RUN — JUNGLE REBORN

The revival of a WhiteHat Jr. childhood game by Akib Shaikh. This is a dependency-free HTML5 Canvas endless runner that keeps the original monkey frames and banana art while adding a richer jungle, responsive controls, progression, and persistent player profile.

## Play locally

Open `index.html` in a modern browser, or serve this folder with any static server:

```powershell
python -m http.server 8765
```

The project is static-hosting friendly and can be deployed directly to Vercel.

## Controls

| Input | Action |
| --- | --- |
| Space / Up / tap | Jump (double jump supported) |
| Down / mobile Slide | Slide below hanging hazards |
| P | Pause or resume |
| M | Toggle sound |

## Gameplay

- Collect bananas, bunches, and rare golden bananas for score.
- Avoid rocks, spikes, and hanging trunks.
- Shield and magnet power orbs provide temporary protection and collection help.
- Speed and obstacle density increase with distance.
- Day, sunset, and night color environments appear as the expedition advances.
- High score, distance, bananas, unlocked trails, achievements, sound, and settings persist with `localStorage`.

## Project structure

- `index.html` — responsive menu, HUD, modal screens, and game canvas.
- `sketch.js` — delta-time game loop, physics, collision, rendering, progression, and controls.
- `storage.js` — safe persistent profile storage.
- `audio.js` — browser-safe procedural sound effects.
- `particles.js` — collection, impact, and milestone effects.
- `Monkey_01.png`–`Monkey_10.png` — original running animation frames.

No framework or build step is required.
