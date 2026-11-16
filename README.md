# Monster Rally

A bouncy 3D monster truck sandbox for young kids. No score, no timer, no way to lose.
Runs in a browser on a computer or iPad, works offline, and has no server code.

## Play it on this computer

The game has to be served over `http://` (browsers block game files opened straight from disk).

- **Easiest:** double-click `start-game.bat`. It opens `http://localhost:8080` in your browser. Close the black window to stop.
- **Or by hand**, from this folder:

  ```
  python -m http.server 8080
  ```

  then open <http://localhost:8080>.

### Controls

| | Keyboard | iPad |
|---|---|---|
| Steer | Left / Right arrows or A / D | blue arrow buttons |
| Gas | Up arrow or W | green GO pedal |
| Brake / reverse | Down arrow or S | red pedal |
| Backflip | J | blue round button |
| Front flip | K | purple round button |
| Spin (donut on the ground) | L | orange round button |
| Cartwheel | I | pink round button |

## Put it online for free (GitHub Pages)

1. Sign in at <https://github.com> and create a new **public** repository, e.g. `monster-rally`.
2. On the repository page choose **Add file > Upload files**, drag in everything from this folder
   (`index.html`, `sw.js`, `manifest.webmanifest`, and the `css`, `js`, `vendor`, `icons` folders), then **Commit changes**.
3. Go to **Settings > Pages**. Under *Build and deployment* pick **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
4. After a minute the page shows your address: `https://YOUR-NAME.github.io/monster-rally/`.

Netlify works too: sign in at <https://app.netlify.com/drop> and drag this folder onto the page.

## Add it to the iPad home screen

1. Open your game address in **Safari** on the iPad (it must be Safari).
2. Tap the **Share** button (square with an arrow), then **Add to Home Screen**, then **Add**.
3. Launch it from the new icon. It opens full-screen. Play one round of each mode while online; after that it works offline.
4. Hold the iPad sideways. If there is no sound, check the iPad is not in silent mode and tap the speaker button in the game.

When you change the game later, bump `VERSION` in `sw.js` so iPads pick up the new files.

## Add a new truck

Open `js/trucks.config.js`, copy one of the three entries, and change:

- `id` and `name`
- `colors` (tyres, wheel hubs, frame)
- `stats` (`accel`, `maxSpeed`, `bounce`, `turn`, `grip`; the comments give safe ranges)
- `parts`: a list of simple shapes (`box`, `cyl`, `cone`, `sphere`, `torus`) with a size, position and colour.
  `mirror: true` copies a part to the other side; `glow: true` makes it light up.

Save and reload. The new truck shows up on the selection screen automatically.

## Where things live

| File | What it does |
|---|---|
| `js/main.js` | game loop, switching between the menu and play |
| `js/trucks.config.js` | the trucks |
| `js/truck.js` | truck model builder, driving, jumping, tricks |
| `js/world.js` | ground, ramps, crushable cars, stands |
| `js/modes/arena.js`, `js/modes/megaramp.js` | the two play modes (layouts are easy to edit) |
| `js/camera.js` | follow camera |
| `js/input.js` | keyboard and touch |
| `js/ui.js`, `css/style.css`, `index.html` | menus and buttons |
| `js/audio.js` | synthesised sounds |
| `js/particles.js` | mud, glass, confetti |
| `js/pyramid.js` | the giant smashable car pyramid on the Mega Ramp |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline + home screen app |
| `vendor/` | three.js (bundled, MIT licence) |
