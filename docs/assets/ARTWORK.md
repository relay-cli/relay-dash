# Relay Dash artwork

The repository banner and social preview are drawn from [`artwork.html`](./artwork.html), an SVG composition that uses the official Relay mark and the shared Relay palette.

## Banner

`banner.png` uses a 3:1 composition. The left side contains the Relay mark, product name, and a direct description. The right side depicts the real application structure: the services table with ready state, queue depth, and models, and the pack-sentinel panel with active incidents by severity.

## Social preview

`.github/social-preview.png` recomposes the same interface for a 2:1 thumbnail. The description is removed and the panel labels stay large enough to read in repository cards.

Both use monospace interface typography, restrained terminal borders, and only the data the dashboard really shows. There is no decorative-code, robot, or chart imagery.

## Rendering

Open `artwork.html` in a Chromium browser, or render both images headlessly from the repository root:

```sh
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=2172,724 --screenshot=docs/assets/banner.png docs/assets/artwork.html
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1774,887 --screenshot=.github/social-preview.png "docs/assets/artwork.html?social"
```

The banner is 2172×724 and the social preview is 1774×887, matching the other Relay repositories. Upload the social preview in the repository settings under Social preview.
