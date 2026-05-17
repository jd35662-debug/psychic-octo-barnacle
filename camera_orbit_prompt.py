#!/usr/bin/env python3
"""
Simple 3D camera-on-sphere helper.

- A 3D model is represented by a target point in space.
- A second object (named "chamra" per request) is treated like a camera.
- The chamra is locked to a sphere centered on the model.
- The chamra always faces the model.
- The script outputs useful angles for AI image prompts.
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass


@dataclass
class Vec3:
    x: float
    y: float
    z: float

    def __sub__(self, other: "Vec3") -> "Vec3":
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)

    def length(self) -> float:
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)


def spherical_to_cartesian(radius: float, azimuth_deg: float, elevation_deg: float, center: Vec3) -> Vec3:
    """Convert spherical coordinates to cartesian position around center."""
    az = math.radians(azimuth_deg)
    el = math.radians(elevation_deg)

    x = center.x + radius * math.cos(el) * math.cos(az)
    y = center.y + radius * math.sin(el)
    z = center.z + radius * math.cos(el) * math.sin(az)
    return Vec3(x, y, z)


def look_at_angles(from_pos: Vec3, to_pos: Vec3) -> tuple[float, float, float]:
    """
    Return yaw, pitch, and distance needed for from_pos to face to_pos.

    yaw   : rotation around vertical axis (degrees)
    pitch : up/down angle (degrees)
    dist  : distance to target
    """
    d = to_pos - from_pos
    dist = d.length()
    yaw = math.degrees(math.atan2(d.z, d.x))
    horiz = math.sqrt(d.x**2 + d.z**2)
    pitch = math.degrees(math.atan2(d.y, horiz))
    return yaw, pitch, dist


def main() -> None:
    parser = argparse.ArgumentParser(description="Chamra on sphere looking at a 3D model")
    parser.add_argument("--model-x", type=float, default=0.0)
    parser.add_argument("--model-y", type=float, default=0.0)
    parser.add_argument("--model-z", type=float, default=0.0)
    parser.add_argument("--radius", type=float, default=5.0, help="Sphere radius for chamra")
    parser.add_argument("--azimuth", type=float, default=45.0, help="Horizontal orbit angle (deg)")
    parser.add_argument("--elevation", type=float, default=20.0, help="Vertical orbit angle (deg)")
    args = parser.parse_args()

    model = Vec3(args.model_x, args.model_y, args.model_z)

    # "chamra" (camera) position on the sphere around the model
    chamra = spherical_to_cartesian(args.radius, args.azimuth, args.elevation, model)

    # lock orientation so chamra always faces model
    yaw, pitch, distance = look_at_angles(chamra, model)

    print("3D model position:", model)
    print("Chamra position (locked to sphere):", chamra)
    print(f"Distance (sphere radius): {distance:.4f}")
    print(f"Facing angles -> yaw: {yaw:.2f}°, pitch: {pitch:.2f}°")

    prompt = (
        f"3d subject at ({model.x:.2f},{model.y:.2f},{model.z:.2f}), "
        f"camera/chamra on spherical rig radius {args.radius:.2f}, "
        f"azimuth {args.azimuth:.2f} deg, elevation {args.elevation:.2f} deg, "
        f"camera looking at subject, yaw {yaw:.2f} deg, pitch {pitch:.2f} deg"
    )
    print("\nAI prompt line:")
    print(prompt)


if __name__ == "__main__":
    main()
