// agents-scan.js — escanea un directorio y vincula agentes con sus skills
'use strict';

var AgentScanner = (function () {

    // ─── Clasificador de rutas ─────────────────────────────────────────────────

    function _classify(path) {
        var p = path.replace(/\\/g, '/');
        if (/(?:^|\/)\.claude\/agents\/[^/]+\.md$/i.test(p)) return 'agent_claude';
        if (/(?:^|\/)\.claude\/agents\/[^/]+\.json$/i.test(p)) return 'agent_json';
        if (/(?:^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/i.test(p)) return 'skill';
        if (/(?:^|\/)\.github\/[^/]+\.agent\.md$/i.test(p)) return 'agent_github';
        if (/(?:^|\/)\.github\/copilot-instructions\.md$/i.test(p)) return 'agent_github';
        return null;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _readFile(file) {
        return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function (e) { resolve(e.target.result); };
            r.onerror = function () { reject(new Error('Read failed')); };
            r.readAsText(file);
        });
    }

    async function _collectFromEntry(entry) {
        var items = [];
        if (entry.isFile) {
            var file = await new Promise(function (res) { entry.file(res); });
            items.push({ file: file, path: entry.fullPath });
        } else if (entry.isDirectory) {
            var reader = entry.createReader();
            var batch;
            do {
                batch = await new Promise(function (res) { reader.readEntries(res); });
                for (var i = 0; i < batch.length; i++) {
                    var sub = await _collectFromEntry(batch[i]);
                    items = items.concat(sub);
                }
            } while (batch.length === 100);
        }
        return items;
    }

    function _agentExists(name) {
        if (!name || typeof _agents === 'undefined') return false;
        var lc = name.toLowerCase();
        return _agents.some(function (a) { return (a.name || '').toLowerCase() === lc; });
    }

    function _skillExists(name) {
        if (!name || typeof _skills === 'undefined') return false;
        var lc = name.toLowerCase();
        return _skills.some(function (s) { return (s.name || '').toLowerCase() === lc; });
    }

    // ─── Vinculación inteligente agent→skills ─────────────────────────────────

    // Determina qué skills globales (sin id) deben vincularse a un agente concreto.
    // Estrategias en orden de prioridad:
    //  1. Referencias de ruta en el cuerpo: `.claude/skills/{slug}`
    //  2. Campo `skills:` en el frontmatter del agente (nombres o slugs, separados por coma)
    //  3. Nombre/descripción del agente contiene el slug o nombre de la skill
    //  4. Fallback: todas las skills globales
    function _matchGlobalSkills(globalSkills, rawText, parsed) {
        var refs = [];

        // 1. Rutas explícitas en el cuerpo
        var pathRe = /\.claude\/skills\/([^\s\/'"`,\)]+)/g;
        var pm;
        while ((pm = pathRe.exec(rawText)) !== null) {
            refs.push(pm[1].toLowerCase());
        }

        // 2. Campo skills: en el frontmatter ("backend, i18n" o "[backend, i18n]")
        var skillsMeta = (parsed._skillsMeta || '').replace(/[\[\]]/g, '');
        skillsMeta.split(',').forEach(function (s) {
            var t = s.trim().toLowerCase();
            if (t) refs.push(t);
        });

        // Resolver referencias contra las skills disponibles
        if (refs.length > 0) {
            var matched = globalSkills.filter(function (s) {
                var slug = (s._fallback || '').toLowerCase();
                var name = (s.meta.name || '').toLowerCase();
                return refs.some(function (r) {
                    return r === slug || r === name || name.includes(r) || slug.includes(r);
                });
            });
            if (matched.length > 0) return matched;
        }

        // 3. El nombre o descripción del agente contiene el slug o el nombre de la skill
        var agentCtx = ((parsed.name || '') + ' ' + (parsed.description || '')).toLowerCase();
        var nameMatched = globalSkills.filter(function (s) {
            var slug = (s._fallback || '').toLowerCase();
            var name = (s.meta.name || '').toLowerCase();
            return agentCtx.includes(slug) || agentCtx.includes(name)
                || name.includes(agentCtx.trim());
        });
        if (nameMatched.length > 0) return nameMatched;

        // 4. Fallback: todas las skills globales
        return globalSkills;
    }

    // ─── Escaneo con vinculación agent→skills ─────────────────────────────────

    async function _scanAndLink(rawItems) {
        var agentRaw = [], skillRaw = [];
        rawItems.forEach(function (item) {
            var type = _classify(item.path);
            if (!type) return;
            if (type === 'skill') skillRaw.push(item);
            else agentRaw.push({ file: item.file, path: item.path, agentType: type });
        });

        // Leer skills.
        // - Skills con `id` en el frontmatter (formato legado): se vinculan solo a agentes
        //   que las referencian por ese ID.
        // - Skills sin `id` (formato Claude Code SKILL.md): son globales del proyecto y
        //   se vinculan a todos los agentes del directorio.
        var skillById = {};  // id → rec (legado)
        var globalSkills = [];  // sin id → vinculadas a todos
        var allSkills = [];

        await Promise.all(skillRaw.map(async function (item) {
            try {
                var text = await _readFile(item.file);
                var parsed = _parseFrontmatter(text);
                var fb = item.path.replace(/\\/g, '/').split('/').slice(-2, -1)[0]
                    || item.file.name.replace(/\.md$/i, '');
                var rec = { file: item.file, path: item.path, meta: parsed.meta, body: parsed.body, _fallback: fb };
                allSkills.push(rec);
                if (parsed.meta.id) skillById[parsed.meta.id] = rec;
                else globalSkills.push(rec);
            } catch (err) { console.error('[agents-scan] Error leyendo skill:', err); }
        }));

        // Leer agentes y vincular skills.
        var agents = await Promise.all(agentRaw.map(async function (item) {
            try {
                var text = await _readFile(item.file);
                var parsed = _parseAndLoadAgent(item.file.name, text);
                // Extraer campo skills: del frontmatter como texto crudo para la estrategia 2.
                var fmSkills = text.match(/^skills\s*:\s*(.+)/m);
                parsed._skillsMeta = fmSkills ? fmSkills[1] : '';
                var skillIds = Array.isArray(parsed.skills) ? parsed.skills : [];
                // Skills legadas referenciadas por ID + skills globales vinculadas por relevancia.
                var linked = skillIds.map(function (id) { return skillById[id]; }).filter(Boolean);
                _matchGlobalSkills(globalSkills, text, parsed).forEach(function (s) {
                    if (!linked.includes(s)) linked.push(s);
                });
                return {
                    file: item.file, path: item.path, agentType: item.agentType,
                    text: text, parsed: parsed,
                    linkedSkills: linked, skillIds: skillIds,
                    exists: _agentExists(parsed.name),
                };
            } catch (_) {
                return {
                    file: item.file, path: item.path, agentType: item.agentType,
                    text: '', parsed: null, linkedSkills: [], skillIds: [], exists: false,
                };
            }
        }));

        // Huérfanas: solo skills legadas no referenciadas por ningún agente.
        // Las globales nunca son huérfanas (ya están vinculadas a todos).
        var usedIds = {};
        agents.forEach(function (a) { a.skillIds.forEach(function (id) { usedIds[id] = true; }); });
        var orphanSkills = allSkills.filter(function (s) { return s.meta.id && !usedIds[s.meta.id]; });

        return { agents: agents, orphanSkills: orphanSkills };
    }

    // ─── Importar un agente directamente a la API ──────────────────────────────

    // Caché para no crear la misma skill más de una vez por sesión de importación.
    // Se resetea al cerrar el modal (varias importaciones de agentes pueden compartir skills).
    var _skillCache = {};

    async function _importAgent(agent) {
        // 1. Crear skills vinculadas (una sola vez por nombre) y recoger sus IDs reales.
        var skillIds = [];
        for (var i = 0; i < agent.linkedSkills.length; i++) {
            var s = agent.linkedSkills[i];
            var sName = (s.meta.name || s._fallback || s.file.name.replace(/\.md$/i, '')).trim();
            var cacheKey = sName.toLowerCase();
            if (_skillCache[cacheKey]) {
                skillIds.push(_skillCache[cacheKey]);
                continue;
            }
            try {
                var created = await api.post('/api/skills/private', {
                    name: sName,
                    description: (s.meta.description || '').trim(),
                    icon: (s.meta.icon || '').trim(),
                    category: (s.meta.category || '').trim(),
                    content: s.body,
                });
                if (created && created.id) {
                    _skillCache[cacheKey] = created.id;
                    skillIds.push(created.id);
                }
            } catch (err) { console.error('[agents-scan] Error creando skill:', err); }
        }

        // 2. Construir payload del agente
        var p = agent.parsed;
        var payload = {
            name: p.name || agent.file.name.replace(/\.(md|json)$/i, ''),
            description: p.description || '',
            agent_type: p.agent_type || 'claude',
            connection_id: null,
            system_prompt: p.system_prompt || '',
            temperature: p.temperature != null ? p.temperature : 0.7,
            skills: skillIds,
            knowledge: [],
            use_memory: p.use_memory != null ? !!p.use_memory : false,
            routines: p.routines || [],
            scope: 'private',
            model: p.model || '',
        };
        if (p.agent_type === 'claude') {
            payload.extended_thinking = !!p.extended_thinking;
            payload.cache_control = !!p.cache_control;
            payload.thinking_budget_tokens = p.thinking_budget_tokens || 10000;
        } else if (p.agent_type === 'openai') {
            payload.response_format = p.response_format || 'text';
            payload.tool_choice = p.tool_choice || 'auto';
            payload.frequency_penalty = p.frequency_penalty || 0;
            payload.presence_penalty = p.presence_penalty || 0;
        } else if (p.agent_type === 'github') {
            payload.copilot_topic = p.copilot_topic || '';
        }

        await api.post('/api/agents', payload);
        if (typeof _loadAll === 'function') _loadAll();
        return skillIds.length;
    }

    // ─── Modal ────────────────────────────────────────────────────────────────

    var _modal = null;
    var _results = null;

    function _closeModal() {
        if (_modal) { _modal.remove(); _modal = null; }
        _results = null;
        _skillCache = {};
    }

    function _agentBadge(agentType) {
        var map = {
            agent_claude: ['scan-badge--claude', 'Claude Code'],
            agent_github: ['scan-badge--github', 'GitHub Copilot'],
            agent_json: ['scan-badge--native', 'iAgentsHub'],
        };
        var pair = map[agentType] || ['scan-badge--claude', 'Claude Code'];
        return '<span class="scan-badge ' + pair[0] + '">' + pair[1] + '</span>';
    }

    function _buildAgentItem(agent) {
        var el = document.createElement('div');
        el.className = 'scan-agent-item';
        var name = (agent.parsed && agent.parsed.name) || agent.file.name.replace(/\.(md|json)$/i, '');
        var btnLabel = agent.exists ? t('agents.scan.replace_btn') : t('agents.scan.import_btn');

        var skillsHTML = '';
        if (agent.linkedSkills.length) {
            skillsHTML = '<div class="scan-agent-skills">'
                + agent.linkedSkills.map(function (s) {
                    return '<span class="scan-skill-chip">' + esc(s.meta.name || s.file.name.replace(/\.md$/i, '')) + '</span>';
                }).join('') + '</div>';
        }

        el.innerHTML =
            '<div class="scan-agent-row">'
            + '<div class="scan-item-info">'
            + '<span class="scan-item-name">' + esc(name) + '</span>'
            + _agentBadge(agent.agentType)
            + (agent.linkedSkills.length ? '<span class="scan-skill-count">+' + agent.linkedSkills.length + ' skill' + (agent.linkedSkills.length > 1 ? 's' : '') + '</span>' : '')
            + '</div>'
            + '<button class="btn btn-ghost btn-sm scan-action-btn">' + esc(btnLabel) + '</button>'
            + '</div>'
            + skillsHTML;

        var btn = el.querySelector('.scan-action-btn');
        btn.addEventListener('click', function () { _doImportOne(agent, btn); });
        return el;
    }

    function _buildSkillItem(skill) {
        var el = document.createElement('div');
        el.className = 'scan-item';
        var name = skill.meta.name || skill._fallback || skill.file.name.replace(/\.md$/i, '');
        skill.exists = _skillExists(name);
        var btnLabel = skill.exists ? t('agents.scan.replace_btn') : t('agents.scan.create_btn');
        el.innerHTML =
            '<div class="scan-item-info">'
            + '<span class="scan-item-name">' + esc(name) + '</span>'
            + '<span class="scan-badge scan-badge--skill">' + esc(t('agents.scan.type_skill')) + '</span>'
            + '</div>'
            + '<button class="btn btn-ghost btn-sm scan-action-btn">' + esc(btnLabel) + '</button>';

        var btn = el.querySelector('.scan-action-btn');
        btn.addEventListener('click', function () { _doCreateSkill(skill, btn); });
        return el;
    }

    async function _openModal(results, dirName) {
        _closeModal();
        _results = results;

        var total = results.agents.length + results.orphanSkills.length;

        _modal = document.createElement('div');
        _modal.className = 'modal-bg';
        _modal.innerHTML =
            '<div class="modal-box">'
            + '<div class="modal-header">'
            + '<div>'
            + '<h2 class="modal-title">' + esc(dirName) + '</h2>'
            + '<p class="scan-modal-count">'
            + (total > 0 ? t('agents.scan.found', { n: String(total) }) : t('agents.scan.empty'))
            + '</p>'
            + '</div>'
            + '<div style="display:flex;gap:8px;align-items:center">'
            + (total > 0 ? '<button class="btn btn-primary btn-sm" id="scan-import-all">' + esc(t('agents.scan.import_all_btn')) + '</button>' : '')
            + '<button class="modal-close" id="scan-close">'
            + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
            + '</button>'
            + '</div>'
            + '</div>'
            + '<div class="scan-modal-body"></div>'
            + '</div>';

        document.body.appendChild(_modal);
        var body = _modal.querySelector('.scan-modal-body');

        if (results.agents.length) {
            var sec = document.createElement('div');
            sec.className = 'scan-section';
            sec.innerHTML = '<p class="scan-section-title">' + esc(t('agents.scan.agents_title')) + '</p>';
            results.agents.forEach(function (a) { sec.appendChild(_buildAgentItem(a)); });
            body.appendChild(sec);
        }

        if (results.orphanSkills.length) {
            var skSec = document.createElement('div');
            skSec.className = 'scan-section';
            skSec.innerHTML = '<p class="scan-section-title">' + esc(t('agents.scan.skills_title')) + '</p>';
            results.orphanSkills.forEach(function (s) { skSec.appendChild(_buildSkillItem(s)); });
            body.appendChild(skSec);
        }

        var closeBtn = _modal.querySelector('#scan-close');
        closeBtn.addEventListener('click', _closeModal);
        _modal.addEventListener('click', function (e) { if (e.target === _modal) _closeModal(); });

        var importAllBtn = _modal.querySelector('#scan-import-all');
        if (importAllBtn) {
            importAllBtn.addEventListener('click', function () { _doImportAll(importAllBtn); });
        }
    }

    // ─── Acciones individuales ────────────────────────────────────────────────

    async function _doImportOne(agent, btn) {
        if (!agent.parsed) return;
        btn.disabled = true;
        btn.textContent = '…';
        try {
            await _importAgent(agent);
            btn.textContent = '✓';
            btn.classList.add('scan-btn--done');
            agent.exists = true;
        } catch (err) {
            btn.disabled = false;
            btn.textContent = agent.exists ? t('agents.scan.replace_btn') : t('agents.scan.import_btn');
            toast(t('agents.page.load_error', { msg: err.message }), 'error');
        }
    }

    async function _doCreateSkill(skill, btn) {
        btn.disabled = true;
        var orig = skill.exists ? t('agents.scan.replace_btn') : t('agents.scan.create_btn');
        btn.textContent = '…';
        try {
            await api.post('/api/skills/private', {
                name: (skill.meta.name || skill._fallback || skill.file.name.replace(/\.md$/i, '')).trim(),
                description: (skill.meta.description || '').trim(),
                icon: (skill.meta.icon || '').trim(),
                category: (skill.meta.category || '').trim(),
                content: skill.body,
            });
            btn.textContent = '✓';
            btn.classList.add('scan-btn--done');
            skill.exists = true;
            toast(t('agents.scan.skill_created'), 'ok');
        } catch (err) {
            btn.disabled = false;
            btn.textContent = orig;
            toast(t('agents.scan.skill_error', { msg: err.message }), 'error');
        }
    }

    // ─── Importar todo ────────────────────────────────────────────────────────

    async function _doImportAll(btn) {
        if (!_results) return;
        btn.disabled = true;
        btn.textContent = '…';

        var agentCount = 0, skillCount = 0;
        var agentBtns = (_modal || document).querySelectorAll('.scan-agent-item .scan-action-btn');
        var skillBtns = (_modal || document).querySelectorAll('.scan-section:last-child .scan-item .scan-action-btn');

        // Snapshot del caché antes del loop para contar skills nuevas sin duplicar
        // las que ya existían por importaciones individuales previas.
        var cacheAtStart = Object.keys(_skillCache).length;

        for (var i = 0; i < _results.agents.length; i++) {
            var agent = _results.agents[i];
            if (!agent.parsed) continue;
            var agBtn = agentBtns[i];
            if (agBtn) { agBtn.disabled = true; agBtn.textContent = '…'; }
            try {
                await _importAgent(agent);
                agentCount++;
                if (agBtn) { agBtn.textContent = '✓'; agBtn.classList.add('scan-btn--done'); }
            } catch (_) {
                if (agBtn) { agBtn.disabled = false; agBtn.textContent = agent.exists ? t('agents.scan.replace_btn') : t('agents.scan.import_btn'); }
            }
        }

        // Skills únicas creadas por los agentes (deduplica shared skills vía _skillCache)
        skillCount = Object.keys(_skillCache).length - cacheAtStart;

        for (var j = 0; j < _results.orphanSkills.length; j++) {
            var skill = _results.orphanSkills[j];
            var skBtn = skillBtns[j];
            if (skBtn) { skBtn.disabled = true; skBtn.textContent = '…'; }
            try {
                await api.post('/api/skills/private', {
                    name: (skill.meta.name || skill._fallback || skill.file.name.replace(/\.md$/i, '')).trim(),
                    description: (skill.meta.description || '').trim(),
                    icon: (skill.meta.icon || '').trim(),
                    category: (skill.meta.category || '').trim(),
                    content: skill.body,
                });
                skill.exists = true;
                skillCount++;
                if (skBtn) { skBtn.textContent = '✓'; skBtn.classList.add('scan-btn--done'); }
            } catch (_) {
                if (skBtn) { skBtn.disabled = false; skBtn.textContent = skill.exists ? t('agents.scan.replace_btn') : t('agents.scan.create_btn'); }
            }
        }

        btn.textContent = '✓';
        btn.classList.add('scan-btn--done');
        toast(t('agents.scan.all_done', { agents: String(agentCount), skills: String(skillCount) }), 'ok');
        if (typeof _loadAll === 'function') _loadAll();
    }

    // ─── Entrada: drag-and-drop de archivos o carpetas ────────────────────────

    async function openFromDrop(dtItems) {
        var all = [];
        for (var i = 0; i < dtItems.length; i++) {
            var entry = dtItems[i].webkitGetAsEntry && dtItems[i].webkitGetAsEntry();
            if (entry) {
                var collected = await _collectFromEntry(entry);
                all = all.concat(collected);
            }
        }
        var dirName = all.length
            ? all[0].path.replace(/^\//, '').split('/')[0]
            : t('agents.scan.dir_fallback');
        var results = await _scanAndLink(all);
        _openModal(results, dirName);
    }

    return { openFromDrop: openFromDrop };

})();
