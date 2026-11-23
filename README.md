# Grand City

**POWER HAS A PRICE.**

An original open-world action-adventure game built with **Three.js** (rendering) and **Electron** (desktop packaging). Explore the city of **Viceport** in the coastal state of **Solara** as two protagonists — **Marcus Reed** and **Sofia Carter**.

---

## Play in the browser (dev preview)

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build & package a Windows .exe

Grand City is packaged into a standalone Windows executable via Electron + electron-builder.

### Requirements
- Node.js 18+
- To produce the **Windows `.exe`**: run on a **Windows** machine, or on Linux/macOS using **Wine** (`brew install --cask wine-stable` / `sudo apt install wine`).

### Steps

```bash
npm install
npm run dist
```

This produces, in `release/`:
- **`GrandCity_Setup.exe`** — NSIS installer (the standard Windows installer with desktop shortcut).
- **`GrandCity-0.1.0-portable.exe`** — a single-file portable executable (just double-click to play).

After installing (or running the portable build), double-click **Grand City** to launch the game. No browser, no editor, no Python — just the executable.

### Quick portable build only

```bash
npm run dist:portable
```

---

## Controls

| Action | Key |
|---|---|
| Move | W A S D |
| Sprint | Shift |
| Jump | Space |
| Crouch | C |
| Interact / Enter-Exit vehicle | F |
| Switch character (Marcus ↔ Sofia) | Tab |
| Change camera mode | V |
| World map (pause menu) | M / Esc → Map |
| Pause | Esc |

Mouse controls the camera. Click the game to lock the pointer.

---

## Implemented systems

- Third-person character with procedural walk animation + character switching (Marcus/Sofia)
- Drivable vehicles (sports, sedan, muscle) with arcade physics — steering, throttle, braking, weight transfer, wheel spin
- Procedural city **Viceport** with 9 named districts, road grid, varied architecture, park, trees
- Traffic simulation and pedestrian NPCs
- Day/night cycle with dynamic sun + sky shader
- Minimap (GTA-style, rotating) + full world map
- HUD: money, health, armor, wanted level, speedometer, clock, location label, mission toast
- Main menu, pause menu, settings (audio + sensitivity), missions list, statistics, credits
- Campaign starting at **Mission 10 — Family Matters**, through Mission 15 — A New Tomorrow, with mission markers, dialogue, objectives, rewards
- Save/load via localStorage (progress, settings)

## Building the .exe from this sandbox

This environment (Linux) cannot natively sign/compile a Windows binary, but the full Electron + electron-builder configuration is included. Run `npm run dist` on a Windows machine (or with Wine) to produce `GrandCity_Setup.exe` / the portable `.exe`.
