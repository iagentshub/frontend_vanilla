<div align="center">
  <a href="index.md">← Index</a> &nbsp;·&nbsp;
  <a href="../es/architecture.md">🇪🇸 Ver en Español</a>
</div>

<br>

# Frontend Architecture

---

## Overview

The frontend is a collection of static web pages served by a web server. There is no build step and no dependencies to install — the code loads directly in the browser as written.

Each page of the platform is independent and communicates with the backend through the same web address, transparently to the user.

---

## How it communicates with the backend

The web server acts as an intermediary: it serves the interface and forwards requests to the backend transparently. From the browser's perspective, everything happens at the same address, which simplifies security and eliminates the need for additional configuration.

Agent responses are streamed in real time as the AI model generates them.

---

## Design decisions

**No build dependencies** — the code does not need to be compiled. This removes a layer of complexity and makes the project easier to maintain and debug.

**Independent pages** — each section of the interface is a self-contained HTML file. Common utilities are shared across pages.

**No frameworks** — the interface is built with standard web technologies, without third-party runtime dependencies.

---

## Responsive design

The interface adapts automatically to any screen size. The primary breakpoint is `768px`.

**Mobile navigation** — on small screens the side menu is hidden and can be opened with a floating hamburger button. The `main_nav.js` component injects the button and close overlay directly into the document; no changes to each page's HTML are required.

**Bottom-sheet modals** — on mobile, dialogs slide up from the bottom of the screen, following the standard mobile application pattern.

**Compact layout** — content padding and grids adjust automatically to make the best use of space on narrow screens.
