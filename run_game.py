#!/usr/bin/env python3
"""Run the 3D gallery static server with Python 3.14.5."""

from __future__ import annotations

import functools
import http.server
import pathlib
import socketserver
import sys
import webbrowser

REQUIRED_VERSION = (3, 14, 5)
PORT = 8000


def ensure_python_3145() -> None:
    if sys.version_info[:3] != REQUIRED_VERSION:
        found = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        required = ".".join(map(str, REQUIRED_VERSION))
        raise SystemExit(
            f"This launcher requires Python {required}. You are running Python {found}.\n"
            f"Install/use Python {required} and run: python3.14 run_game.py"
        )


class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path in ("/", ""):
            self.path = "/index.html"
        return super().do_GET()


def main() -> None:
    ensure_python_3145()
    root = pathlib.Path(__file__).resolve().parent

    # Bind handler directly to project directory so requests always resolve
    # relative to this repo, regardless of calling shell location.
    handler = functools.partial(GameRequestHandler, directory=str(root))
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        app_url = f"http://localhost:{PORT}/index.html"
        print(f"3D Gallery running at {app_url}")
        print(f"Serving files from: {root}")
        print("Press Ctrl+C to stop.")
        try:
            webbrowser.open(app_url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
