#!/usr/bin/env python3
"""Simple 3D camera orbit helper for AI image prompts."""

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
    az = math.radians(azimuth_deg)
    el = math.radians(elevation_deg)
    return Vec3(
        center.x + radius * math.cos(el) * math.cos(az),
        center.y + radius * math.sin(el),
        center.z + radius * math.cos(el) * math.sin(az),
    )


def look_at_angles(from_pos: Vec3, to_pos: Vec3) -> tuple[float, float, float]:
    d = to_pos - from_pos
    dist = d.length()
    yaw = math.degrees(math.atan2(d.z, d.x))
    horizontal = math.sqrt(d.x**2 + d.z**2)
    pitch = math.degrees(math.atan2(d.y, horizontal))
    return yaw, pitch, dist


def main() -> None:
    parser = argparse.ArgumentParser(description="Camera locked to a sphere around a 3D object")
    parser.add_argument("--target-x", type=float, default=0.0)
    parser.add_argument("--target-y", type=float, default=0.0)
    parser.add_argument("--target-z", type=float, default=0.0)
    parser.add_argument("--radius", type=float, default=5.0, help="Camera orbit radius")
    parser.add_argument("--azimuth", type=float, default=45.0, help="Current horizontal angle (deg)")
    parser.add_argument("--elevation", type=float, default=20.0, help="Current vertical angle (deg)")
    parser.add_argument("--rotate-azimuth", type=float, default=0.0, help="Additive horizontal rotation control (deg)")
    parser.add_argument("--rotate-elevation", type=float, default=0.0, help="Additive vertical rotation control (deg)")
    parser.add_argument("--set-to-zero", action="store_true", help="Reset azimuth/elevation to 0 before rotating")
    args = parser.parse_args()

    target = Vec3(args.target_x, args.target_y, args.target_z)

    base_azimuth = 0.0 if args.set_to_zero else args.azimuth
    base_elevation = 0.0 if args.set_to_zero else args.elevation

    final_azimuth = base_azimuth + args.rotate_azimuth
    final_elevation = max(-89.0, min(89.0, base_elevation + args.rotate_elevation))

    camera = spherical_to_cartesian(args.radius, final_azimuth, final_elevation, target)
    yaw, pitch, distance = look_at_angles(camera, target)

    print("Target 3D object:", target)
    print("Camera position (locked to sphere):", camera)
    print(f"Orbit distance: {distance:.4f}")
    print(f"Control angles -> azimuth: {final_azimuth:.2f}°, elevation: {final_elevation:.2f}°")
    print(f"Facing angles  -> yaw: {yaw:.2f}°, pitch: {pitch:.2f}°")

    print("\nAI prompt line:")
    print(
        f"3d subject at ({target.x:.2f},{target.y:.2f},{target.z:.2f}), "
        f"camera on sphere radius {args.radius:.2f}, "
        f"orbit azimuth {final_azimuth:.2f} deg, orbit elevation {final_elevation:.2f} deg, "
        f"camera looking at subject, yaw {yaw:.2f} deg, pitch {pitch:.2f} deg"
    )


if __name__ == "__main__":
    main()
