# Validation checklist

## Automated checks

```sh
./scripts/verify-baseline.sh
python3 scripts/verify_web_build.py
```

The first check compares every behavior-critical Unity and WebGL runtime file against the repository's root baseline commit. The second validates the compressed build payloads and every local asset referenced by the browser shell.

## Manual browser pass

- Load the page over HTTP (not directly from `file://`).
- Confirm the game reaches the opening room with three full hearts.
- Confirm WASD and arrow-key horizontal movement.
- Confirm both `L` and `Space` jump.
- Confirm the duck lands on the original floor and crate geometry.
- Continue through the original enemy and boss encounters.
- Confirm stomp bounce, damage, recovery blink, death, and respawn.
- Confirm the camera follows and clamps at the original bounds.
- Confirm the cake/victory progression is unchanged.
- Confirm the fullscreen button works and the 8:5 game image remains undistorted.
- Check the browser console for critical errors.

## Known baseline diagnostic

The 2017 build logs non-fatal Unity warnings about missing legacy Behaviour references on several robot GameObjects. Those warnings are present in the authoritative original build and are preserved to avoid changing the shipped scene or runtime. They do not prevent the game from loading or responding to controls.
