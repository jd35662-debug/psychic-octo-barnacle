# Simple 3D camera orbit helper

This Python script gives simple controls to rotate a camera around a first 3D object.

## What it does

- Places a **camera** on a sphere around a target object.
- Keeps the camera always facing the target.
- Prints the final orbit angles and look-at angles.
- Includes a `--set-to-zero` option to reset azimuth/elevation before applying rotation controls.

## Run

```bash
python3 camera_orbit_prompt.py \
  --radius 6 \
  --azimuth 45 \
  --elevation 20 \
  --rotate-azimuth 30 \
  --rotate-elevation -5
```

## Reset angles to zero first

```bash
python3 camera_orbit_prompt.py --set-to-zero --rotate-azimuth 90 --rotate-elevation 10
```
