# Local Home Net

A simple local-network home intranet starter. Run it on one home server or computer, then open it from multiple computers, tablets, or phones on the same Wi-Fi/LAN.

- A home server dashboard for household services and status.
- A YouTube-style `LocalTube` area for videos and tutorials.
- A Twitter-style `Chirp` feed for blurbs, text, GIF links, image links, and announcements.
- Household shortcut cards that act like local intranet sites for files, media, chores, shopping, manuals, emergency contacts, and calendar.
- Several skins/themes, including dark mode, light mode, forest, ocean, and candy.
- A LocalTube ad module that loads server-operator media from the `add/` folder.
- A server-operator-only settings site at `/settings` that is restricted to the server computer.
- Server-side accounts, passwords, posts, custom site links, and shared settings stored in `data/db.json`.

## Run on your local internet / LAN

```bash
npm start
```

Open <http://127.0.0.1:8080> on the server computer. To use it from other computers on the same home network, find the server computer's LAN IP address, then open `http://LAN-IP:8080` from those devices, for example `http://192.168.1.25:8080`.

The server binds to `0.0.0.0` by default so multiple computers on your local network can reach it. It does not require internet access. Keep it behind your home router/firewall and do not port-forward it to the public internet.

If you only want same-computer access, run:

```bash
HOST=127.0.0.1 npm start
```

## Server operator settings

Open <http://127.0.0.1:8080/settings> on the server computer for operator-only settings. The server returns 403 for LAN clients that try to open this settings site from another device.

## Accounts and server data

Use the login panel on the home page. The first registered account becomes the server operator. Posts, custom site links, and shared settings are saved centrally in `data/db.json` on the server. Passwords are stored as salted PBKDF2 hashes, not plain text.

## LocalTube ads

Put `.gif`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.mp4`, `.webm`, or `.txt` files in the `add/` folder. The LocalTube ad module lists that folder through the local server and displays one item at random. Press **Run ad** in LocalTube to pause the current video, save its timestamp, play an ad, and resume the video afterward.

## Checks

```bash
npm run check
```
