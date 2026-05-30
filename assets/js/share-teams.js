// share-teams.js — modal reutilizable para compartir recursos con equipos
'use strict';

(function () {
    var _resourceType = null;
    var _resourceId   = null;
    var _resourceName = null;
    var _sharedTeams  = new Set();
    var _allTeams     = [];

    var _PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777'];

    function _teamColor(name) {
        var c = 0;
        for (var i = 0; i < (name || '').length; i++) c += name.charCodeAt(i);
        return _PALETTE[c % _PALETTE.length];
    }

    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function _injectStyles() {
        if (document.getElementById('share-teams-styles')) return;
        var s = document.createElement('style');
        s.id = 'share-teams-styles';
        s.textContent =
            '.share-teams-table { width:100%; border-collapse:collapse; }' +
            '.share-teams-table thead th { font-size:11px; font-weight:600; text-transform:uppercase;' +
            '  letter-spacing:.05em; color:var(--ink-3); padding:0 14px 8px; text-align:left; }' +
            '.share-teams-table tbody tr { border-top:1px solid var(--line); }' +
            '.share-teams-table tbody tr:first-child { border-top:1px solid var(--line-strong); }' +
            '.share-teams-table tbody td { padding:10px 14px; vertical-align:middle; }' +
            '.share-teams-table td:last-child { text-align:right; width:1%; white-space:nowrap; }' +
            '.share-team-cell { display:flex; align-items:center; gap:9px; }' +
            '.share-team-avatar { flex-shrink:0; width:28px; height:28px; border-radius:7px;' +
            '  display:flex; align-items:center; justify-content:center;' +
            '  font-size:12px; font-weight:700; color:#fff; }' +
            '.share-team-name { font-size:13px; font-weight:500; color:var(--ink);' +
            '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
            '.share-revoke-btn { display:inline-flex; align-items:center; gap:4px;' +
            '  padding:4px 10px; border-radius:var(--radius); border:1px solid color-mix(in srgb,var(--danger) 30%,transparent);' +
            '  background:color-mix(in srgb,var(--danger) 7%,transparent); color:var(--danger);' +
            '  font-size:12px; font-weight:500; font-family:var(--font); cursor:pointer; white-space:nowrap;' +
            '  transition:background .1s; }' +
            '.share-revoke-btn:hover { background:color-mix(in srgb,var(--danger) 13%,transparent); }' +
            '.share-revoke-btn:disabled,.share-grant-btn:disabled { opacity:.4; pointer-events:none; }' +
            '.share-grant-btn { display:inline-flex; align-items:center; gap:4px;' +
            '  padding:4px 10px; border-radius:var(--radius); border:1px solid color-mix(in srgb,#059669 30%,transparent);' +
            '  background:color-mix(in srgb,#059669 10%,transparent); color:#059669;' +
            '  font-size:12px; font-weight:500; font-family:var(--font); cursor:pointer; white-space:nowrap;' +
            '  transition:background .1s; }' +
            '.share-grant-btn:hover { background:color-mix(in srgb,#059669 18%,transparent); }';
        document.head.appendChild(s);
    }

    function _ensureModal() {
        if (document.getElementById('modal-share-teams')) return;
        _injectStyles();
        var div = document.createElement('div');
        div.innerHTML =
            '<div id="modal-share-teams" class="modal-bg" style="display:none">' +
            '<div class="modal-box" style="max-width:500px">' +
            '<div class="modal-header">' +
            '<h3 class="modal-title" id="share-teams-title"></h3>' +
            '<button class="modal-close" id="btn-share-teams-close">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="modal-body" id="share-teams-body" style="padding:16px 0 4px;gap:0;overflow-x:auto"></div>' +
            '<div class="modal-footer" style="justify-content:flex-end">' +
            '<button class="btn btn-ghost" id="btn-share-teams-done"></button>' +
            '</div>' +
            '</div>' +
            '</div>';
        document.body.appendChild(div.firstElementChild);

        document.getElementById('btn-share-teams-close').addEventListener('click', _close);
        var doneBtn = document.getElementById('btn-share-teams-done');
        doneBtn.textContent = (typeof t === 'function' ? t('common.actions.close') : null) || 'Cerrar';
        doneBtn.addEventListener('click', _close);
        document.getElementById('modal-share-teams').addEventListener('click', function (e) {
            if (e.target === this) _close();
        });
        document.getElementById('share-teams-body').addEventListener('click', _onToggle);
    }

    function _close() {
        var modal = document.getElementById('modal-share-teams');
        if (modal) modal.style.display = 'none';
    }

    function _buildBtn(teamId) {
        var shared = _sharedTeams.has(teamId);
        var grantLabel  = (typeof t === 'function' ? t('teams.teams.sharing.grant_access')  : null) || 'Dar acceso';
        var revokeLabel = (typeof t === 'function' ? t('teams.teams.sharing.revoke_access') : null) || 'Quitar acceso';
        if (shared) {
            return '<button class="share-revoke-btn" data-team="' + esc(teamId) + '">' +
                '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
                esc(revokeLabel) + '</button>';
        }
        return '<button class="share-grant-btn" data-team="' + esc(teamId) + '">' +
            '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            esc(grantLabel) + '</button>';
    }

    function _renderTable() {
        var bodyEl = document.getElementById('share-teams-body');
        if (!bodyEl) return;

        if (!_allTeams.length) {
            bodyEl.innerHTML = '<p style="padding:24px 16px;text-align:center;font-size:13px;color:var(--ink-3)">' +
                esc((typeof t === 'function' ? t('teams.teams.sharing.no_teams') : null) || 'No perteneces a ningún equipo.') +
                '</p>';
            return;
        }

        var managerLabel = (typeof t === 'function' ? t('teams.teams.manager_badge') : null) || 'Gestor';
        var memberLabel  = (typeof t === 'function' ? t('teams.teams.member_badge')  : null) || 'Miembro';

        var rows = _allTeams.map(function (team) {
            var letter = (team.name || '?').charAt(0).toUpperCase();
            var color  = _teamColor(team.name || '');
            var roleBadge = team.is_manager
                ? '<span class="badge badge--ok">' + esc(managerLabel) + '</span>'
                : '<span class="badge badge--std">' + esc(memberLabel) + '</span>';
            return '<tr>' +
                '<td><div class="share-team-cell">' +
                '<span class="share-team-avatar" style="background:' + color + '">' + esc(letter) + '</span>' +
                '<span class="share-team-name">' + esc(team.name) + '</span>' +
                '</div></td>' +
                '<td>' + roleBadge + '</td>' +
                '<td>' + _buildBtn(team.id) + '</td>' +
                '</tr>';
        }).join('');

        var thGroup = esc((typeof t === 'function' ? t('teams.teams.sharing.col_group') : null) || 'Grupo');
        var thRole  = esc((typeof t === 'function' ? t('teams.teams.sharing.col_role')  : null) || 'Rol');
        bodyEl.innerHTML =
            '<table class="share-teams-table">' +
            '<thead><tr>' +
            '<th>' + thGroup + '</th>' +
            '<th>' + thRole + '</th>' +
            '<th></th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table>';
    }

    async function _onToggle(e) {
        var btn = e.target.closest('.share-grant-btn,.share-revoke-btn');
        if (!btn) return;
        var teamId   = btn.dataset.team;
        var isRevoke = btn.classList.contains('share-revoke-btn');

        btn.disabled = true;
        try {
            if (isRevoke) {
                await api.del('/api/sharing/' + _resourceType + '/' + _resourceId + '/' + teamId);
                _sharedTeams.delete(teamId);
            } else {
                await api.post('/api/sharing/' + _resourceType + '/' + _resourceId, { team_id: teamId });
                _sharedTeams.add(teamId);
            }
            // Swap button in place
            btn.outerHTML = _buildBtn(teamId);
        } catch (err) {
            btn.disabled = false;
            if (typeof toast === 'function') toast(err.message || 'Error', 'error');
        }
    }

    async function open(resourceType, resourceId, resourceName) {
        _ensureModal();
        _resourceType = resourceType;
        _resourceId   = resourceId;
        _resourceName = resourceName;
        _sharedTeams  = new Set();
        _allTeams     = [];

        var modal   = document.getElementById('modal-share-teams');
        var titleEl = document.getElementById('share-teams-title');
        var bodyEl  = document.getElementById('share-teams-body');

        var title = ((typeof t === 'function' ? t('teams.teams.sharing.modal_title') : null) || 'Compartir — {{name}}').replace('{{name}}', resourceName);
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML =
            '<p style="padding:24px 16px;text-align:center;font-size:13px;color:var(--ink-3)">' +
            esc((typeof t === 'function' ? t('teams.teams.sharing.loading') : null) || 'Cargando…') + '</p>';
        if (modal) modal.style.display = '';

        try {
            var results = await Promise.all([
                api.get('/api/teams/'),
                api.get('/api/sharing/' + resourceType + '/' + resourceId),
            ]);
            _allTeams    = results[0] || [];
            _sharedTeams = new Set((results[1] || []).map(function (s) { return s.team_id; }));
            _renderTable();
        } catch (e) {
            if (bodyEl) bodyEl.innerHTML =
                '<p style="padding:24px 16px;text-align:center;font-size:13px;color:var(--danger)">' + esc(e.message) + '</p>';
        }
    }

    window.shareTeams = { open: open };
}());
