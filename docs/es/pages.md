<div align="center">
  <a href="index.md">← Índice</a> &nbsp;·&nbsp;
  <a href="../en/pages.md">🇬🇧 Read in English</a>
</div>

<br>

# Páginas

La plataforma está organizada en secciones accesibles desde la navegación principal.

---

| Sección | Descripción |
|---|---|
| **Login** | Pantalla de inicio de sesión con formulario de email y contraseña. Accesible en `/login/`. Incluye botón de acceso como invitado y enlace a la página de registro. |
| **Registro** | Registro de nuevas cuentas en dos pasos: paso 1 (email + contraseña) y paso 2 (perfil opcional: fecha de nacimiento, género, país, teléfono). El nombre de usuario se genera automáticamente a partir del email. Accesible en `/register/`. |
| **Dashboard** | Vista general personalizable de la plataforma. Los paneles disponibles son: **Resumen** (contadores de agentes, conexiones, skills, memoria y conocimiento), **Uso de tokens** (por conexión o por agente, en barras o donut), **Actividad** (histograma de tokens diarios), **Estado de conexiones** (online/error/latencia por conexión) y **Agentes recientes**. El botón **Personalizar** activa el modo edición: los paneles se pueden reordenar arrastrando, añadir desde el panel lateral y eliminar con el botón ×. Cada panel tiene un icono de engranaje que voltea la card para mostrar sus opciones de configuración. El layout y la configuración de cada panel se persisten por usuario. Accesible en `/dashboard/`. |
| **Chat** | Interfaz principal. Abre una conversación con cualquier agente configurado. |
| **Agentes** | Crear, configurar y gestionar agentes. Definir sus instrucciones, asignarles skills y configurar **Rutinas** — tareas con nombre, un disparador (manual, programada o webhook) y un prompt que describe qué debe hacer el agente al ejecutarse. Incluye un botón **Catálogo** para explorar y fork agentes públicos, y un botón **Cargar** para importar agentes desde ficheros exportados por Claude, GitHub Copilot, OpenAI o el propio iAgentshub. |
| **Conexiones** | Añadir y gestionar las conexiones con proveedores de IA. Para proveedores como Ollama, cada modelo instalado aparece como una entrada independiente seleccionable en los agentes. Cada tarjeta muestra el total de tokens consumidos a través de esa conexión; al pasar el cursor aparece el desglose entre tokens de entrada y de salida. |
| **Memoria** | Consultar y editar la memoria persistente de cada agente. Incluye un botón **Cargar** para importar ficheros `.md` o `.json` desde disco — el nombre del fichero se convierte en el nombre del fichero de memoria. |
| **Conocimiento** | Gestión del conocimiento adjuntable a agentes. Organizado en tres pestañas: **Skills** (explorar skills disponibles con botón Cargar para importar JSON privado), **Webs** (guardar páginas web cuyo texto se extrae al añadirlas) y **Documentos** (subir ficheros `.txt`, `.md` o `.pdf` con soporte drag & drop). El contenido de cada item se inyecta completo en el system prompt del agente al iniciar un chat. La URL de acceso es `/knowledge/`. Los recursos privados (skills, webs, documentos) pueden compartirse con grupos mediante el botón de compartir; los recursos compartidos muestran el badge **Compartida** en índigo. |
| **Perfil** | Ajustes del usuario: tema visual y contraseña. Incluye la pestaña **Proveedores** para gestionar las credenciales base de cada proveedor de IA (claves de API, host de Ollama, etc.) y la pestaña **Grupos** (dentro del modal de workspace) para crear grupos de colaboración y gestionar sus miembros. Los recursos privados se comparten con grupos desde cada sección. Los invitados no pueden crear ni unirse a grupos. |
| **Administración** | Panel de control del sistema. Solo accesible para administradores. Incluye las secciones **General** (estadísticas), **Usuarios**, **Grupos** (ver y eliminar grupos; consultar miembros y contenido compartido), **Agentes**, **Conexiones**, **Conocimiento** y **Logs**. |
