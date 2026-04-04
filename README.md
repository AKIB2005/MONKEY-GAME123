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
