# Duckoman Rebirth

Duckoman Rebirth is a browser-native reconstruction of the original 2017 Duckoman.

The archived Unity project and WebGL runtime have been intentionally removed from the active repository. Gate 1 is a deliberately graybox Phaser 4.2.1 platformer foundation using TypeScript, Vite, WebGL, and Arcade Physics.

## Gate 1 controls and scope

- Move: A/D or Left/Right arrows
- Jump / throw: Space or L
- Dash: K (costs one of three stamina; 0.5 stamina regenerates every two seconds)
- Crouch / air slam: S or Down; jump shortly after a slam landing for a boosted jump

The single scrolling test room includes movement, dash, crouch, air slam and boosted jump, coyote time, jump buffering, variable jump height, one patrol enemy, stomp/damage/health/reset, and one pickup/carry/throw object. Gameplay tuning is centralized in `src/config/tuning.ts`.

This is not final art or a full game. The graybox does not load preserved original sprites.

## Preserved reference art

The original reusable PNG sprites are retained byte-for-byte in `assets/original/`. They are source material for the future browser implementation, not an executable Unity project.

## Source references

- Original hosted game: <https://github.com/jfox16/Duckoman>
- Original editable Unity source: <https://github.com/jfox16/DuckomanCode>

## License

MIT. Copyright (c) 2017 FishWash. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
