# Simple 3D "chamra" orbit helper

This repo includes a tiny Python program that:

- Defines a 3D model position.
- Places a second object called **chamra** on a sphere around the model.
- Keeps the chamra always facing the model.
- Prints the resulting angle output (yaw + pitch) for use in AI image prompts.

## Run

```bash
python3 camera_orbit_prompt.py --radius 6 --azimuth 130 --elevation 15
```

## Example output

- chamra position on sphere
- facing yaw and pitch angles
- one AI-friendly prompt line
