<div align="center">
  <a href="index.md">← Index</a> &nbsp;·&nbsp;
  <a href="../es/modules.md">🇪🇸 Ver en Español</a>
</div>

<br>

# JavaScript Modules

Scripts are loaded with `<script>` tags in a specific order. Global utilities must be declared before page modules that depend on them.

---

## Shared (loaded on every page)

| File | Responsibility |
|---|---|
| `assets/js/config.js` | Global configuration (`window.API_BASE`, etc.) |
| `assets/js/theme.js` | Dark/light theme handling |
| `assets/js/toast.js` | Toast notification system |
| `assets/js/auth.js` | Session guard (`requireAuth`), logout |
| `assets/js/api.js` | `fetch` wrapper — exposes `window.api.get/post/del`; errors include `.status` for programmatic handling |
| `assets/js/utils.js` | Shared helpers (`esc`, etc.) |
| `assets/js/providers.js` | Provider singleton — loads `/api/connections/providers` once and exposes `Providers.list/meta/fields/order/first` |

---

## Page modules

| Page | Files |
|---|---|
| Agents | `agents/agents-state.js`, `agents/agents-modal.js`, `agents/agents-skill-picker.js`, `agents/agents-export.js`, `agents/agents-catalog.js`, `agents/agents.js` |
| Connections | `connections/connections-state.js`, `connections/connections-modal.js`, `connections/connections.js` — providers loaded dynamically via `Providers` |
| Memory | `memory/memory-render.js`, `memory/memory-modal.js`, `memory/memory.js` |
| Skills | `skills/skills.js` |
| Profile | `profile/profile.js` |
| Admin | `admin/admin-users.js` |

---

## Load order in HTML

Shared scripts must appear before page-specific modules:

```html
<!-- Shared -->
<script src="/assets/js/config.js"></script>
<script src="/assets/js/theme.js"></script>
<script src="/assets/js/toast.js"></script>
<script src="/assets/js/api.js"></script>
<script src="/assets/js/auth.js"></script>
<script src="/assets/js/utils.js"></script>

<!-- Page module -->
<script src="/agents/agents-state.js"></script>
<script src="/agents/agents-modal.js"></script>
<script src="/agents/agents.js"></script>
```
