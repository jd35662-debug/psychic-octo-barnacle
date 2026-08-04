# Local Home Net

A simple local-network home intranet starter. Run it on one home server or computer, then open it from multiple computers, tablets, or phones on the same Wi-Fi/LAN.

- A home server dashboard for household services and status.
- A YouTube-style `LocalTube` area for videos and tutorials.
- A Twitter-style `Chirp` feed for blurbs, text, GIF links, image links, and announcements.
- Household shortcut cards that act like local intranet sites for files, media, chores, shopping, manuals, emergency contacts, and calendar.

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

## Checks

```bash
npm run check
```
