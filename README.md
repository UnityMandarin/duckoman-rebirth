# Duckoman Rebirth

**The original Duckoman gameplay, faithfully remastered for a sharper modern browser presentation.**

Duckoman Rebirth keeps the complete 2017 Unity game as its authoritative baseline. Movement, jumping, gravity, collision checks, enemies, boss behavior, camera bounds, level layout, animation timing, health, death, respawn, and victory progression all run through the original shipped Unity WebGL build.

The Rebirth work is deliberately visual and presentational:

- responsive 8:5 game presentation for desktop and mobile-sized browsers;
- crisp nearest-neighbor scaling for the original pixel art;
- restrained contrast, color, screen-light, vignette, and scanline treatment;
- an identity-matched industrial backdrop outside the game canvas;
- an accessible fullscreen control and keyboard-focus feedback;
- a redesigned loading, control, and attribution shell;
- a zero-framework static deployment that works from GitHub Pages; and
- automated integrity checks that prevent gameplay-critical files from drifting from the baseline.

## Play locally

The archived Unity loader requires HTTP. From the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- **WASD / Arrow Keys** — movement
- **L / Space** — jump

## Project structure

- `Assets/`, `ProjectSettings/` — original editable Unity 5.5.2f1 project
- `Release/` — original shipped Unity WebGL runtime and data
- `TemplateData/` — Rebirth browser presentation and Unity loading assets
- `DuckomanHTML5/` — archived original source-project export
- `scripts/` — baseline and web-build validation

See [`BASELINE.md`](BASELINE.md) for the preservation boundary, [`VALIDATION.md`](VALIDATION.md) for the comparison checklist, and [`NOTICE.md`](NOTICE.md) for attribution.

## License

MIT. Copyright (c) 2017 FishWash. The original copyright notice and license are preserved in [`LICENSE`](LICENSE).
