// dashboard.js — orquestador del dashboard personalizable
'use strict';

// ── Icons ─────────────────────────────────────────────────────────────────────
var _SVG_DRAG  = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4.5" cy="3.5" r="1" fill="currentColor"/><circle cx="9.5" cy="3.5" r="1" fill="currentColor"/><circle cx="4.5" cy="7" r="1" fill="currentColor"/><circle cx="9.5" cy="7" r="1" fill="currentColor"/><circle cx="4.5" cy="10.5" r="1" fill="currentColor"/><circle cx="9.5" cy="10.5" r="1" fill="currentColor"/></svg>';
var _SVG_CLOSE = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
var _SVG_GEAR  = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M12.8 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

// ── State ─────────────────────────────────────────────────────────────────────
var _WIDGETS        = {};
var _DEFAULT_LAYOUT = ['summary', 'token-usage', 'conn-status', 'recent'];
var _layout         = null;
var _config         = {};
var _editMode       = false;
var _data           = null;
var _saveLayoutTimer = null;
var _saveConfigTimer = null;
var _dragId         = null;
var _dragOverId     = null;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    renderNav('nav-root', 'dashboard');
    await window.requireAuth();

    _WIDGETS = window._WIDGET_REGISTRY || {};

    var _noop = function () { return []; };
    var _noopCfg = function () { return { layout: null }; };
    var _noopWidgetCfg = function () { return { config: {} }; };

    var results = await Promise.all([
        api.get('/api/agents?scope=private').catch(_noop),
        api.get('/api/connections').catch(_noop),
        api.get('/api/skills?scope=private').catch(_noop),
        api.get('/api/memory').catch(_noop),
        api.get('/api/knowledge').catch(_noop),
        api.get('/api/connections/tokens-daily?days=30').catch(_noop),
        api.get('/api/settings/dashboard-layout').catch(_noopCfg),
        api.get('/api/settings/dashboard-config').catch(_noopWidgetCfg),
    ]);

    _data = {
        agents:      results[0],
        connections: results[1],
        skills:      results[2],
        memories:    results[3],
        knowledge:   results[4],
        tokenDaily:  results[5],
    };

    // migrate legacy token-bars / token-donut ids
    var savedLayout = results[6] && results[6].layout;
    if (Array.isArray(savedLayout)) {
        savedLayout = savedLayout
            .map(function (w) {
                if (w === 'token-bars' || w === 'token-donut') return 'token-usage';
                if (w === 'composition') return 'conn-status';
                return w;
            })
            .filter(function (w, i, a) { return a.indexOf(w) === i; });
    }
    _layout = (Array.isArray(savedLayout) && savedLayout.length) ? savedLayout : _DEFAULT_LAYOUT.slice();

    _config = (results[7] && results[7].config) ? results[7].config : {};
    Object.keys(_WIDGETS).forEach(function (wid) {
        if (!_config[wid] && _WIDGETS[wid].defaultConfig) {
            _config[wid] = Object.assign({}, _WIDGETS[wid].defaultConfig);
        }
    });

    _bindEditBtn();
    _renderGrid();
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function _renderGrid() {
    var grid = document.getElementById('dash-grid');
    if (!grid) return;

    var validLayout = _layout.filter(function (wid) { return !!_WIDGETS[wid]; });

    grid.innerHTML = validLayout.map(function (wid) {
        var w   = _WIDGETS[wid];
        var cls = 'dash-panel ' + _panelSizeClass(wid) + (_editMode ? ' dash-panel--edit' : '');

        var editBar = _editMode
            ? '<div class="dash-editbar" data-no-drag="1">' +
              '<span class="dash-drag-handle">' + _SVG_DRAG + '</span>' +
              '<span class="dash-editbar-title">' + esc(w.title) + '</span>' +
              '<div class="dash-editbar-actions">' +
              '<button class="dash-config-btn" data-config="' + esc(wid) + '" title="Configurar">' + _SVG_GEAR + '</button>' +
              '<button class="dash-remove-btn" data-remove="' + esc(wid) + '" title="Quitar">' + _SVG_CLOSE + '</button>' +
              '</div></div>'
            : '';

        return '<div class="' + cls + '" data-widget="' + esc(wid) + '"' +
               (_editMode ? ' draggable="true"' : '') + '>' +
               editBar +
               '<div class="dash-panel-title">' + esc(w.title) + '</div>' +
               '<div class="dash-panel-body" data-body="' + esc(wid) + '"></div>' +
               '</div>';
    }).join('');

    validLayout.forEach(function (wid) {
        var el = grid.querySelector('[data-body="' + wid + '"]');
        if (el && _WIDGETS[wid] && _data) {
            var cfg = _config[wid] || Object.assign({}, _WIDGETS[wid].defaultConfig || {});
            _WIDGETS[wid].render(_data, cfg, el);
        }
    });

    if (_editMode) {
        _bindDrag(grid);
        _bindConfigBtns(grid);
    }
}

// ── Edit mode ─────────────────────────────────────────────────────────────────
function _bindEditBtn() {
    var headerBtn = document.getElementById('btn-edit-dashboard');
    var doneBtn   = document.getElementById('btn-done-editing');
    var addBtn    = document.getElementById('btn-add-widget');
    if (headerBtn) headerBtn.addEventListener('click', function () { _setEditMode(true); });
    if (doneBtn)   doneBtn.addEventListener('click',   function () { _setEditMode(false); });
    if (addBtn)    addBtn.addEventListener('click',    function () { _toggleAddSheet(); });
}

function _toggleAddSheet() {
    var sidebar = document.getElementById('dash-edit-sidebar');
    if (!sidebar) return;
    var open = sidebar.classList.toggle('des-expanded');
    document.body.classList.toggle('des-sheet-open', open);
}

function _setEditMode(on) {
    _editMode  = on;
    var nav       = document.getElementById('nav-root');
    var sidebar   = document.getElementById('dash-edit-sidebar');
    var headerBtn = document.getElementById('btn-edit-dashboard');

    if (nav)       { nav.style.display       = on ? 'none' : '';  nav.setAttribute('aria-hidden', on ? 'true' : 'false'); }
    if (sidebar)   { sidebar.style.display   = on ? 'flex' : 'none'; sidebar.setAttribute('aria-hidden', on ? 'false' : 'true'); }
    if (headerBtn) { headerBtn.style.display = on ? 'none' : ''; }

    if (!on && sidebar) {
        sidebar.classList.remove('des-expanded');
        document.body.classList.remove('des-sheet-open');
    }

    document.body.classList.toggle('dash-editing', on);

    if (on) _fillSidebar();
    _renderGrid();
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function _fillSidebar() {
    var list   = document.getElementById('des-widget-list');
    var addBtn = document.getElementById('btn-add-widget');
    if (!list) return;

    var available = Object.keys(_WIDGETS).filter(function (wid) { return _layout.indexOf(wid) === -1; });

    // Mostrar/ocultar el botón "Añadir" según haya disponibles
    if (addBtn) addBtn.style.display = available.length ? '' : 'none';

    // Si ya no hay disponibles, colapsar el sheet en móvil
    if (!available.length) {
        var sidebar = document.getElementById('dash-edit-sidebar');
        if (sidebar) sidebar.classList.remove('des-expanded');
        document.body.classList.remove('des-sheet-open');
        list.innerHTML = '<p class="des-empty">Todos los paneles estan en el dashboard.<br>Usa × en un panel para quitarlo.</p>';
        return;
    }

    list.innerHTML = available.map(function (wid) {
        var w = _WIDGETS[wid];
        return '<div class="des-item" data-des-add="' + esc(wid) + '">' +
               '<div class="des-item-header">' +
               '<span class="des-item-title">' + esc(w.title) + '</span>' +
               '<span class="des-item-size">' + (w.cols >= 4 ? 'Grande' : w.cols === 1 ? 'Pequeno' : 'Mediano') + '</span>' +
               '</div>' +
               (w.preview ? '<div class="des-item-preview">' + w.preview + '</div>' : '') +
               '</div>';
    }).join('');

    list.onclick = function (e) {
        var item = e.target.closest('[data-des-add]');
        if (!item) return;
        var wid = item.getAttribute('data-des-add');
        _layout.push(wid);
        _fillSidebar();
        _renderGrid();
        _saveLayout();
    };
}

// ── Card flip: configuracion ──────────────────────────────────────────────────
function _bindConfigBtns(grid) {
    grid.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-config]');
        if (!btn) return;
        e.stopPropagation();
        var wid = btn.getAttribute('data-config');
        var panelEl = grid.querySelector('[data-widget="' + wid + '"]');
        if (panelEl) _flipToConfig(panelEl, wid);
    });
}

function _flipToConfig(panelEl, wid) {
    var w = _WIDGETS[wid];
    if (!w) return;

    if (w._configHTMLCache) {
        _doFlip(panelEl, wid, w._configHTMLCache);
        return;
    }

    fetch('/dashboard/widgets/' + wid + '/widget.html')
        .then(function (r) { return r.ok ? r.text() : ''; })
        .catch(function () { return ''; })
        .then(function (html) {
            w._configHTMLCache = html ||
                '<div class="wcfg-body"><p class="wcfg-desc">Sin opciones de configuracion.</p>' +
                '<div class="wcfg-actions"><button class="btn btn-ghost btn-sm" data-wcfg-cancel>Volver</button></div></div>';
            _doFlip(panelEl, wid, w._configHTMLCache);
        });
}

function _doFlip(panelEl, wid, configHTML) {
    _animateFlip(panelEl, function () {
        var bodyEl  = panelEl.querySelector('.dash-panel-body');
        var titleEl = panelEl.querySelector('.dash-panel-title');
        var editBar = panelEl.querySelector('.dash-editbar');

        if (bodyEl)  bodyEl.innerHTML = configHTML;
        if (titleEl) titleEl.style.display = 'none';
        if (editBar) editBar.style.display  = 'none';
        panelEl.setAttribute('data-flipped', 'true');

        var cfg = _config[wid] || Object.assign({}, _WIDGETS[wid] && _WIDGETS[wid].defaultConfig || {});
        _populateForm(panelEl, cfg);
        _bindFormActions(panelEl, wid);
    });
}

function _flipBack(panelEl, wid) {
    _animateFlip(panelEl, function () {
        panelEl.removeAttribute('data-flipped');
        var bodyEl  = panelEl.querySelector('.dash-panel-body');
        var titleEl = panelEl.querySelector('.dash-panel-title');
        var editBar = panelEl.querySelector('.dash-editbar');

        if (titleEl) titleEl.style.display = '';
        if (editBar) editBar.style.display  = '';
        if (bodyEl) {
            bodyEl.innerHTML = '';
            var cfg = _config[wid] || Object.assign({}, _WIDGETS[wid] && _WIDGETS[wid].defaultConfig || {});
            if (_WIDGETS[wid] && _data) _WIDGETS[wid].render(_data, cfg, bodyEl);
        }
    });
}

function _animateFlip(el, midCallback) {
    el.classList.add('dash-flipping-out');
    setTimeout(function () {
        midCallback();
        el.classList.remove('dash-flipping-out');
        el.classList.add('dash-flipping-in');
        setTimeout(function () { el.classList.remove('dash-flipping-in'); }, 180);
    }, 180);
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function _populateForm(container, cfg) {
    container.querySelectorAll('input[type="radio"]').forEach(function (el) {
        el.checked = cfg[el.name] !== undefined && String(cfg[el.name]) === el.value;
    });
    container.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
        var v = cfg[el.name];
        el.checked = Array.isArray(v) ? v.indexOf(el.value) !== -1 : !!v;
    });
    container.querySelectorAll('select').forEach(function (sel) {
        if (cfg[sel.name] !== undefined) sel.value = String(cfg[sel.name]);
    });
    container.querySelectorAll('input[type="text"], input[type="number"]').forEach(function (el) {
        if (cfg[el.name] !== undefined) el.value = cfg[el.name];
    });
}

function _readForm(container) {
    var cfg = {};
    var seenRadio = {};
    container.querySelectorAll('input[type="radio"]').forEach(function (el) {
        if (!seenRadio[el.name]) { seenRadio[el.name] = true; cfg[el.name] = null; }
        if (el.checked) cfg[el.name] = el.value;
    });
    var seenCheck = {};
    container.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
        if (!seenCheck[el.name]) { seenCheck[el.name] = true; cfg[el.name] = []; }
        if (el.checked) cfg[el.name].push(el.value);
    });
    container.querySelectorAll('select').forEach(function (sel) {
        var v = sel.value;
        cfg[sel.name] = (!isNaN(v) && v !== '') ? Number(v) : v;
    });
    return cfg;
}

function _panelSizeClass(wid) {
    var size = _config[wid] && _config[wid].size;
    var cols = size === 'small' ? 1
             : size === 'medium' ? 2
             : size === 'large'  ? 4
             : (_WIDGETS[wid] && _WIDGETS[wid].cols) || 4;
    return cols >= 4 ? 'dash-panel--full' : cols === 1 ? 'dash-panel--small' : 'dash-panel--medium';
}

function _bindFormActions(panelEl, wid) {
    var saveBtn   = panelEl.querySelector('[data-wcfg-save]');
    var cancelBtn = panelEl.querySelector('[data-wcfg-cancel]');

    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            var values = _readForm(panelEl);
            _config[wid] = Object.assign({}, _WIDGETS[wid] && _WIDGETS[wid].defaultConfig || {}, _config[wid] || {}, values);
            panelEl.classList.remove('dash-panel--small', 'dash-panel--medium', 'dash-panel--full');
            panelEl.classList.add(_panelSizeClass(wid));
            _flipBack(panelEl, wid);
            _saveConfig();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () { _flipBack(panelEl, wid); });
    }
}

// ── Drag-and-drop ─────────────────────────────────────────────────────────────
function _bindDrag(grid) {
    var panels = grid.querySelectorAll('[data-widget]');

    panels.forEach(function (panel) {
        var wid = panel.getAttribute('data-widget');

        panel.addEventListener('dragstart', function (e) {
            if (panel.getAttribute('data-flipped')) { e.preventDefault(); return; }
            _dragId = wid;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(function () { panel.classList.add('dash-dragging'); }, 0);
        });

        panel.addEventListener('dragend', function () {
            _dragId = null;
            _dragOverId = null;
            panel.classList.remove('dash-dragging');
            grid.querySelectorAll('.dash-drag-over').forEach(function (el) { el.classList.remove('dash-drag-over'); });
        });

        panel.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (wid === _dragId) return;
            if (_dragOverId !== wid) {
                grid.querySelectorAll('.dash-drag-over').forEach(function (el) { el.classList.remove('dash-drag-over'); });
                panel.classList.add('dash-drag-over');
                _dragOverId = wid;
            }
        });

        panel.addEventListener('dragleave', function (e) {
            if (!panel.contains(e.relatedTarget)) {
                panel.classList.remove('dash-drag-over');
                if (_dragOverId === wid) _dragOverId = null;
            }
        });

        panel.addEventListener('drop', function (e) {
            e.preventDefault();
            panel.classList.remove('dash-drag-over');
            if (!_dragId || _dragId === wid) return;
            var srcIdx = _layout.indexOf(_dragId);
            var dstIdx = _layout.indexOf(wid);
            if (srcIdx === -1 || dstIdx === -1) return;
            _layout.splice(srcIdx, 1);
            if (srcIdx < dstIdx) dstIdx--;
            _layout.splice(dstIdx, 0, _dragId);
            _renderGrid();
            _saveLayout();
        });
    });

    grid.addEventListener('click', function (e) {
        var removeBtn = e.target.closest('[data-remove]');
        if (!removeBtn) return;
        var wid = removeBtn.getAttribute('data-remove');
        _layout = _layout.filter(function (id) { return id !== wid; });
        _fillSidebar();
        _renderGrid();
        _saveLayout();
    });
}

// ── Persistence ───────────────────────────────────────────────────────────────
function _saveLayout() {
    clearTimeout(_saveLayoutTimer);
    _saveLayoutTimer = setTimeout(function () {
        api.put('/api/settings/dashboard-layout', { layout: _layout }).catch(function () {});
    }, 400);
}

function _saveConfig() {
    clearTimeout(_saveConfigTimer);
    _saveConfigTimer = setTimeout(function () {
        api.put('/api/settings/dashboard-config', { config: _config }).catch(function () {});
    }, 400);
}

init();
