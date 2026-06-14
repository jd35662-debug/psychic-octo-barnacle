# PROJECT THRESHOLD

A self-contained first-person exploration horror prototype inspired by SCP-style anomalous architecture.

You play as D-9341, a disposable D-Class ordered into SCP-7912 ("Threshold House") to recover samples, photograph anomalies, and return before the Foundation's 30-minute tracking lock fails.

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Gameplay

- Start in the containment chamber facing a suburban door fragment.
- Move deeper through procedurally generated rooms with the movement buttons or W/A/S/D.
- Collect requested recovery-list items.
- Photograph room anomalies to improve the report and stabilize sanity.
- Return to ROOM-001 with all requested samples before the timer expires.

## Systems Implemented

- 30-minute mission timer with post-expiration instability.
- Procedural room generation with classifications, stability, threat levels, anomalies, and recoverable items.
- Randomized recovery list for each mission.
- Sanity-driven corruption of room labels and radio messages.
- Foundation command radio prompts.
- Auto-generated field report log.
- Success and failure debrief screens.
