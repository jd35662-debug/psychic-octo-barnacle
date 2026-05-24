#!/usr/bin/env python3
"""Run the 3D gallery static server with Python 3.14.5."""

from __future__ import annotations

import http.server
import pathlib
import socketserver
import sys

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


def main() -> None:
    ensure_python_3145()
    root = pathlib.Path(__file__).resolve().parent
    handler = http.server.SimpleHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"3D Gallery running at http://localhost:{PORT}")
        print(f"Serving files from: {root}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
