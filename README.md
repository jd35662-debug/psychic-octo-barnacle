# Liminal Maze Prototype

A small self-contained browser prototype focused on first-person exploration through an endless-feeling procedural maze. The project intentionally avoids combat, inventory, quests, and puzzle systems so the emphasis stays on navigation, atmosphere, and discovery.

## Run

Open `index.html` in a modern browser, or serve the folder with any static file server.

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Features

- First-person mouse-look movement with walking, sprinting, crouching, bobbing, and collision.
- Seeded procedural maze generation assembled from room and corridor cells.
- Multiple liminal themes: yellow office maze, industrial utility spaces, empty mall, office complex, and storage facility.
- Transition rooms such as elevators, stairwells, loading docks, utility spaces, dark hallways, and tunnels.
- Landmark and rare unusual rooms, including extremely large rooms, for environmental storytelling.
- Lightweight raycast renderer with low-resolution pixelated presentation, fog, light variation, and flickering lights.
- Simple pause/settings menu, optional seed input, fog control, mouse sensitivity, and minimap toggle.
- Procedural ambient hum and fluorescent buzz generated with the Web Audio API; no music.
