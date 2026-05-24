# 3D Gallery Explorer

This project is configured to run with **Python 3.14.5**.

## Requirements
- Python **3.14.5** exactly
- A modern browser
- Internet access (Three.js is loaded from CDN)

## Run
```bash
python3.14 run_game.py
```

Then open:

- http://localhost:8000

If you run with a different Python version, the launcher exits with an explicit message.


## Windows error fix (the one in your screenshot)
If you double-click `main.js`, Windows may open **Windows Script Host** and show a JavaScript syntax error.
That happens because this file is browser module code, not a standalone Windows script.

Use one of these instead:

```bat
run_game.bat
```

or

```bat
py -3.14 run_game.py
```

Then open `http://localhost:8000` in your browser.

Important: open `index.html` in the browser via the local server URL, and do **not** run `main.js` directly.


## If you see "Directory listing for /"
That means the server started, but your browser is pointed at the folder root view instead of the game page.

Use this exact URL:

- http://localhost:8000/index.html

I also updated `run_game.py` to:
- always serve from the project folder containing `index.html`
- open `http://localhost:8000/index.html` automatically


## 404 error while running
If you see `Error code: 404 File not found`, make sure you are opening one of these URLs:

- `http://localhost:8000/`
- `http://localhost:8000/index.html`

The launcher now forces `/` to load `index.html` and serves files from the project folder directly.
