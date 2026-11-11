# 🐒 Monkey Game

> **Eat bananas. Dodge stones. How far can you run?**

A fast-paced jungle runner built with vanilla JavaScript and HTML5 Canvas — no frameworks, no dependencies.

---

## 🎮 Play

Open `index.html` in any modern browser. No install needed.

| Control | Action |
|---------|--------|
| `SPACE` / `↑` | Jump |
| `R` | Restart after Game Over |
| `M` | Toggle sound on/off |
| Tap (mobile) | Jump / Restart |

---

## ✨ Features

- 🍌 **Banana & Banana Bunch** pickups (+2 / +5 points)
- 🪨 **Stone obstacles** — 3 lives, screen shake on hit
- 📈 **6 difficulty levels** — speed and spawn rate increase with score
- 🏆 **High score** saved in localStorage (persists across sessions)
- 🎵 **Procedural sound effects** via Web Audio API (no audio files)
- ✨ **Particle effects** — burst on banana collect, dust on stone hit
- 📱 **Mobile / touch support**
- 🔇 **Mute button**

---

## 🗂 File Structure

```
MONKEY-GAME123/
├── index.html       ← Entry point
├── style.css        ← All styling & animations
├── sketch.js        ← Main game engine & render loop
├── audio.js         ← Web Audio API sound effects
├── particles.js     ← Canvas particle system
├── storage.js       ← localStorage (high score, settings)
├── Monkey_01-10.png ← Monkey animation frames
├── Banana.png       ← Single banana sprite
├── Bananas.png      ← Banana bunch sprite
├── stone.png        ← Stone obstacle sprite
└── jungle2.jpg      ← Scrolling background
```

---

## 🛠 Built With

- **HTML5 Canvas** — rendering
- **Vanilla JS (ES6)** — no libraries or frameworks
- **Web Audio API** — procedural sound effects
- **localStorage** — high score persistence
- **Google Fonts** (Bangers + Nunito) — typography

---

Made with ❤️ | Originally built on Whitehat Jr, enhanced with modern JS

---

## What's new in this revival
- **Fixed:** monkey sprite never loaded (wrong filename pattern), game speed depending on monitor refresh rate (now fixed 60Hz timestep), sudden speed drops, skipped score milestones, squashed sprites, spawn timing, phantom jump on start, `localStorage` crashes in private mode, Safari hit-flash.
- **Animation:** 3-layer parallax jungle, seamless mirrored background, swaying vines, light shafts, falling leaves, foreground fronds, squash & stretch + tilt, landing/run dust, soft ground shadow, spinning bananas, rolling stones, hit-stop + red flash, level-up zoom pulse, golden-hour grading at higher levels, animated title screen.
- **Added:** pause (P / Esc / tab switch), responsive canvas with sharp rendering on phones, favicon, optimized images.

## v2 additions
- **Big screen:** the game now fills your window (up to 1600px wide), stays sharp on retina, and has a fullscreen button (F).
- **Controls:** Space/Up/W jump, press again in the air for a **double jump + flip**, Down/S to **duck** (swipe down on mobile) or **fast-fall** in the air.
- **New obstacle:** low-flying **birds** from level 2. Duck under them.
- **Power-ups:** 🛡️ shield, 🧲 magnet, ⭐ double points, ❤️ extra life.
- **Combo:** chain bananas for up to x4 points.
- **Animation:** speed lines at high speed, running bounce and lean, level banners.

## Deploy on Vercel
1. Push this folder to GitHub, then on vercel.com choose **Add New → Project** and import it. No framework, build command or output setting is needed (`vercel.json` handles it).
2. Or from this folder run: `npx vercel --prod`

Test locally with `npx serve .` or `python3 -m http.server`.
