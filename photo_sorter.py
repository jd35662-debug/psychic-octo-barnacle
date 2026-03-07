#!/usr/bin/env python3
"""Simple photo sorting GUI.

Browse image files from an input directory and mark each one as keep or delete.
Press "Save Decisions" to move files into configured destination folders.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
import tkinter as tk
from tkinter import messagebox

try:
    from PIL import Image, ImageOps, ImageTk
except ImportError:  # pragma: no cover - runtime dependency check
    print("This program requires Pillow. Install it with: pip install pillow", file=sys.stderr)
    raise

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tif", ".tiff", ".webp"}


@dataclass
class Decision:
    source: Path
    action: str


class PhotoSorterApp:
    def __init__(self, root: tk.Tk, input_dir: Path, keep_dir: Path, delete_dir: Path, max_size: tuple[int, int]) -> None:
        self.root = root
        self.input_dir = input_dir
        self.keep_dir = keep_dir
        self.delete_dir = delete_dir
        self.max_size = max_size

        self.image_paths = sorted(
            p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        )
        self.index = 0
        self.decisions: list[Decision] = []
        self.current_image_tk: ImageTk.PhotoImage | None = None

        self.root.title("Photo Sorter")
        self.root.geometry("1000x700")

        self.status_var = tk.StringVar()
        self.progress_var = tk.StringVar()

        self.image_label = tk.Label(root, text="", bg="#222", fg="white")
        self.image_label.pack(fill="both", expand=True, padx=12, pady=12)

        controls = tk.Frame(root)
        controls.pack(fill="x", padx=12, pady=(0, 12))

        keep_btn = tk.Button(controls, text="Keep", command=self.mark_keep, width=18, bg="#4CAF50", fg="white")
        keep_btn.pack(side="left", padx=6)

        delete_btn = tk.Button(controls, text="Delete", command=self.mark_delete, width=18, bg="#D32F2F", fg="white")
        delete_btn.pack(side="left", padx=6)

        save_btn = tk.Button(controls, text="Save Decisions", command=self.save_decisions, width=18)
        save_btn.pack(side="left", padx=6)

        skip_btn = tk.Button(controls, text="Skip", command=self.next_image, width=18)
        skip_btn.pack(side="left", padx=6)

        tk.Label(root, textvariable=self.progress_var, anchor="w").pack(fill="x", padx=12)
        tk.Label(root, textvariable=self.status_var, anchor="w").pack(fill="x", padx=12, pady=(0, 12))

        self.root.bind("<Left>", lambda _evt: self.mark_delete())
        self.root.bind("<Right>", lambda _evt: self.mark_keep())
        self.root.bind("<Down>", lambda _evt: self.next_image())

        self.load_current_image()

    def load_current_image(self) -> None:
        if not self.image_paths:
            self.image_label.config(text="No photo files found in input directory.", image="")
            self.progress_var.set("0 / 0")
            self.status_var.set("")
            return

        if self.index >= len(self.image_paths):
            self.image_label.config(text="No more images. Click 'Save Decisions' to move selected files.", image="")
            self.progress_var.set(f"{len(self.image_paths)} / {len(self.image_paths)}")
            self.status_var.set(f"Queued: {len(self.decisions)}")
            return

        image_path = self.image_paths[self.index]
        try:
            image = Image.open(image_path)
            image = ImageOps.exif_transpose(image)
            image.thumbnail(self.max_size)
            self.current_image_tk = ImageTk.PhotoImage(image)
            self.image_label.config(image=self.current_image_tk, text="")
            self.progress_var.set(f"{self.index + 1} / {len(self.image_paths)}")
            self.status_var.set(f"Viewing: {image_path.name} | Queued: {len(self.decisions)}")
        except Exception as exc:
            self.image_label.config(text=f"Failed to open image: {image_path.name}\n{exc}", image="")
            self.progress_var.set(f"{self.index + 1} / {len(self.image_paths)}")

    def mark_keep(self) -> None:
        self.record_decision("keep")

    def mark_delete(self) -> None:
        self.record_decision("delete")

    def record_decision(self, action: str) -> None:
        if not self.image_paths or self.index >= len(self.image_paths):
            return
        self.decisions.append(Decision(source=self.image_paths[self.index], action=action))
        self.next_image()

    def next_image(self) -> None:
        if not self.image_paths:
            return
        self.index += 1
        self.load_current_image()

    def save_decisions(self) -> None:
        if not self.decisions:
            messagebox.showinfo("Photo Sorter", "No decisions to save.")
            return

        self.keep_dir.mkdir(parents=True, exist_ok=True)
        self.delete_dir.mkdir(parents=True, exist_ok=True)

        moved_count = 0
        failures: list[str] = []

        for decision in self.decisions:
            destination_dir = self.keep_dir if decision.action == "keep" else self.delete_dir
            destination = unique_destination(destination_dir / decision.source.name)
            try:
                shutil.move(str(decision.source), str(destination))
                moved_count += 1
            except Exception as exc:
                failures.append(f"{decision.source.name}: {exc}")

        self.decisions.clear()
        self.image_paths = sorted(
            p for p in self.input_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        )
        self.index = 0
        self.load_current_image()

        if failures:
            messagebox.showwarning(
                "Photo Sorter",
                f"Moved {moved_count} files, but {len(failures)} failed:\n" + "\n".join(failures[:10]),
            )
        else:
            messagebox.showinfo("Photo Sorter", f"Moved {moved_count} files.")


def unique_destination(path: Path) -> Path:
    if not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    counter = 1
    while True:
        candidate = parent / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Review photos with Keep/Delete buttons and move them on save.")
    parser.add_argument("--input-dir", type=Path, required=True, help="Directory containing photos to review.")
    parser.add_argument("--keep-dir", type=Path, required=True, help="Destination directory for kept photos.")
    parser.add_argument("--delete-dir", type=Path, required=True, help="Destination directory for deleted photos.")
    parser.add_argument("--max-width", type=int, default=1200, help="Maximum width for displayed images.")
    parser.add_argument("--max-height", type=int, default=700, help="Maximum height for displayed images.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.input_dir.exists() or not args.input_dir.is_dir():
        print(f"Input directory does not exist or is not a directory: {args.input_dir}", file=sys.stderr)
        raise SystemExit(1)

    root = tk.Tk()
    app = PhotoSorterApp(
        root=root,
        input_dir=args.input_dir,
        keep_dir=args.keep_dir,
        delete_dir=args.delete_dir,
        max_size=(args.max_width, args.max_height),
    )
    root.mainloop()


if __name__ == "__main__":
    main()
