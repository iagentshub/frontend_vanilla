<div align="center">
  <a href="index.md">← Índice</a> &nbsp;·&nbsp;
  <a href="../en/modules.md">🇬🇧 Read in English</a>
</div>

<br>

# Módulos JavaScript

Los scripts se cargan con etiquetas `<script>` en un orden específico. Las utilidades globales deben declararse antes que los módulos de página que las usan.

---

## Compartidos (cargados en todas las páginas)

| Fichero | Responsabilidad |
|---|---|
| `assets/js/config.js` | Configuración global (`window.API_BASE`, etc.) |
| `assets/js/theme.js` | Gestión del tema oscuro/claro |
| `assets/js/toast.js` | Sistema de notificaciones toast |
| `assets/js/auth.js` | Guard de sesión (`requireAuth`), cierre de sesión |
| `assets/js/api.js` | Wrapper de `fetch` — expone `window.api.get/post/del`; los errores incluyen `.status` para gestión programática |
| `assets/js/utils.js` | Helpers compartidos (`esc`, etc.) |
| `assets/js/providers.js` | Singleton de providers — carga `/api/connections/providers` una vez y expone `Providers.list/meta/fields/order/first` |

---

## Módulos de página

| Página | Ficheros |
|---|---|
| Agentes | `agents/agents-state.js`, `agents/agents-modal.js`, `agents/agents-skill-picker.js`, `agents/agents-export.js`, `agents/agents-catalog.js`, `agents/agents.js` |
| Conexiones | `connections/connections-state.js`, `connections/connections-modal.js`, `connections/connections.js` — providers cargados dinámicamente vía `Providers` |
| Memoria | `memory/memory-render.js`, `memory/memory-modal.js`, `memory/memory.js` |
| Skills | `skills/skills.js` |
| Perfil | `profile/profile.js` |
| Admin | `admin/admin-users.js` |

---

## Orden de carga en HTML

Los scripts compartidos deben aparecer antes que los módulos de página:

```html
<!-- Compartidos -->
<script src="/assets/js/config.js"></script>
<script src="/assets/js/theme.js"></script>
<script src="/assets/js/toast.js"></script>
<script src="/assets/js/api.js"></script>
<script src="/assets/js/auth.js"></script>
<script src="/assets/js/utils.js"></script>

<!-- Módulo de página -->
<script src="/agents/agents-state.js"></script>
<script src="/agents/agents-modal.js"></script>
<script src="/agents/agents.js"></script>
```
