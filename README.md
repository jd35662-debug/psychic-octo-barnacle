# Photo Sorter

A simple desktop program to quickly review photos from an input folder.

## Features

- Scans an input directory for common photo file types.
- Displays one image at a time.
- `Keep` and `Delete` buttons to queue decisions.
- `Save Decisions` moves files into the folders you specify.
- `Skip` button to move to the next image without making a decision.

## Requirements

- Python 3.10+
- Pillow

Install dependency:

```bash
pip install pillow
```

## Run

```bash
python photo_sorter.py \
  --input-dir /path/to/photos \
  --keep-dir /path/to/kept \
  --delete-dir /path/to/deleted
```

Optional display size:

```bash
python photo_sorter.py \
  --input-dir /path/to/photos \
  --keep-dir /path/to/kept \
  --delete-dir /path/to/deleted \
  --max-width 1400 \
  --max-height 900
```

## Keyboard Shortcuts

- Right arrow: Keep
- Left arrow: Delete
- Down arrow: Skip
