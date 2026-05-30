<div align="center">
  <a href="index.md">← Índice</a> &nbsp;·&nbsp;
  <a href="../en/architecture.md">🇬🇧 Read in English</a>
</div>

<br>

# Arquitectura del frontend

---

## Visión general

El frontend es una colección de páginas web estáticas servidas por un servidor web. No hay paso de compilación ni dependencias que instalar — el código se carga directamente en el navegador tal cual está escrito.

Cada página de la plataforma es independiente y se comunica con el backend a través de la misma dirección web, de forma transparente para el usuario.

---

## Cómo se comunica con el backend

El servidor web actúa como intermediario: sirve la interfaz y redirige las peticiones al backend de forma transparente. Desde el punto de vista del navegador, todo ocurre en la misma dirección, lo que simplifica la seguridad y elimina la necesidad de configuración adicional.

Las respuestas de los agentes se transmiten en tiempo real a medida que el modelo de IA las genera.

---

## Decisiones de diseño

**Sin dependencias de build** — el código no necesita compilarse. Esto elimina una capa de complejidad y hace que el proyecto sea más fácil de mantener y depurar.

**Páginas independientes** — cada sección de la interfaz es un fichero HTML autocontenido. Las utilidades comunes se comparten entre páginas.

**Sin frameworks** — la interfaz está construida con tecnologías web estándar, sin dependencias de terceros en tiempo de ejecución.

---

## Diseño responsive

La interfaz se adapta automáticamente a cualquier tamaño de pantalla. El breakpoint principal es `768px`.

**Navegación en móvil** — en pantallas pequeñas el menú lateral se oculta y se puede abrir mediante un botón flotante (hamburger). El componente `main_nav.js` inyecta el botón y el overlay de cierre directamente en el documento; no es necesario modificar el HTML de cada página.

**Modales como bottom-sheet** — en móvil los diálogos se abren desde la parte inferior de la pantalla, siguiendo el patrón estándar de aplicaciones móviles.

**Layout compacto** — el padding y los grids de contenido se ajustan automáticamente para aprovechar el espacio en pantallas estrechas.
