# 3D camera orbit tool (WASD + Space)

This rebuild replaces the old script with a simple interactive 3D page.

## Features
- **3D object selector** (box, sphere, torus, cone, cylinder).
- **Settings panel** for orbit radius, azimuth, elevation, and WASD step size.
- Camera is locked to a sphere around the first object and always faces it.
- **WASD** rotates the camera around the object.
- **Space bar** triggers output generation.
- **Set angles to 0** button resets azimuth/elevation.

## Run
Use any static server, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Controls
- `W` / `S`: elevation rotation
- `A` / `D`: azimuth rotation
- `Space`: output current camera/orbit values

The output box includes object type, orbit values, and resulting yaw/pitch-friendly values for prompts.
