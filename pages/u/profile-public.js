(function () {
    'use strict';

    var _LANG_LABELS = {
        es: '🇪🇸 Español', en: '🇬🇧 English', fr: '🇫🇷 Français',
        de: '🇩🇪 Deutsch',  pt: '🇵🇹 Português', it: '🇮🇹 Italiano',
        zh: '🇨🇳 中文',     ja: '🇯🇵 日本語',    ar: '🇸🇦 العربية',
    };

    var _AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777','#0f766e'];
    function _avatarColor(name) {
        var code = 0;
        for (var i = 0; i < (name || '').length; i++) code += name.charCodeAt(i);
        return _AVATAR_COLORS[code % _AVATAR_COLORS.length];
    }

    function _esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Minimal markdown → HTML ────────────────────────────────────────────────

    function _md(src) {
        if (!src) return '';
        var s = src
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/```[\s\S]*?```/g, function (m) {
                return '<pre><code>' + m.slice(3, -3).trim() + '</code></pre>';
            })
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
            .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, text, url) {
                var safe = url.replace(/"/g,'%22').replace(/'/g,'%27');
                if (/^javascript:/i.test(safe.trim()) || /^data:/i.test(safe.trim())) safe = '#';
                return '<a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
            })
            .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
            .replace(/^---$/gm, '<hr>')
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return '<p>' + s + '</p>';
    }

    // ── SVG icons ─────────────────────────────────────────────────────────────

    var _SVG_MAIL = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
        '<rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4"/>' +
        '<path d="M1.5 5l6.5 5L14.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '</svg>';

    var _SVG_GH = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none">' +
        '<path d="M8 1.5a6.5 6.5 0 0 0-2.055 12.664c.325.06.444-.141.444-.313v-1.096c-1.806.393-2.187-.872-2.187-.872-.295-.75-.72-.95-.72-.95-.588-.402.044-.394.044-.394.65.046.993.668.993.668.578.99 1.517.704 1.887.538.059-.419.226-.704.41-.866-1.441-.164-2.957-.72-2.957-3.205 0-.708.253-1.287.668-1.74-.067-.164-.29-.822.063-1.714 0 0 .545-.175 1.784.664A6.213 6.213 0 0 1 8 5.34c.551.003 1.106.074 1.624.218 1.238-.839 1.782-.664 1.782-.664.355.892.132 1.55.065 1.714.417.453.667 1.032.667 1.74 0 2.492-1.518 3.04-2.963 3.2.233.201.44.598.44 1.205v1.787c0 .174.117.376.447.312A6.5 6.5 0 0 0 8 1.5z" fill="currentColor"/>' +
        '</svg>';

    var _SVG_FORK = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none">' +
        '<circle cx="8" cy="2.5" r="1.7" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="3" cy="13.5" r="1.7" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="13" cy="13.5" r="1.7" stroke="currentColor" stroke-width="1.4"/>' +
        '<path d="M8 4.2v3.5m0 0L3 11.8m5-4.1l5 4.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';

    // ── Render ─────────────────────────────────────────────────────────────────

    function _render(data) {
        var username = data.username || '';
        var color    = _avatarColor(username);

        // Cover gradient
        var cover = document.getElementById('prof-cover');
        if (cover) {
            var c2 = _avatarColor(username.split('').reverse().join(''));
            cover.style.background = 'linear-gradient(135deg,' + color + ' 0%,' + c2 + ' 100%)';
        }

        // Avatar
        var avatarWrap = document.getElementById('pub-avatar');
        var avatarLetter = document.getElementById('pub-avatar-letter');
        if (avatarWrap) avatarWrap.style.background = color;
        if (avatarLetter) avatarLetter.textContent = username.charAt(0).toUpperCase();
        if (data.avatar_url && avatarWrap) {
            var img = document.createElement('img');
            img.src = data.avatar_url + '?t=' + Date.now();
            img.alt = username;
            img.onerror = function () { img.remove(); if (avatarLetter) avatarLetter.style.display = ''; };
            img.onload  = function () { if (avatarLetter) avatarLetter.style.display = 'none'; };
            avatarWrap.insertBefore(img, avatarWrap.firstChild);
        }

        // Name
        var elName = document.getElementById('pub-username');
        if (elName) elName.textContent = '@' + username;
        document.title = 'iAgents Hub · @' + username;

        // Tagline (primera línea del bio)
        if (data.bio) {
            var firstLine = data.bio.split('\n')[0].trim();
            if (firstLine) {
                var tagEl = document.getElementById('pub-tagline');
                if (tagEl) { tagEl.textContent = firstLine; tagEl.hidden = false; }
            }
        }

        // Chips de meta (miembro desde)
        var metaEl = document.getElementById('pub-meta');
        if (metaEl && data.joined_at) {
            try {
                var d = new Date(data.joined_at);
                var dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                metaEl.innerHTML =
                    '<span class="prof-chip">' +
                    '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 7h13M5 1.5V4M11 1.5V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' +
                    'Miembro desde ' + _esc(dateStr) + '</span>';
            } catch (e) {}
        }

        // Joined (sidebar)
        var joinedCard = document.getElementById('pub-joined-card');
        var joinedDate = document.getElementById('pub-joined-date');
        if (joinedCard && joinedDate && data.joined_at) {
            try {
                var dj = new Date(data.joined_at);
                joinedDate.textContent = dj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                joinedCard.hidden = false;
            } catch (e) {}
        }

        // Bio completa
        if (data.bio) {
            var bioEl  = document.getElementById('pub-bio');
            var bioCard = document.getElementById('pub-about-card');
            if (bioEl)  bioEl.textContent = data.bio;
            if (bioCard) bioCard.hidden = false;
        }

        // Contact
        var contactCard = document.getElementById('pub-contact-card');
        var contactList = document.getElementById('pub-contact');
        if (contactCard && contactList) {
            var links = [];
            if (data.email_public) {
                links.push('<a href="mailto:' + _esc(data.email_public) + '" class="prof-contact-link">' +
                    _SVG_MAIL + _esc(data.email_public) + '</a>');
            }
            if (data.github) {
                links.push('<a href="https://github.com/' + encodeURIComponent(data.github) +
                    '" target="_blank" rel="noopener" class="prof-contact-link">' +
                    _SVG_GH + _esc(data.github) + '</a>');
            }
            if (links.length) {
                contactList.innerHTML = links.join('');
                contactCard.hidden = false;
            }
        }

        // Idiomas
        var langsCard = document.getElementById('pub-langs-card');
        var langsList = document.getElementById('pub-langs');
        if (langsCard && langsList && data.languages && data.languages.length) {
            langsList.innerHTML = data.languages.map(function (l) {
                return '<div class="prof-lang-item">' + _esc(_LANG_LABELS[l] || l) + '</div>';
            }).join('');
            langsCard.hidden = false;
        }

        // CV
        var cvSection = document.getElementById('pub-cv-section');
        var cvBody    = document.getElementById('pub-cv-body');
        if (cvSection && cvBody && data.cv) {
            cvBody.innerHTML = _md(data.cv);
            cvSection.hidden = false;
        }

        // Follow + stats
        _loadFollowStatus(username);

        // Resources
        _loadResources(username);

        // Si el sidebar no tiene ningún card visible, colapsar a columna única
        var sidebarCards = document.querySelectorAll('.prof-sidebar .prof-card');
        var anyVisible = Array.prototype.some.call(sidebarCards, function (c) { return !c.hidden; });
        if (!anyVisible) {
            var body = document.querySelector('.prof-body');
            if (body) body.classList.add('prof-body--nosidebar');
        }

        // Show
        document.getElementById('pub-loading').hidden = true;
        document.getElementById('pub-content').hidden = false;
    }

    // ── Follow ────────────────────────────────────────────────────────────────

    var _profileUsername = '';
    var _isFollowing     = false;
    var _me              = '';
    var _isSelf          = false;

    function _loadFollowStatus(username) {
        var btn   = document.getElementById('pub-follow-btn');
        var stats = document.getElementById('pub-stats');
        var label = document.getElementById('pub-follow-label');
        var fcEl  = document.getElementById('pub-followers-count');
        var fgEl  = document.getElementById('pub-following-count');

        fetch('/api/auth/me', { credentials: 'include' })
            .then(function (r) { return r.json(); })
            .then(function (me) {
                _me     = me.username || '';
                _isSelf = _me === username;
                if (!_isSelf && btn) btn.hidden = false;
                if (stats) stats.hidden = false;
            }).catch(function () {});

        fetch('/api/users/' + encodeURIComponent(username) + '/follow-status', { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                _isFollowing = !!data.following;
                if (label) label.textContent = _isFollowing
                    ? (window.t ? t('social.follow.btn_unfollow') : 'Dejar de seguir')
                    : (window.t ? t('social.follow.btn_follow')   : 'Seguir');
                if (btn) btn.classList.toggle('btn-primary', !_isFollowing);
                if (btn) btn.classList.toggle('btn-ghost',    _isFollowing);
                if (fcEl) fcEl.textContent = data.followers_count || 0;
                if (fgEl) fgEl.textContent = data.following_count || 0;
            }).catch(function () {});
    }

    function _bindFollow(username) {
        var btn = document.getElementById('pub-follow-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            btn.disabled = true;
            fetch('/api/users/' + encodeURIComponent(username) + '/follow', {
                method: _isFollowing ? 'DELETE' : 'POST',
                credentials: 'include',
            })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function () { _loadFollowStatus(username); })
            .catch(function () {})
            .finally(function () { btn.disabled = false; });
        });
    }

    // ── Resources ─────────────────────────────────────────────────────────────

    var _allResources = {};
    var _activeTab   = 'agent';
    var _forked      = {};

    function _renderResourceList(items) {
        if (!items || !items.length) {
            return '<p class="pub-empty">Este usuario no tiene recursos públicos todavía.</p>';
        }
        var isForkable = !_isSelf && (_activeTab === 'agent' || _activeTab === 'skill');
        return items.map(function (r) {
            var key    = r.resource_type + ':' + r.resource_id;
            var forked = !!_forked[key];
            var color  = _avatarColor(r.name);

            var forkBtn = isForkable
                ? '<button class="pub-resource-fork' + (forked ? ' forked' : '') +
                  '" data-action="pub-fork" data-type="' + _esc(r.resource_type) +
                  '" data-id="' + _esc(r.resource_id) + '" data-key="' + _esc(key) +
                  '" title="' + (forked ? 'Ya copiado' : 'Copiar') + '"' +
                  (forked ? ' disabled' : '') + '>' +
                  _SVG_FORK + ' Copiar</button>'
                : '';

            var catBadge = r.category
                ? '<span class="pub-resource-cat">' + _esc(r.category) + '</span>'
                : '';
            var labelChips = (window.LABELS && r.labels && r.labels.length)
                ? LABELS.renderChips(r.labels) : '';

            return '<div class="pub-resource-card">' +
                '<div class="pub-resource-avatar" style="background:' + color + '">' +
                (r.name || '?').charAt(0).toUpperCase() + '</div>' +
                '<div class="pub-resource-info">' +
                '<span class="pub-resource-name">' + _esc(r.name) + '</span>' +
                (r.description ? '<p class="pub-resource-desc">' + _esc(r.description) + '</p>' : '') +
                '<div class="pub-resource-badges">' +
                catBadge +
                (labelChips ? '<div class="label-chips-row">' + labelChips + '</div>' : '') +
                '</div>' +
                '</div>' +
                '<div class="pub-resource-actions">' +
                '<span class="pub-resource-stars">★ ' + (r.stars_count || 0) + '</span>' +
                forkBtn +
                '</div>' +
                '</div>';
        }).join('');
    }

    async function _forkResource(btn) {
        var type = btn.dataset.type;
        var id   = btn.dataset.id;
        var key  = btn.dataset.key;
        btn.disabled = true;
        try {
            var plural = type === 'skill' ? 'skills' : 'agents';
            await api.post('/api/' + plural + '/private/' + encodeURIComponent(id) + '/fork', {});
            _forked[key] = true;
            btn.classList.add('forked');
            btn.title = 'Ya copiado';
            if (window.toast) toast((type === 'skill' ? 'Skill copiada' : 'Agente copiado'), 'success');
        } catch (_) {
            btn.disabled = false;
        }
    }

    function _renderActiveTab() {
        var list = document.getElementById('pub-resources-list');
        if (list) list.innerHTML = _renderResourceList(_allResources[_activeTab] || []);
    }

    function _loadResources(username) {
        // Mostrar siempre la sección de recursos (con estado vacío si no hay nada)
        var sec = document.getElementById('pub-resources-section');
        if (sec) sec.hidden = false;
        _renderActiveTab(); // muestra el estado vacío inicial

        fetch('/api/users/' + encodeURIComponent(username) + '/resources', { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (items) {
                ['agent','skill','knowledge'].forEach(function (type) {
                    _allResources[type] = items.filter(function (r) { return r.resource_type === type; });
                });
                var total = items.length;
                // Contador de recursos en stats bar
                var rcEl = document.getElementById('pub-res-count');
                var rsEl = document.getElementById('pub-res-stat');
                var sepEl = document.getElementById('pub-res-sep');
                if (rcEl) rcEl.textContent = total;
                if (total) {
                    if (rsEl) rsEl.hidden = false;
                    if (sepEl) sepEl.hidden = false;
                }
                _renderActiveTab();
            })
            .catch(function () {});
    }

    // ── Error / Tabs / Resource actions ───────────────────────────────────────

    function _showError(msg) {
        document.getElementById('pub-loading').hidden = true;
        var err    = document.getElementById('pub-error');
        var errMsg = document.getElementById('pub-error-msg');
        if (err) err.hidden = false;
        if (errMsg) errMsg.textContent = msg;
    }

    function _bindTabs() {
        var tabsEl = document.querySelector('.pub-tabs');
        if (!tabsEl) return;
        tabsEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.pub-tab');
            if (!btn) return;
            document.querySelectorAll('.pub-tab').forEach(function (t) { t.classList.remove('active'); });
            btn.classList.add('active');
            _activeTab = btn.dataset.tab;
            _renderActiveTab();
        });
    }

    function _bindResourceActions() {
        var list = document.getElementById('pub-resources-list');
        if (!list) return;
        list.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-action="pub-fork"]');
            if (btn) { e.stopPropagation(); _forkResource(btn); }
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    async function init() {
        renderNav('nav-root', '');
        await window.requireAuth();
        _bindTabs();
        _bindResourceActions();

        var parts = window.location.pathname.split('/').filter(Boolean);
        // decodeURIComponent evita doble-encoding (e.g. '@' → '%40' en pathname)
        var username = decodeURIComponent(parts[1] || '');
        if (!username) { _showError('Usuario no especificado.'); return; }
        _profileUsername = username;
        _bindFollow(username);

        fetch('/api/users/' + encodeURIComponent(username), { credentials: 'include' })
            .then(function (r) {
                if (r.status === 404) throw new Error('Usuario no encontrado.');
                if (!r.ok) throw new Error('Error al cargar el perfil.');
                return r.json();
            })
            .then(_render)
            .catch(function (e) { _showError(e.message || 'Error al cargar el perfil.'); });
    }

    init();

}());
