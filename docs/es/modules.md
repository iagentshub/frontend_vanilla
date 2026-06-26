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
| `assets/js/share-teams.js` | Modal de compartición de recursos con grupos — avatares de letra con color determinista; se invoca con `shareTeams.open(type, id, name)` |

---

## Módulos de página

| Página | Ficheros |
|---|---|
| Login | `pages/login/login.js` — envía credenciales a `POST /api/auth/login`, gestiona errores, toggle de contraseña, acceso invitado y redirección si ya hay sesión activa |
| Registro | `pages/register/register.js` — formulario en dos pasos; paso 1 valida email/contraseña, paso 2 envía perfil opcional a `POST /api/auth/register` |
| Dashboard | `dashboard/dashboard.js` (orquestador: layout, modo edición, drag-and-drop, flip de config, persistencia) + un módulo por widget en `dashboard/widgets/{id}/widget.js`: `summary`, `token-usage`, `activity`, `conn-status`, `recent`. Los widgets se registran en `window._WIDGET_REGISTRY` y se cargan con `<script>` antes que el orquestador. |
| Agentes | `agents/agents-state.js`, `agents/agents-modal.js`, `agents/agents-skill-picker.js`, `agents/agents-export.js`, `agents/agents-load.js`, `agents/agents-routines.js`, `agents/agents-catalog.js`, `agents/agents.js` |
| Conexiones | `connections/connections-state.js`, `connections/connections-modal.js`, `connections/connections.js` — providers cargados dinámicamente vía `Providers` |
| Memoria | `memory/memory-render.js`, `memory/memory-modal.js`, `memory/memory-load.js`, `memory/memory.js` |
| Conocimiento | `knowledge/skills-load.js`, `knowledge/knowledge.js`, `knowledge/knowledge-urls.js`, `knowledge/knowledge-docs.js` |
| Perfil | `profile/profile.js`, `profile/profile-workspaces.js` (gestión de grupos dentro del modal de workspace), `profile/profile-accounts.js` |
| Admin | `admin/admin-stats.js`, `admin/admin-users.js`, `admin/admin-teams.js`, `admin/admin-agents.js`, `admin/admin-connections.js`, `admin/admin-knowledge.js`, `admin/admin-logs.js`, `admin/admin-workspaces.js` |

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
