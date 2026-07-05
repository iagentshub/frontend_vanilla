// knowledge.js — página /knowledge (tabs: Skills · URLs · Documentos)
'use strict';

var _privateSkills = [];
var _activeTab = 'skills';
var _skillsPage = 1;
var _lastSkillsFiltered = [];
var _fkSkills = null;
var _fkUrls = null;
var _fkDocs = null;
var _fkMemory = null;

var _folderSkills = null;
var _folderUrls = null;
var _folderDocs = null;
var _folderMemory = null;

var _viewMode = localStorage.getItem('kv-view') || 'grid';

function _initFilters() {
    _fkSkills = FilterKnowledge.create({
        mountEl: document.getElementById('fk-mount-skills'),
        showLabels: true,
        onChange: function () { _applySkillFilter(); },
    });
    _fkUrls = FilterKnowledge.create({
        mountEl: document.getElementById('fk-mount-urls'),
        onChange: function (f) { KnowledgeUrls.setQuery(f.query); },
    });
    _fkDocs = FilterKnowledge.create({
        mountEl: document.getElementById('fk-mount-docs'),
        onChange: function (f) { KnowledgeDocs.setQuery(f.query); },
    });
    _fkMemory = FilterKnowledge.create({
        mountEl: document.getElementById('fk-mount-memory'),
        onChange: function (f) { KnowledgeMemory.setQuery(f.query); },
    });
}

async function init() {
    await window.requireAuth();
    renderNav('nav-root', 'knowledge');
    try {
        var me = await api.get('/api/auth/me');
        window.__ME__ = me.username || null;
        window.__WS_IS_TEAM__ = false; // siempre personal tras eliminar workspace switching
    } catch (e) { /* deja los botones fork/link-a-personal ocultos si falla */ }
    _initCatalog();
    _initFolders();
    _bindTabs();
    _initViewToggle();
    _initFilters();
    await loadSkills();
    bindEvents();
    KnowledgeUrls.init();
    KnowledgeDocs.init();
    KnowledgeMemory.init();
    _setupDragHandlers();
}

function _setupDragHandlers() {
    ['skills-grid', 'urls-grid', 'docs-grid', 'mem-grid'].forEach(function (gridId) {
        var grid = document.getElementById(gridId);
        if (!grid) return;
        grid.addEventListener('dragstart', function (e) {
            var card = e.target.closest('[data-drag-id]');
            if (!card) return;
            window._kDrag = { id: card.dataset.dragId, section: card.dataset.dragSection };
            card.classList.add('kd-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        grid.addEventListener('dragend', function (e) {
            var card = e.target.closest('[data-drag-id]');
            if (card) card.classList.remove('kd-dragging');
            window._kDrag = null;
        });
    });
}

function _initCatalog() {
    SkillCatalog.init({
        onImport: function (skill) {
            var folderId = _folderSkills ? _folderSkills.getActive() : null;
            DialogSkill.open(
                { name: skill.name, description: skill.description, icon: skill.icon, category: skill.category, content: skill.content, folder_id: folderId || undefined },
                loadSkills
            );
        },
    });
}

var _SVG_FOLDER_KN = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
    '<path d="M1.5 4.5A1 1 0 012.5 3.5h3.27l1.46 1.5H13.5A1 1 0 0114.5 6v6a1 1 0 01-1 1h-11a1 1 0 01-1-1V4.5z"' +
    ' stroke="currentColor" stroke-width="1.4" fill="none"/></svg>';

var _activeGroupKnId = null;
var _groupPanelInstances = [];

function _onKnGroupSelect(groupId) {
    _activeGroupKnId = groupId || null;
    // Sincronizar selección en todos los paneles de grupos sin relanzar callbacks
    _groupPanelInstances.forEach(function (gp) { gp.syncActive(_activeGroupKnId); });
    // Recargar pestaña activa con el grupo
    if (_activeTab === 'skills') loadSkills(null, _activeGroupKnId);
    else if (_activeTab === 'urls') KnowledgeUrls.load(null, _activeGroupKnId);
    else if (_activeTab === 'documents') KnowledgeDocs.load(null, _activeGroupKnId);
    else if (_activeTab === 'memory') KnowledgeMemory.load(null, _activeGroupKnId);
}

function _initFolders() {
    _folderSkills = KnowledgeFolders('skill', function (folderId) { loadSkills(folderId); });
    _folderUrls   = KnowledgeFolders('url', function (folderId) { KnowledgeUrls.load(folderId); });
    _folderDocs   = KnowledgeFolders('document', function (folderId) { KnowledgeDocs.load(folderId); });
    _folderMemory = KnowledgeFolders('memory', function (folderId) { KnowledgeMemory.load(folderId); });

    _folderSkills.mount(document.getElementById('kf-panel-skill'));
    _folderUrls.mount(document.getElementById('kf-panel-url'));
    _folderDocs.mount(document.getElementById('kf-panel-document'));
    _folderMemory.mount(document.getElementById('kf-panel-memory'));

    window._folderSkills = _folderSkills;
    window._folderUrls   = _folderUrls;
    window._folderDocs   = _folderDocs;
    window._folderMemory = _folderMemory;

    _folderSkills.load();
    _folderUrls.load();
    _folderDocs.load();
    _folderMemory.load();

    // ── Paneles de grupos (uno por tab) ─────────────────────────────────────
    var _kgSections = ['skill', 'url', 'document', 'memory'];
    _kgSections.forEach(function (sec) {
        var panelEl = document.getElementById('kg-panel-' + sec);
        if (!panelEl || !window.GroupPanel) return;
        var gp = GroupPanel(sec, _onKnGroupSelect);
        gp.mount(panelEl);
        gp.load();
        _groupPanelInstances.push(gp);
    });

    // ── Toggles para folders (inyectar icono + exclusión mutua) ─────────────
    var _folderVisible = localStorage.getItem('gaia-folders-knowledge') !== 'false';
    var _groupsVisible = false;

    function _applyKnPanels() {
        var kfPanels = ['kf-panel-skill', 'kf-panel-url', 'kf-panel-document', 'kf-panel-memory'];
        var kgPanels = ['kg-panel-skill', 'kg-panel-url', 'kg-panel-document', 'kg-panel-memory'];
        kfPanels.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.classList.toggle('folder-panel--collapsed', !_folderVisible);
        });
        kgPanels.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.classList.toggle('folder-panel--collapsed', !_groupsVisible);
        });
        document.querySelectorAll('.kf-toggle-btn').forEach(function (btn) {
            btn.innerHTML = _SVG_FOLDER_KN;
            btn.classList.toggle('folder-toggle-btn--on', _folderVisible);
            btn.title = _folderVisible ? 'Ocultar carpetas' : 'Mostrar carpetas';
        });
        document.querySelectorAll('.kg-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('folder-toggle-btn--on', _groupsVisible);
            btn.title = _groupsVisible ? 'Ocultar grupos' : 'Grupos de trabajo';
        });
    }

    document.querySelectorAll('.kf-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            _folderVisible = !_folderVisible;
            if (_folderVisible) _groupsVisible = false;
            localStorage.setItem('gaia-folders-knowledge', String(_folderVisible));
            _applyKnPanels();
        });
    });

    document.querySelectorAll('.kg-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            _groupsVisible = !_groupsVisible;
            if (_groupsVisible) _folderVisible = false;
            localStorage.setItem('gaia-folders-knowledge', String(_folderVisible));
            _applyKnPanels();
        });
    });

    _applyKnPanels();
}

function _bindTabs() {
    document.getElementById('knowledge-tabs').addEventListener('click', function (e) {
        var btn = e.target.closest('.ktab');
        if (!btn) return;
        _switchTab(btn.dataset.tab);
    });
}

function _switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.ktab').forEach(function (b) {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
        p.style.display = 'none';
    });
    var panel = document.getElementById('tab-' + tab);
    if (panel) panel.style.display = '';

    document.getElementById('skills-actions').style.display = tab === 'skills' ? '' : 'none';
    document.getElementById('urls-actions').style.display = tab === 'urls' ? '' : 'none';
    document.getElementById('docs-actions').style.display = tab === 'documents' ? '' : 'none';
    document.getElementById('memory-actions').style.display = tab === 'memory' ? '' : 'none';

    if (tab === 'urls') KnowledgeUrls.load(_folderUrls ? _folderUrls.getActive() : null);
    if (tab === 'documents') KnowledgeDocs.load(_folderDocs ? _folderDocs.getActive() : null);
    if (tab === 'memory') KnowledgeMemory.load(_folderMemory ? _folderMemory.getActive() : null);
}

function _applyView() {
    var controls = document.getElementById('kv-view-controls');
    if (controls) {
        controls.querySelectorAll('.kv-toggle').forEach(function (btn) {
            btn.classList.toggle('kv-toggle--active', btn.dataset.view === _viewMode);
        });
    }
    var isList = _viewMode === 'list';
    var urlsGrid = document.getElementById('urls-grid');
    var docsGrid = document.getElementById('docs-grid');
    var skillsGrid = document.getElementById('skills-grid');
    if (urlsGrid) urlsGrid.classList.toggle('knowledge-grid--list', isList);
    if (docsGrid) docsGrid.classList.toggle('knowledge-grid--list', isList);
    if (skillsGrid) skillsGrid.classList.toggle('skills-grid--list', isList);
}

function _initViewToggle() {
    _applyView();
    var controls = document.getElementById('kv-view-controls');
    if (!controls) return;
    controls.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-view]');
        if (!btn || btn.dataset.view === _viewMode) return;
        _viewMode = btn.dataset.view;
        localStorage.setItem('kv-view', _viewMode);
        _applyView();
    });
}

async function loadSkills(folderId, groupId) {
    _activeFolderIdSkill = folderId || null;
    var groupParam = groupId ? '&group_id=' + encodeURIComponent(groupId) : '';
    // Las tres peticiones en paralelo: private skills, public skills y datos sociales
    var results = await Promise.all([
        api.get('/api/skills?scope=private' + groupParam),
        groupId ? Promise.resolve([]) : api.get('/api/skills?scope=public'),
        api.get('/api/social/me/resources?type=skill').catch(function () { return { resources: [] }; }),
    ]);
    _privateSkills = results[0];
    // Merge social data (stars, verified) into private skills
    try {
        var socialMap = {};
        ((results[2] || {}).resources || []).forEach(function (r) { socialMap[r.resource_id] = r; });
        _privateSkills = _privateSkills.map(function (s) {
            var soc = socialMap[s.id];
            return soc ? Object.assign({}, s, {
                _social_public: !!soc.is_public,
                _social_stars: soc.stars_count || 0,
                _social_verified: !!(soc.verified),
            }) : s;
        });
    } catch (err) { console.error('[knowledge] Error cargando datos sociales de skills:', err); }
    SkillCatalog.setSkills(results[1].concat(_privateSkills.filter(function (s) { return s._shared; })));
    _applySkillFilter();
    if (_folderSkills) _folderSkills.updateStats(_privateSkills.filter(function (s) { return !s._shared; }));
}

function _renderSkillsPage() {
    var grid = document.getElementById('skills-grid');
    if (!grid) return;
    var ps = getPageSize();
    var shown = _skillsPage * ps;
    SkillCard.renderAll(_lastSkillsFiltered.slice(0, shown), grid, { showMove: true });
    renderLoadMore(grid, _lastSkillsFiltered.length, shown, function () { _skillsPage++; _renderSkillsPage(); });
}

var _activeFolderIdSkill = null;

function _applySkillFilter() {
    var f = _fkSkills ? _fkSkills.getFilter() : { query: '', labels: [] };
    var q = (f.query || '').toLowerCase();
    _lastSkillsFiltered = _privateSkills.filter(function (s) {
        if (s._shared) return false;
        if (_activeFolderIdSkill !== null && s.folder_id !== _activeFolderIdSkill) return false;
        if (f.labels.length && !f.labels.some(function (lbl) {
            return (s.labels || ['private']).indexOf(lbl) !== -1;
        })) return false;
        if (q && (s.name || '').toLowerCase().indexOf(q) === -1) return false;
        return true;
    });
    _skillsPage = 1;
    _renderSkillsPage();
}

var _skillViewScope = 'private';
var _skillViewId = '';
var _skillViewLabels = ['private'];

async function viewSkill(scope, id) {
    _skillViewScope = scope;
    _skillViewId = id;
    try {
        var s = await api.get('/api/skills/' + scope + '/' + encodeURIComponent(id));
        document.getElementById('skill-view-title').textContent = s.name;
        document.getElementById('skill-view-content').textContent = s.content || t('skills.no_content');
        // Labels picker
        _skillViewLabels = s.labels && s.labels.length ? s.labels.slice() : ['private'];
        var lpWrap = document.getElementById('skill-labels-picker-wrap');
        if (lpWrap && window.LABELS) {
            lpWrap.innerHTML = LABELS.renderPicker(_skillViewLabels, 'skill-labels-picker');
            LABELS.bindPicker('skill-labels-picker', _skillViewLabels, function (newLabels) {
                _skillViewLabels = newLabels;
                var isPublic = newLabels.indexOf('public') !== -1;
                var pubCb2 = document.getElementById('skill-social-public');
                var opts2 = document.getElementById('skill-social-opts');
                if (pubCb2) pubCb2.checked = isPublic;
                if (opts2) opts2.style.display = isPublic ? '' : 'none';
            });
        }
        // Pre-fill visibility
        var pubCb = document.getElementById('skill-social-public');
        var opts = document.getElementById('skill-social-opts');
        if (pubCb) {
            pubCb.checked = _skillViewLabels.indexOf('public') !== -1;
            if (opts) opts.style.display = pubCb.checked ? '' : 'none';
            api.get('/api/social/me/resources?type=skill').then(function (data) {
                var row = (data.resources || []).find(function (r) { return r.resource_id === id; });
                if (!row) return;
                pubCb.checked = !!row.is_public;
                if (opts) opts.style.display = row.is_public ? '' : 'none';
                var catEl = document.getElementById('skill-social-category');
                if (catEl && row.category) catEl.value = row.category;
            }).catch(function () { });
        }
        document.getElementById('skill-view-modal').style.display = 'flex';
    } catch (e) { toast(e.message, 'error'); }
}

var _K_SVG_GRID = '<svg width="15" height="15" viewBox="0 0 15 15" fill="none">'
    + '<rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/>'
    + '</svg>';
var _K_SVG_UPLOAD = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
    + '<path d="M6.5 8.5V1M3 4L6.5 1 10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M1 10.5v1a.5.5 0 00.5.5h10a.5.5 0 00.5-.5v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
var _K_SVG_PLUS = '<svg width="15" height="15" viewBox="0 0 13 13" fill="none">'
    + '<path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
var _K_SVG_DOC = '<svg width="15" height="15" viewBox="0 0 15 15" fill="none">'
    + '<path d="M3 2h6l3 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
    + '<path d="M9 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>';
var _K_SVG_FOLDER = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none">'
    + '<path d="M2 13V5a1 1 0 0 1 1-1h3l1.5-2H13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
    + '</svg>';

function bindEvents() {
    document.getElementById('btn-new-skill').addEventListener('click', function () {
        var folderId = _folderSkills ? _folderSkills.getActive() : null;
        ActionMenu.show(this, [
            { icon: _K_SVG_GRID, label: t('skills.page.new_from_catalog'), sub: t('skills.page.new_from_catalog_sub'), steps: 1, onClick: function () { SkillCatalog.open(); } },
            { icon: _K_SVG_UPLOAD, label: t('skills.page.new_from_file'), sub: t('skills.page.new_from_file_sub'), steps: 1, onClick: function () { document.getElementById('skill-file-input').click(); } },
            { icon: _K_SVG_PLUS, label: t('skills.page.new_from_scratch'), sub: t('skills.page.new_from_scratch_sub'), steps: 1, onClick: function () { DialogSkill.open(folderId ? { folder_id: folderId } : null, loadSkills); } },
        ]);
    });

    document.getElementById('btn-new-doc').addEventListener('click', function () {
        ActionMenu.show(this, [
            { icon: _K_SVG_DOC, label: t('skills.knowledge.upload_doc'), sub: t('skills.knowledge.upload_doc_sub'), steps: 1, onClick: function () { document.getElementById('doc-file-input').click(); } },
            { icon: _K_SVG_FOLDER, label: t('skills.knowledge.upload_folder'), sub: t('skills.knowledge.upload_folder_sub'), steps: 1, onClick: function () { document.getElementById('folder-file-input').click(); } },
        ]);
    });

    document.getElementById('skill-file-input').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var skill = _parseAndLoadSkill(ev.target.result);
                DialogSkill.open(skill, loadSkills);
            } catch (err) {
                toast(t('skills.page.load_error', { msg: err.message }), 'error');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('skill-view-close').addEventListener('click', function () {
        document.getElementById('skill-view-modal').style.display = 'none';
    });

    // Skill visibility bindings
    var skillPubCb = document.getElementById('skill-social-public');
    if (skillPubCb) {
        skillPubCb.addEventListener('change', function () {
            var opts = document.getElementById('skill-social-opts');
            if (opts) opts.style.display = this.checked ? '' : 'none';
        });
    }
    var skillVisSaveBtn = document.getElementById('skill-social-save-btn');
    if (skillVisSaveBtn) {
        skillVisSaveBtn.addEventListener('click', async function () {
            if (!_skillViewId) return;
            var isPublic = document.getElementById('skill-social-public').checked;
            var catEl = document.getElementById('skill-social-category');
            skillVisSaveBtn.disabled = true;
            try {
                // Sincronizar label de visibilidad con el toggle
                if (isPublic && _skillViewLabels.indexOf('public') === -1) {
                    _skillViewLabels = window.LABELS ? LABELS.apply(_skillViewLabels, 'public') : _skillViewLabels;
                } else if (!isPublic && _skillViewLabels.indexOf('private') === -1) {
                    _skillViewLabels = window.LABELS ? LABELS.apply(_skillViewLabels, 'private') : _skillViewLabels;
                }
                await api.put('/api/skills/' + encodeURIComponent(_skillViewScope) + '/' + encodeURIComponent(_skillViewId) + '/visibility', {
                    is_public: isPublic,
                    category: catEl ? catEl.value : 'Other',
                    labels: _skillViewLabels,
                });
                toast(t('social.visibility.saved'), 'success');
            } catch (err) { toast(err.message, 'error'); }
            finally { skillVisSaveBtn.disabled = false; }
        });
    }
    document.getElementById('skill-export-close').addEventListener('click', function () {
        document.getElementById('skill-export-modal').style.display = 'none';
    });
    document.getElementById('skill-export-modal').addEventListener('click', function (e) {
        if (e.target === this) this.style.display = 'none';
    });
    document.getElementById('skills-grid').addEventListener('click', async function (e) {
        var moveBtn = e.target.closest('[data-move-id]');
        if (moveBtn) {
            var sk = _privateSkills.find(function (s) { return s.id === moveBtn.dataset.moveId; });
            FolderMoveDialog.open('skill', moveBtn.dataset.moveId, sk ? sk.folder_id : null, function () {
                loadSkills(_folderSkills ? _folderSkills.getActive() : null);
            });
            return;
        }
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var id = btn.dataset.id;
        var scope = btn.dataset.scope;
        if (action === 'edit-skill') {
            try {
                var s = await api.get('/api/skills/private/' + encodeURIComponent(id));
                DialogSkill.open(s, loadSkills);
            } catch (e) { toast(e.message, 'error'); }
        } else if (action === 'del-skill') {
            if (!confirm(t('skills.confirm_delete'))) return;
            try {
                await api.del('/api/skills/private/' + encodeURIComponent(id));
                toast(t('skills.deleted'), 'info');
                await loadSkills(_folderSkills ? _folderSkills.getActive() : null);
            } catch (e) { toast(e.message, 'error'); }
        } else if (action === 'share-skill') {
            if (window.GroupShareDialog) GroupShareDialog.open('skill', id, btn.dataset.name || id);
        } else if (action === 'export-skill') {
            _openSkillExport(scope, id);
        } else if (action === 'fork-skill') {
            btn.disabled = true;
            try {
                var forkRes = await api.post('/api/skills/private/' + encodeURIComponent(id) + '/fork', {});
                toast((window.t ? t('labels.actions.fork_success') : 'Copiado') + ': ' + forkRes.name, 'success');
            } catch (err) {
                toast(window.t ? t('labels.actions.fork_error') : err.message, 'error');
                btn.disabled = false;
            }
        } else if (action === 'link-skill') {
            btn.disabled = true;
            try {
                var linkRes = await api.post('/api/skills/private/' + encodeURIComponent(id) + '/link', {});
                toast((window.t ? t('labels.actions.link_success') : 'Enlazado') + ': ' + linkRes.name, 'success');
                await loadSkills(_folderSkills ? _folderSkills.getActive() : null);
            } catch (err) {
                toast(window.t ? t('labels.actions.link_error') : err.message, 'error');
                btn.disabled = false;
            }
        } else if (action === 'sync-skill') {
            btn.disabled = true;
            try {
                await api.post('/api/skills/private/' + encodeURIComponent(id) + '/sync');
                toast(window.t ? t('labels.actions.sync_success') : 'Sincronizado', 'success');
                await loadSkills(_folderSkills ? _folderSkills.getActive() : null);
            } catch (err) {
                toast(window.t ? t('labels.actions.sync_error') : err.message, 'error');
                btn.disabled = false;
            }
        }
    });

    if (window.i18n) {
        window.i18n.onLangChange(async function () {
            if (_activeTab === 'skills') await loadSkills(_folderSkills ? _folderSkills.getActive() : null);
            else _switchTab(_activeTab);
        });
    }
}

var _skillExportId = null;
var _skillExportScope = null;

function _openSkillExport(scope, id) {
    _skillExportId = id;
    _skillExportScope = scope;

    document.getElementById('skill-export-options').innerHTML = [
        { fmt: 'claude', icon: '&#128992;', label: t('skills.export.claude_label'), sub: t('skills.export.claude_sub'), path: t('skills.export.claude_path') },
        { fmt: 'github', icon: '&#9899;', label: t('skills.export.github_label'), sub: t('skills.export.github_sub'), path: t('skills.export.github_path') },
        { fmt: 'openai', icon: '&#129001;', label: t('skills.export.openai_label'), sub: t('skills.export.openai_sub'), path: t('skills.export.openai_path') },
        { fmt: 'md', icon: '&#128196;', label: t('skills.export.md_label'), sub: t('skills.export.md_sub'), path: t('skills.export.md_path') },
    ].map(function (o) {
        return '<div class="export-opt" data-fmt="' + o.fmt + '">' +
            '<span class="export-opt-icon">' + o.icon + '</span>' +
            '<div>' +
            '<div class="export-opt-label">' + o.label + '</div>' +
            '<div class="export-opt-sub">' + o.sub + '</div>' +
            '<div class="export-opt-path">' + o.path + '</div>' +
            '</div></div>';
    }).join('');

    document.querySelectorAll('#skill-export-options .export-opt').forEach(function (el) {
        el.addEventListener('click', function () { _doSkillExport(_skillExportScope, _skillExportId, el.dataset.fmt); });
    });

    document.getElementById('skill-export-modal').style.display = '';
}

async function _doSkillExport(scope, id, fmt) {
    try {
        var skill = await api.get('/api/skills/' + scope + '/' + encodeURIComponent(id));
        var name = skill.name || id;
        var slug = skill.id || id;
        var body = skill.content || '';
        var today = new Date().toISOString().slice(0, 10);
        var content, filename, mime;

        if (fmt === 'claude') {
            var lines = ['id: ' + slug, 'name: ' + name];
            if (skill.description) lines.push('description: ' + skill.description);
            if (skill.icon) lines.push('icon: ' + skill.icon);
            if (skill.category) lines.push('category: ' + skill.category);
            lines.push('created_at: "' + (skill.created_at || today) + '"');
            lines.push('updated_at: "' + today + '"');
            content = '---\n' + lines.join('\n') + '\n---\n\n' + body;
            filename = slug + '.md';
            mime = 'text/markdown';
        } else if (fmt === 'github') {
            var header = '# ' + name;
            if (skill.description) header += '\n\n> ' + skill.description;
            content = header + '\n\n' + body;
            filename = slug + '.instructions.md';
            mime = 'text/markdown';
        } else if (fmt === 'openai') {
            var payload = { name: name, instructions: body };
            if (skill.description) payload.description = skill.description;
            content = JSON.stringify(payload, null, 2);
            filename = slug + '.json';
            mime = 'application/json';
        } else { // md
            content = body;
            filename = slug + '.md';
            mime = 'text/markdown';
        }

        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: filename }).click();
        URL.revokeObjectURL(url);
        toast(t('skills.export.exported', { name: filename }) || filename, 'success');
        document.getElementById('skill-export-modal').style.display = 'none';
    } catch (e) { toast(e.message, 'error'); }
}


init();
