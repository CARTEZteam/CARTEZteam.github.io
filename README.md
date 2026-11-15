## Getting started (run locally)

This is a static website: plain HTML, CSS and vanilla JavaScript.
**There is no build step and nothing to install for the site itself.**

### 1. Requirements

| What | Why | Notes |
|---|---|---|
| A modern browser (Chrome / Edge recommended) | runs the site | the 3D globe needs WebGL2 |
| Python 3 (any 3.x) | a tiny local web server | already included in macOS / Linux; on Windows: https://www.python.org/downloads/ |
| Internet connection | Leaflet map library (unpkg CDN), NASA Trek map tiles, NASA Image and Video Library API | without internet the site still opens, but the 2D maps and NASA photos will not load (the app falls back to the 3D globe) |

> Do **not** open `index.html` by double-clicking it (`file://`). Browsers block some features on `file://`. Always use a local server as shown below.

### 2. Get the code

```bash
git clone https://github.com/CARTEZteam/CARTEZteam.github.io.git
cd CARTEZteam.github.io
```

Or click **Code → Download ZIP** on GitHub, unzip it and open a terminal in the unzipped folder (the folder that contains `index.html`).

### 3. Start the local server

macOS / Linux:

```bash
python3 -m http.server 8000
```

Windows (Command Prompt or PowerShell):

```bat
py -m http.server 8000
```

(If `py` is not found, try `python -m http.server 8000`.)

### 4. Open the site

Open **http://localhost:8000/** in your browser.

To stop the server press **Ctrl + C** in the terminal.

### 5. Online version (no installation)

The same site is published with GitHub Pages: https://cartezteam.github.io/

### Troubleshooting

| Problem | Fix |
|---|---|
| `python` / `py` is not recognized | install Python 3 and tick "Add Python to PATH" in the installer |
| Port 8000 is busy | use another port, e.g. `python3 -m http.server 8080`, then open `http://localhost:8080/` |
| Map is empty, only the globe is shown | check the internet connection (the map library and tiles load from the internet) |
| An old version of the page is shown | press **Ctrl + Shift + R** (hard reload) — the site caches files with a service worker |
