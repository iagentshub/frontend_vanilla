(function () {
    'use strict';

    var _AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777', '#0f766e'];
    var _TYPE_LABELS = { agent: 'Agente', skill: 'Skill', knowledge: 'Knowledge' };

    var _offset = 0;
    var _limit = 40;
    var _hasMore = false;
    var _loading = false;
    var _starred = {};
    var _forked = {};
    var _linked = {};
    var _me = '';
    var _searched = false;   // true after first explicit search

    var _SVG_EYE = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
        '<path d="M1.5 8C1.5 8 4 3.5 8 3.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/>' +
        '</svg>';

    var _SVG_FORK = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none">' +
        '<circle cx="8" cy="2.5" r="1.7" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="3" cy="13.5" r="1.7" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="13" cy="13.5" r="1.7" stroke="currentColor" stroke-width="1.4"/>' +
        '<path d="M8 4.2v3.5m0 0L3 11.8m5-4.1l5 4.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
    var _SVG_LINK = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none">' +
        '<path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
        '</svg>';

    function _avatarColor(name) {
        var code = 0;
        for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
        return _AVATAR_COLORS[code % _AVATAR_COLORS.length];
    }

    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function _activeType() {
        return (document.getElementById('explore-type') || {}).value || 'all';
    }

    function _getFilters() {
        return {
            type: _activeType(),
            category: (document.getElementById('explore-category') || {}).value || '',
            q: (document.getElementById('explore-search') || {}).value || '',
        };
    }

    function _buildUrl(filters, offset) {
        var params = [];
        if (filters.type && filters.type !== 'all') params.push('type=' + encodeURIComponent(filters.type));
        if (filters.category) params.push('category=' + encodeURIComponent(filters.category));
        if (filters.q) params.push('q=' + encodeURIComponent(filters.q));
        params.push('limit=' + (_limit + 1));
        params.push('offset=' + offset);
        return '/api/explore' + (params.length ? '?' + params.join('&') : '');
    }

    function _renderCard(r) {
        var key = r.resource_type + ':' + r.resource_id;
        var color = _avatarColor(r.name);
        var initial = (r.name || '?').charAt(0).toUpperCase();
        var starred = !!_starred[key];
        var forked = !!_forked[key];
        var isOwn = _me && r.owner === _me;
        var isForkable = !isOwn && (r.resource_type === 'agent' || r.resource_type === 'skill' || r.resource_type === 'knowledge');
        var originBadge = r.fork_of_id
            ? '<span class="explore-card-fork-badge">' + (window.t ? t('labels.fork') : 'fork') + '</span>'
            : (r.linked_to_id ? '<span class="explore-card-fork-badge">' + (window.t ? t('labels.linked') : 'linked') + '</span>' : '');
        var verifiedBadge = r.verified
            ? '<span class="explore-card-verified-badge" title="Verificado por el equipo">' +
            '<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 4L13 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            ' Verificado</span>'
            : '';
        var labelChips = (window.LABELS && r.labels && r.labels.length)
            ? '<div class="label-chips-row" style="margin-top:4px">' + LABELS.renderChips(r.labels) + '</div>'
            : '';
        var isLinked = !!_linked[key];
        var forkBtn = isForkable
            ? '<button class="explore-card-fork-btn' + (forked ? ' forked' : '') + '" data-action="fork"' +
            ' data-key="' + esc(key) + '" data-type="' + esc(r.resource_type) + '" data-id="' + esc(r.resource_id) + '"' +
            ' data-owner="' + esc(r.owner) + '" title="' + (forked ? 'Ya forkeado' : (window.t ? t('labels.actions.fork') : 'Fork')) + '"' +
            (forked ? ' disabled' : '') + '>' +
            _SVG_FORK +
            '</button>'
            : '';
        var linkBtn = isForkable
            ? '<button class="explore-card-fork-btn' + (isLinked ? ' forked' : '') + '" data-action="link"' +
            ' data-key="' + esc(key) + '" data-type="' + esc(r.resource_type) + '" data-id="' + esc(r.resource_id) + '"' +
            ' title="' + (isLinked ? 'Ya enlazado' : (window.t ? t('labels.actions.link') : 'Link')) + '"' +
            (isLinked ? ' disabled' : '') + '>' +
            _SVG_LINK +
            '</button>'
            : '';
        var tryBtn = (!isOwn && r.resource_type === 'agent')
            ? '<button class="explore-card-try-btn" data-action="try" data-id="' + esc(r.resource_id) + '" data-owner="' + esc(r.owner) + '" title="Probar agente">Probar</button>'
            : '';
        return '<div class="explore-card" data-id="' + esc(r.resource_id) + '" data-type="' + esc(r.resource_type) + '" data-owner="' + esc(r.owner) + '">' +
            '<div class="explore-card-top">' +
            '<div class="explore-card-avatar" style="background:' + color + '">' + initial + '</div>' +
            '<div class="explore-card-info">' +
            '<div class="explore-card-name" title="' + esc(r.name) + '">' + esc(r.name) + '</div>' +
            '<div class="explore-card-meta">' +
            '<span class="explore-card-type-badge">' + esc(_TYPE_LABELS[r.resource_type] || r.resource_type) + '</span>' +
            esc(r.category || '') +
            originBadge +
            verifiedBadge +
            '</div>' +
            '</div>' +
            '</div>' +
            '<p class="explore-card-desc">' + esc(r.description || '') + '</p>' +
            labelChips +
            '<div class="explore-card-footer">' +
            '<a href="/u/' + encodeURIComponent(r.owner) + '" class="explore-card-author">@' + esc(r.owner) + '</a>' +
            '<div class="explore-card-actions">' +
            '<button class="explore-card-eye-btn" data-action="preview" data-type="' + esc(r.resource_type) + '" data-id="' + esc(r.resource_id) + '" title="Vista previa">' +
            _SVG_EYE + '</button>' +
            forkBtn +
            linkBtn +
            tryBtn +
            '<button class="explore-card-star-btn' + (starred ? ' starred' : '') + '" data-action="star" data-key="' + esc(key) + '" data-type="' + esc(r.resource_type) + '" data-id="' + esc(r.resource_id) + '">' +
            '★ <span class="star-count">' + (r.stars_count || 0) + '</span>' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function _setLoading(on) {
        _loading = on;
        var el = document.getElementById('explore-loading');
        if (el) el.hidden = !on;
    }

    function _setMessage(text) {
        var el = document.getElementById('explore-empty');
        var msg = document.getElementById('explore-empty-msg');
        if (msg) msg.textContent = text;
        if (el) el.hidden = !text;
    }

    function _showPrompt() {
        _setMessage(window.t ? t('explore.prompt') : 'Elige un tipo y escribe tu búsqueda para explorar.');
        var grid = document.getElementById('explore-grid');
        grid.innerHTML = '';
        grid.hidden = true;
        var moreWrap = document.getElementById('explore-load-more');
        if (moreWrap) moreWrap.hidden = true;
    }

    async function _loadResources(reset) {
        if (_loading) return;
        if (reset) _offset = 0;
        _setLoading(true);
        _setMessage('');   // hide while loading
        var filters = _getFilters();
        var grid = document.getElementById('explore-grid');
        var moreWrap = document.getElementById('explore-load-more');
        try {
            var items = await fetch(_buildUrl(filters, _offset), { credentials: 'include' })
                .then(function (r) { if (!r.ok) throw new Error(); return r.json(); });

            _hasMore = items.length > _limit;
            if (_hasMore) items = items.slice(0, _limit);

            if (reset) grid.innerHTML = '';

            if (!items.length && _offset === 0) {
                grid.hidden = true;
                _setMessage(window.t ? t('explore.empty') : 'No hay resultados que coincidan con tu búsqueda.');
                if (moreWrap) moreWrap.hidden = true;
            } else {
                grid.hidden = false;
                grid.innerHTML += items.map(_renderCard).join('');
                _offset += items.length;
                if (moreWrap) moreWrap.hidden = !_hasMore;
            }
        } catch (err) { console.error('[explore] Error cargando items:', err); }
        _setLoading(false);
    }

    function _resourceUrl(type, id, action) {
        if (type === 'knowledge') return '/api/knowledge/' + encodeURIComponent(id) + '/' + action;
        var plural = type === 'skill' ? 'skills' : 'agents';
        return '/api/' + plural + '/public/' + encodeURIComponent(id) + '/' + action;
    }

    async function _forkResource(btn) {
        var key = btn.dataset.key;
        var type = btn.dataset.type;
        var id = btn.dataset.id;
        btn.disabled = true;
        try {
            var r = await fetch(_resourceUrl(type, id, 'fork'), { method: 'POST', credentials: 'include' });
            var data = await r.json();
            if (!r.ok) {
                if (window.toast) toast(data.detail || 'Error al copiar', 'error');
                btn.disabled = false;
                return;
            }
            _forked[key] = true;
            btn.classList.add('forked');
            btn.title = 'Ya copiado';
            var labels = { agent: 'Agente copiado', skill: 'Skill copiada', knowledge: 'Knowledge copiado' };
            if (window.toast) toast((labels[type] || 'Copiado') + ' a tu workspace', 'success');
        } catch (_) {
            btn.disabled = false;
        }
    }

    async function _linkResource(btn) {
        var key = btn.dataset.key;
        var type = btn.dataset.type;
        var id = btn.dataset.id;
        btn.disabled = true;
        try {
            var r = await fetch(_resourceUrl(type, id, 'link'), { method: 'POST', credentials: 'include' });
            var data = await r.json();
            if (!r.ok) {
                if (window.toast) toast(data.detail || (window.t ? t('labels.actions.link_error') : 'Error al enlazar'), 'error');
                btn.disabled = false;
                return;
            }
            _linked[key] = true;
            btn.classList.add('forked');
            btn.title = 'Ya enlazado';
            if (window.toast) toast((window.t ? t('labels.actions.link_success') : 'Enlazado') + ': ' + data.name, 'success');
        } catch (_) {
            btn.disabled = false;
        }
    }

    async function _toggleStar(btn) {
        var key = btn.dataset.key;
        var type = btn.dataset.type;
        var id = btn.dataset.id;
        var isStarred = !!_starred[key];
        try {
            var url = '/api/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + '/star';
            var data = await (isStarred ? api.del(url) : api.post(url, {}));
            _starred[key] = !isStarred;
            btn.classList.toggle('starred', !isStarred);
            var countEl = btn.querySelector('.star-count');
            if (countEl) countEl.textContent = data.stars || 0;
        } catch (err) { console.error('[explore] Error al actualizar estrella:', err); }
    }

    // ── Users mode ────────────────────────────────────────────────────────────

    var _userOffset = 0;
    var _userHasMore = false;
    var _userLoading = false;
    var _wsId = '';

    function _renderUserCard(u) {
        var initial = (u.username || '?').charAt(0).toUpperCase();
        var color = _avatarColor(u.username);
        var isSelf = _me && u.username === _me;
        var followersLabel = window.t ? t('social.follow.followers') : 'seguidores';
        var resourcesLabel = window.t ? t('explore.users.resources') : 'recursos';
        return '<div class="explore-user-card">' +
            '<a href="/u/' + encodeURIComponent(u.username) + '" class="explore-user-avatar" style="background:' + color + '" title="' + esc(u.username) + '">' +
            initial + '</a>' +
            '<div class="explore-user-info">' +
            '<a href="/u/' + encodeURIComponent(u.username) + '" class="explore-user-name">@' + esc(u.username) + '</a>' +
            '<span class="explore-user-meta">' +
            '<strong>' + (u.followers_count || 0) + '</strong> ' + followersLabel + ' · ' +
            '<strong>' + (u.public_resources_count || 0) + '</strong> ' + resourcesLabel +
            '</span>' +
            '</div>' +
            '<div class="explore-user-actions">' +
            '<a href="/u/' + encodeURIComponent(u.username) + '" class="btn btn-ghost btn-sm">' +
            (window.t ? t('explore.users.view_profile') : 'Ver perfil') + '</a>' +
            (!isSelf ? '<button class="btn btn-ghost btn-sm explore-invite-btn" data-username="' + esc(u.username) + '">' +
                (window.t ? t('explore.users.invite') : 'Invitar') + '</button>' : '') +
            '</div>' +
            '</div>';
    }

    async function _loadUsers(reset) {
        if (_userLoading) return;
        if (reset) _userOffset = 0;
        _userLoading = true;
        _setLoading(true);
        var q = (document.getElementById('explore-search') || {}).value || '';
        var params = ['limit=21', 'offset=' + _userOffset];
        if (q) params.push('q=' + encodeURIComponent(q));
        var grid = document.getElementById('explore-grid');
        var moreWrap = document.getElementById('explore-load-more');
        _setMessage('');   // hide while loading
        try {
            var items = await api.get('/api/users?' + params.join('&'));

            _userHasMore = items.length > 20;
            if (_userHasMore) items = items.slice(0, 20);

            if (reset) grid.innerHTML = '';
            if (!items.length && _userOffset === 0) {
                grid.hidden = true;
                _setMessage(window.t ? t('explore.empty') : 'No hay resultados que coincidan con tu búsqueda.');
                if (moreWrap) moreWrap.hidden = true;
            } else {
                grid.hidden = false;
                grid.innerHTML += items.map(_renderUserCard).join('');
                _userOffset += items.length;
                if (moreWrap) moreWrap.hidden = !_userHasMore;
            }
        } catch (err) { console.error('[explore] Error cargando usuarios:', err); }
        _userLoading = false;
        _setLoading(false);
    }

    async function _inviteUser(username) {
        if (!_wsId) {
            if (window.toast) toast(window.t ? t('explore.users.invite_no_ws') : 'Sin workspace activo', 'error');
            return;
        }
        try {
            await api.post('/api/workspaces/' + encodeURIComponent(_wsId) + '/invitations', { username: username });
            if (window.toast) toast((window.t ? t('explore.users.invite_sent') : 'Invitación enviada a') + ' @' + username, 'success');
        } catch (e) {
            var msg = e.status === 409
                ? (window.t ? t('explore.users.invite_already') : 'Ya invitado o miembro')
                : (window.t ? t('explore.users.invite_error') : 'Error al invitar');
            if (window.toast) toast(msg, 'error');
        }
    }

    var _AVATAR_COLORS_P = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777', '#0f766e'];
    function _avatarColorP(name) {
        var code = 0;
        for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
        return _AVATAR_COLORS_P[code % _AVATAR_COLORS_P.length];
    }

    function _abpItem(text) {
        return '<div class="abp-item"><span class="abp-item-bullet"></span><span>' + esc(text) + '</span></div>';
    }
    function _abpEmpty() { return '<span class="abp-empty">—</span>'; }

    function _openPreviewModal(data) {
        var type = data.resource_type || '';
        var badge = { agent: 'Agente', skill: 'Skill', knowledge: 'Knowledge' }[type] || type;
        var labelChips = (window.LABELS && data.labels && data.labels.length)
            ? LABELS.renderChips(data.labels) : '';

        document.getElementById('ep-modal-title').textContent = data.name || '';

        var html = '';

        if (type === 'agent') {
            var color = _avatarColorP(data.name || '');
            var initial = (data.name || '?').charAt(0).toUpperCase();
            var temp = typeof data.temperature === 'number' ? data.temperature : 0.7;
            var tempPct = Math.round(temp * 100);

            // Header (avatar + meta)
            html += '<div class="abp-header">'
                + '<div class="agent-avatar" style="background:' + color + ';width:38px;height:38px;font-size:16px;flex-shrink:0">' + initial + '</div>'
                + '<div class="abp-agent-meta">'
                + '<div class="abp-agent-name">' + esc(data.name) + '</div>'
                + (data.description ? '<div class="abp-agent-desc">' + esc(data.description) + '</div>' : '')
                + (labelChips || data.category ? '<div class="abp-agent-badges">'
                    + (data.category ? '<span class="explore-card-type-badge">' + esc(data.category) + '</span>' : '')
                    + (labelChips ? labelChips : '')
                    + '</div>' : '')
                + '</div>'
                + '</div>';

            // Skills + Knowledge grid
            var skillsHtml = (data.skills && data.skills.length)
                ? data.skills.map(_abpItem).join('') : _abpEmpty();
            var knowledgeHtml = (data.knowledge && data.knowledge.length)
                ? data.knowledge.map(_abpItem).join('') : _abpEmpty();

            html += '<div class="abp-grid-2">'
                + '<div class="abp-section"><div class="abp-section-label">Skills</div>' + skillsHtml + '</div>'
                + '<div class="abp-section"><div class="abp-section-label">Conocimiento</div>' + knowledgeHtml + '</div>'
                + '<div class="abp-section"><div class="abp-section-label">Config</div>'
                + '<div class="abp-cfg-row"><span class="abp-cfg-key">Temperatura</span>'
                + '<span class="abp-temp-bar"><span class="abp-temp-track"><span class="abp-temp-fill" style="width:' + tempPct + '%"></span></span>'
                + '<span class="abp-cfg-val">' + temp.toFixed(1) + '</span></span></div>'
                + (data.use_memory ? '<div class="abp-cfg-row"><span class="abp-cfg-key">Memoria</span><span class="abp-cfg-val abp-cfg-val--on">On</span></div>' : '')
                + '</div>'
                + '</div>';

            // System prompt (full width)
            if (data.system_prompt) {
                html += '<div class="abp-section abp-section--full">'
                    + '<div class="abp-section-label">Prompt de sistema</div>'
                    + '<pre class="abp-prompt-pre">' + esc(data.system_prompt) + (data.system_prompt.length >= 600 ? '…' : '') + '</pre>'
                    + '</div>';
            }

        } else if (type === 'skill') {
            // Header row
            html += '<div style="display:flex;align-items:center;gap:8px">'
                + '<span class="explore-card-type-badge">' + esc(badge) + '</span>'
                + (data.category ? '<span style="font-size:12px;color:var(--ink-2)">' + esc(data.category) + '</span>' : '')
                + (labelChips || '') + '</div>';
            if (data.description) {
                html += '<p style="font-size:13px;color:var(--ink-2);margin:0">' + esc(data.description) + '</p>';
            }
            if (data.parameters && data.parameters.length) {
                html += '<div class="abp-section"><div class="abp-section-label">Parámetros</div>'
                    + data.parameters.map(function (p) {
                        return '<div class="abp-item"><span class="abp-item-bullet"></span>'
                            + '<code style="background:var(--surface-3);padding:1px 5px;border-radius:3px;font-size:11px">' + esc(p.name || p) + '</code>'
                            + (p.description ? '<span style="color:var(--ink-3);font-size:11.5px"> ' + esc(p.description) + '</span>' : '')
                            + '</div>';
                    }).join('') + '</div>';
            }
            if (data.body) {
                html += '<div class="abp-section"><div class="abp-section-label">Instrucciones</div>'
                    + '<pre class="abp-prompt-pre" style="max-height:280px">' + esc(data.body) + (data.body.length >= 3000 ? '…' : '') + '</pre>'
                    + '</div>';
            }

        } else if (type === 'knowledge') {
            html += '<div style="display:flex;align-items:center;gap:8px">'
                + '<span class="explore-card-type-badge">' + esc(badge) + '</span>'
                + (labelChips || '') + '</div>';
            if (data.source) {
                html += '<div class="abp-section" style="min-height:0"><div class="abp-section-label">Fuente</div>'
                    + '<span style="font-size:12.5px;color:var(--ink-2)">' + esc(data.source) + '</span>'
                    + (data.char_count ? '<span style="font-size:11px;color:var(--ink-3)">' + (data.char_count >= 1000 ? (data.char_count / 1000).toFixed(1) + 'k' : data.char_count) + ' chars</span>' : '')
                    + '</div>';
            }
            if (data.content) {
                html += '<div class="abp-section"><div class="abp-section-label">Contenido</div>'
                    + '<pre class="abp-prompt-pre" style="max-height:300px">' + esc(data.content) + (data.content.length >= 2000 ? '…' : '') + '</pre>'
                    + '</div>';
            }
        }

        document.getElementById('ep-content').innerHTML = html;
        document.getElementById('explore-preview-modal').style.display = 'flex';
    }

    async function _previewResource(type, id) {
        try {
            var data = await api.get('/api/explore/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + '/preview');
            _openPreviewModal(data);
        } catch (_) {
            if (window.toast) toast('No se pudo cargar la vista previa', 'error');
        }
    }

    async function _openTryModal(agentId, owner) {
        var modal = document.getElementById('explore-try-modal');
        if (!modal) return;

        // Reset state
        document.getElementById('et-result').hidden = true;
        document.getElementById('et-warnings').hidden = true;
        document.getElementById('et-message').value = '';

        // Load connections
        var select = document.getElementById('et-conn-select');
        select.innerHTML = '<option value="">Cargando...</option>';
        modal.style.display = 'flex';

        try {
            var conns = await api.get('/api/connections').catch(function () { return []; });
            if (!conns.length) {
                select.innerHTML = '<option value="">Sin connections disponibles</option>';
            } else {
                select.innerHTML = conns.map(function (c) {
                    return '<option value="' + esc(c.id) + '">' + esc(c.name || c.id) + '</option>';
                }).join('');
            }
        } catch (_) {
            select.innerHTML = '<option value="">Error cargando connections</option>';
        }

        // Store agentId for submit
        modal.dataset.agentId = agentId;
        document.getElementById('et-title').textContent = 'Probar agente de @' + owner;
    }

    async function _submitTry() {
        var modal = document.getElementById('explore-try-modal');
        var agentId = modal.dataset.agentId || '';
        var connId = document.getElementById('et-conn-select').value;
        var message = (document.getElementById('et-message').value || '').trim();
        var submitBtn = document.getElementById('et-submit');

        if (!connId) { if (window.toast) toast('Selecciona una connection', 'error'); return; }
        if (!message) { if (window.toast) toast('Escribe un mensaje', 'error'); return; }

        submitBtn.disabled = true;
        document.getElementById('et-result').hidden = true;
        document.getElementById('et-warnings').hidden = true;

        try {
            var res = await api.post('/api/agents/public/' + encodeURIComponent(agentId) + '/try', { connection_id: connId, message: message });

            // Show warnings
            if (res.warnings && res.warnings.length) {
                var warnEl = document.getElementById('et-warnings');
                warnEl.innerHTML = '<strong>Skills no disponibles:</strong> ' + res.warnings.map(esc).join(', ');
                warnEl.hidden = false;
            }
            // Show reply
            var resultEl = document.getElementById('et-result');
            resultEl.textContent = res.reply || '(sin respuesta)';
            resultEl.hidden = false;
        } catch (err) {
            if (window.toast) toast('Error al probar el agente: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    }

    function _toggleCategoryBar(show) {
        var el = document.getElementById('explore-category');
        if (el) el.style.display = show ? '' : 'none';
    }

    function _doSearch() {
        _searched = true;
        if (_activeType() === 'users') {
            _toggleCategoryBar(false);
            _loadUsers(true);
        } else {
            _toggleCategoryBar(true);
            _loadResources(true);
        }
    }

    function _bindFilters() {
        // Type dropdown: only toggle category bar, don't auto-search
        document.getElementById('explore-type').addEventListener('change', function () {
            _toggleCategoryBar(_activeType() !== 'users');
            if (_searched) _doSearch();
        });

        // Enter key in search input triggers search
        document.getElementById('explore-search').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') _doSearch();
        });

        // Search button
        document.getElementById('explore-search-btn').addEventListener('click', function () {
            _doSearch();
        });

        // Preview modal close
        document.getElementById('ep-close').addEventListener('click', function () {
            document.getElementById('explore-preview-modal').style.display = 'none';
        });
        document.getElementById('explore-preview-modal').addEventListener('click', function (e) {
            if (e.target === this) this.style.display = 'none';
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') document.getElementById('explore-preview-modal').style.display = 'none';
        });

        // Card actions
        document.getElementById('explore-grid').addEventListener('click', function (e) {
            var invBtn = e.target.closest('.explore-invite-btn');
            if (invBtn) { e.stopPropagation(); _inviteUser(invBtn.dataset.username); return; }
            var eyeBtn = e.target.closest('[data-action="preview"]');
            if (eyeBtn) { e.stopPropagation(); _previewResource(eyeBtn.dataset.type, eyeBtn.dataset.id); return; }
            var starBtn = e.target.closest('[data-action="star"]');
            if (starBtn) { e.stopPropagation(); _toggleStar(starBtn); return; }
            var forkBtn = e.target.closest('[data-action="fork"]');
            if (forkBtn) { e.stopPropagation(); _forkResource(forkBtn); return; }
            var lnkBtn = e.target.closest('[data-action="link"]');
            if (lnkBtn) { e.stopPropagation(); _linkResource(lnkBtn); return; }
            var tryBtn2 = e.target.closest('[data-action="try"]');
            if (tryBtn2) { e.stopPropagation(); _openTryModal(tryBtn2.dataset.id, tryBtn2.dataset.owner); return; }
        });

        // Load more
        var moreBtn = document.getElementById('explore-load-more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', function () {
                if (_activeType() === 'users') _loadUsers(false);
                else _loadResources(false);
            });
        }

        // Try modal
        document.getElementById('et-close').addEventListener('click', function () {
            document.getElementById('explore-try-modal').style.display = 'none';
        });
        document.getElementById('explore-try-modal').addEventListener('click', function (e) {
            if (e.target === this) this.style.display = 'none';
        });
        document.getElementById('et-submit').addEventListener('click', _submitTry);
    }

    async function init() {
        await window.requireAuth();
        renderNav('nav-root', 'explore');
        api.get('/api/auth/me')
            .then(function (d) {
                _me = d.username || '';
                _wsId = d.workspace_id || d.username || '';
            })
            .catch(function () { });
        _bindFilters();
        // Show initial prompt — no auto-load
        _showPrompt();
    }

    init();

}());
