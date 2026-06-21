<div align="center">
  <a href="index.md">← Index</a> &nbsp;·&nbsp;
  <a href="../es/pages.md">🇪🇸 Ver en Español</a>
</div>

<br>

# Pages

The platform is organized into sections accessible from the main navigation.

---

| Section | Description |
|---|---|
| **Login** | Sign-in screen with email and password form. Accessible at `/login/`. Includes a guest access button and a link to the registration page. |
| **Register** | Two-step new account registration: step 1 (email + password) and step 2 (optional profile: birth date, gender, country, phone). Username is auto-generated from the email. Accessible at `/register/`. |
| **Chat** | Main interface. Opens a conversation with any configured agent. |
| **Agents** | Create, configure, and manage agents. Define their instructions, assign skills, and set up **Routines** — named tasks each with a trigger (manual, scheduled, or webhook) and a prompt that describes what the agent should do when run. Includes a **Catalog** button to browse and fork public agents, and a **Load** button to import agents from files exported by Claude, GitHub Copilot, OpenAI, or iAgentshub itself. |
| **Connections** | Add and manage connections to AI providers. For providers like Ollama, each installed model appears as a separate selectable entry for agents. Each card shows the total tokens consumed through that connection; hovering reveals the breakdown between input and output tokens. |
| **Memory** | View and edit each agent's persistent memory. Includes a **Load** button to import `.md` or `.json` files from disk — the filename becomes the memory file name. |
| **Knowledge** | Knowledge management for attaching context to agents. Organized in three tabs: **Skills** (browse available skills with a Load button to import a private JSON), **Webs** (save web pages whose text is extracted when added), and **Documents** (upload `.txt`, `.md`, or `.pdf` files with drag & drop support). Each item's content is injected in full into the agent's system prompt at chat start. Accessible at `/knowledge/`. Private resources (skills, webs, documents) can be shared with groups via the share button; shared resources display a **Shared** badge in indigo. |
| **Profile** | User settings: visual theme and password. Includes a **Providers** tab to manage base credentials for each AI provider (API keys, Ollama host, etc.) and a **Groups** tab to create collaboration teams, manage members, send invitations, and view resources shared with each team. Guests cannot create or join groups. |
| **Administration** | System control panel. Accessible to administrators only. Includes sections for **General** (statistics), **Users**, **Groups** (view, filter, and delete teams; inspect members and shared content for each group), **Agents**, **Connections**, **Knowledge**, and **Logs**. |
