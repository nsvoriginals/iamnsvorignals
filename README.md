# Sheshivardhan — portfolio

A static portfolio with a koi-pond home page, a horizontal project rail and long-form project write-ups.

## Run locally

```bash
npx serve .
# or
python -m http.server 8000
```

Every page is a folder with an `index.html`, so `/projects`, `/gallery` and `/blog` work on any static host. `vercel.json` enables clean URLs (`/projects/oasis` instead of `/projects/oasis/index.html`) and removes trailing slashes.

## Structure

```
index.html                  home — koi pond, intro, links
projects/index.html         project rail
projects/oasis/             OASIS — walkable virtual office
projects/cex/               CEX — Rust centralised exchange
projects/metatrader/        MetaTrader — live market terminal
gallery/index.html          artwork grid
blog/index.html             placeholder
assets/css/style.css        design system + light/dark themes
assets/js/main.js           theme, menu, typewriter, page transitions
assets/js/pond.js           koi-pond engine (canvas)
assets/img/<project>/       project screenshots (drop-in)
assets/favicon_io/          favicons + web app manifest
favicon.ico                 root fallback for /favicon.ico
```

## Projects

| Project | Links | Stack |
| --- | --- | --- |
| OASIS | [live](https://oasisclient.vercel.app) · [code](https://github.com/nsvoriginals/oasisclient) | React 18, Phaser 3, TypeScript, Colyseus, PeerJS/WebRTC |
| CEX | [code](https://github.com/nsvoriginals/cex) | Rust, Tokio, Axum, SQLx/Postgres, WebSockets |
| MetaTrader | [live](https://metatrader-client-mniw.vercel.app) · [code](https://github.com/nsvoriginals/metatrader-client) | React 19, Vite, Tailwind, TanStack Query, lightweight-charts |

## Adding screenshots

The project pages already point at the final paths. Drop a file in and it replaces the generated placeholder:

```
assets/img/oasis/hero.png        assets/img/oasis/thumb.png
assets/img/oasis/floor.png       assets/img/oasis/rooms.png       assets/img/oasis/chat.png
assets/img/cex/hero.png          assets/img/cex/thumb.png
assets/img/cex/terminal.png      assets/img/cex/orderbook.png     assets/img/cex/auth.png
assets/img/metatrader/hero.png   assets/img/metatrader/thumb.png
assets/img/metatrader/live.png   assets/img/metatrader/performers.png   assets/img/metatrader/profile.png
```

Each folder has a `README.md` with the recommended capture for every slot. Thumbnails are 3:2, heroes and detail shots are 16:9; export at 2× for high-density screens. Until the real files land, lightweight gradient placeholders fill each slot so nothing 404s.

## Theme

The light/dark toggle is in the desktop nav and the mobile menu, persists in `localStorage`, follows the user across client-side navigation, and also swaps the favicon-adjacent `theme-color` meta tag. The theme is defined on `:root[data-theme="light"]` so it cannot be overridden by stylesheet order, and project pages get a theme-aware nav scrim over their dark heroes.

## Notes

- Artwork in `gallery/` is placeholder art until real pieces are added.
- `README.md` in `assets/img/*` lists the exact screenshot names the pages expect.
- Social links point at the real profiles: GitHub, LinkedIn, X and Instagram.
