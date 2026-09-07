# Authoritative baseline

Duckoman Rebirth deliberately keeps the shipped 2017 game as its behavioral authority.

The root commit of this repository is an exact import of:

- the editable Unity 5.5.2f1 project from `jfox16/DuckomanCode`; and
- the browser build from `jfox16/Duckoman`.

The following paths are behavior-critical and remain unchanged from that root commit:

- `Assets/Scripts/`
- `Assets/Scenes/`
- `Assets/Prefabs/`
- `Assets/Animations/`
- `Assets/Controllers/`
- `Assets/Materials/`
- `ProjectSettings/`
- `Release/`

This means movement, jump velocity, gravity, collision checks, enemy behavior, boss rules, camera bounds, level geometry, animation timing, health, and progression are executed by the original Unity WebGL runtime rather than a reimplementation.

Run `./scripts/verify-baseline.sh` to prove those paths still match the exact baseline commit.
