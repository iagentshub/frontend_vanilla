// profile-logs.js — visor de logs del sistema (solo admin)
// Características:
//  - Clic en IP o usuario de la tabla → rellena el filtro automáticamente
//  - Filtros rápidos: Solo errores, Errores+avisos, Hoy
//  - Badges de nivel con color + icono
//  - Paginación, exportación CSV, retención configurable
'use strict';

var _logPage = 1;
var _logPageSize = 50;
var _logTotal = 0;

// ── Inicialización ─────────────────────────────────────────────────────────────

function initLogs() {
    _loadRetention();
    _bindLogEvents();
    _loadLogs(1);
}

// ── Lectura de filtros ─────────────────────────────────────────────────────────

function _val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function _getFilters() {
    return {
        ip: _val('log-f-ip') || null,
        username: _val('log-f-username') || null,
        level: _val('log-f-level') || null,
        source: _val('log-f-source') || null,
        date_from: _val('log-f-date-from') || null,
        date_to: _val('log-f-date-to') || null,
        q: _val('log-f-q') || null,
    };
}

function _setFilter(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
}

function _clearAllFilters() {
    ['log-f-ip', 'log-f-username', 'log-f-level', 'log-f-source',
        'log-f-date-from', 'log-f-date-to', 'log-f-q'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
}

function _filtersToQS(filters, page, page_size) {
    var p = new URLSearchParams();
    if (filters.ip) p.append('ip', filters.ip);
    if (filters.username) p.append('username', filters.username);
    if (filters.level) p.append('level', filters.level);
    if (filters.source) p.append('source', filters.source);
    if (filters.date_from) p.append('date_from', filters.date_from);
    if (filters.date_to) p.append('date_to', filters.date_to);
    if (filters.q) p.append('q', filters.q);
    p.append('page', String(page || 1));
    p.append('page_size', String(page_size || _logPageSize));
    return p.toString();
}

// ── Carga y renderizado ────────────────────────────────────────────────────────

async function _loadLogs(page) {
    _logPage = page || 1;
    var filters = _getFilters();
    var qs = _filtersToQS(filters, _logPage, _logPageSize);
    var tbody = document.getElementById('log-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-2)">Cargando\u2026</td></tr>';
    }
    try {
        var data = await api.get('/api/admin/logs?' + qs);
        _logTotal = data.total || 0;
        _renderTable(data.items || []);
        _renderPagination(data.page || 1, data.pages || 0);
        _updateActiveFilterBadge(filters);
    } catch (e) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--danger,#ef4444)">Error al cargar los logs.</td></tr>';
        }
    }
}

// ── Badges de nivel ────────────────────────────────────────────────────────────

var _LEVEL_CFG = {
    DEBUG: { bg: 'rgba(148,163,184,0.15)', color: 'var(--text-2)', icon: '\u25cf', label: 'DEBUG' },
    INFO: { bg: 'rgba(59,130,246,0.12)', color: 'var(--accent)', icon: '\u25cf', label: 'INFO' },
    OK: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', icon: '\u2714', label: 'OK' },
    WARNING: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '\u26a0', label: 'WARNING' },
    ERROR: { bg: 'rgba(239,68,68,0.15)', color: 'var(--danger,#ef4444)', icon: '\u2715', label: 'ERROR' },
};

function _levelBadge(level) {
    var cfg = _LEVEL_CFG[level] || { bg: 'transparent', color: 'var(--text)', icon: '\u25cf', label: level };
    return (
        '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:20px;' +
        'font-size:0.72rem;font-weight:700;background:' + cfg.bg + ';color:' + cfg.color + ';white-space:nowrap">' +
        cfg.icon + '\u00a0' + cfg.label +
        '</span>'
    );
}

function _sourceBadge(source) {
    var isFE = source === 'FE';
    return (
        '<span style="font-size:0.72rem;font-weight:600;padding:2px 6px;border-radius:4px;' +
        'background:' + (isFE ? 'rgba(139,92,246,0.12)' : 'rgba(100,116,139,0.1)') + ';' +
        'color:' + (isFE ? '#a78bfa' : 'var(--text-2)') + '">' +
        (isFE ? 'Frontend' : 'Backend') +
        '</span>'
    );
}

// ── Renderizado de tabla ───────────────────────────────────────────────────────

function _renderTable(items) {
    var tbody = document.getElementById('log-tbody');
    if (!tbody) return;

    var label = document.getElementById('log-total-label');
    if (label) {
        label.textContent = _logTotal.toLocaleString() + ' entradas';
    }

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-2)">Sin resultados con los filtros actuales.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(function (r) {
        var ipVal = _esc(r.ip);
        var userVal = _esc(r.username);
        var isDash = r.ip === '-' || !r.ip;

        // IP clicable (excepto si es '-')
        var ipCell = isDash
            ? '<td style="padding:5px 10px;color:var(--text-2);font-size:0.75rem">' + ipVal + '</td>'
            : '<td style="padding:5px 10px;font-size:0.75rem;cursor:pointer;color:var(--accent)" ' +
            'data-log-ip="' + ipVal + '" title="Filtrar por esta IP: ' + ipVal + '">' + ipVal + '</td>';

        // Usuario clicable (excepto si es '-')
        var isGuestOrDash = r.username === '-' || r.username === 'guest' || !r.username;
        var userCell = '<td style="padding:5px 10px;font-size:0.8rem;' +
            (isGuestOrDash ? 'color:var(--text-2)' : 'cursor:pointer;color:var(--accent)') + '" ' +
            (!isGuestOrDash ? 'data-log-user="' + userVal + '" title="Filtrar por este usuario: ' + userVal + '"' : '') +
            '>' + userVal + '</td>';

        return (
            '<tr style="border-bottom:1px solid var(--border)">' +
            '<td style="padding:5px 10px;white-space:nowrap;color:var(--text-2);font-size:0.78rem">' +
            _esc(r.date) + '<br><span style="font-size:0.72rem;opacity:0.7">' + _esc(r.time) + '</span>' +
            '</td>' +
            '<td style="padding:5px 10px;white-space:nowrap">' + _levelBadge(r.level) + '</td>' +
            ipCell +
            userCell +
            '<td style="padding:5px 10px;white-space:nowrap">' + _sourceBadge(r.source) + '</td>' +
            '<td style="padding:5px 10px;max-width:420px;font-size:0.78rem;word-break:break-all">' + _esc(r.summary) + '</td>' +
            '</tr>'
        );
    }).join('');
}

// Delegación de eventos en la tabla → clic en IP o usuario
function _bindTableClicks() {
    var tbody = document.getElementById('log-tbody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
        var ipCell = e.target.closest('[data-log-ip]');
        var userCell = e.target.closest('[data-log-user]');
        if (ipCell) {
            _setFilter('log-f-ip', ipCell.dataset.logIp);
            _loadLogs(1);
        } else if (userCell) {
            _setFilter('log-f-username', userCell.dataset.logUser);
            _loadLogs(1);
        }
    });
}

// ── Indicador de filtros activos ───────────────────────────────────────────────

function _updateActiveFilterBadge(filters) {
    var active = Object.values(filters).filter(Boolean).length;
    var label = document.getElementById('log-total-label');
    if (!label) return;
    var suffix = active > 0 ? ' \u2014 ' + active + ' filtro' + (active > 1 ? 's' : '') + ' activo' + (active > 1 ? 's' : '') : '';
    label.textContent = _logTotal.toLocaleString() + ' entradas' + suffix;
}

// ── Paginación ─────────────────────────────────────────────────────────────────

function _renderPagination(page, pages) {
    var el = document.getElementById('log-pagination');
    if (!el) return;
    if (!pages || pages <= 1) { el.innerHTML = ''; return; }

    var prevDis = page <= 1 ? 'disabled' : '';
    var nextDis = page >= pages ? 'disabled' : '';
    el.innerHTML =
        '<button class="btn btn-ghost btn-sm" ' + prevDis + ' id="log-btn-prev">\u2190 Anterior</button>' +
        '<span style="color:var(--text-2);font-size:0.82rem">P\u00e1gina ' + page + ' de ' + pages + '</span>' +
        '<button class="btn btn-ghost btn-sm" ' + nextDis + ' id="log-btn-next">Siguiente \u2192</button>';

    var btnPrev = document.getElementById('log-btn-prev');
    var btnNext = document.getElementById('log-btn-next');
    if (btnPrev) btnPrev.addEventListener('click', function () { _loadLogs(_logPage - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { _loadLogs(_logPage + 1); });
}

// ── Exportar CSV ───────────────────────────────────────────────────────────────

async function _exportLogs() {
    var filters = _getFilters();
    var qs = _filtersToQS(filters, 1, 100000);
    try {
        var resp = await fetch('/api/admin/logs/export?' + qs, { credentials: 'include' });
        if (!resp.ok) throw new Error(String(resp.status));
        var blob = await resp.blob();
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'logs_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        if (typeof window.showToast === 'function') window.showToast('Error al exportar', 'error');
    }
}

// ── Retención ──────────────────────────────────────────────────────────────────

async function _loadRetention() {
    try {
        var data = await api.get('/api/settings/admin');
        var input = document.getElementById('log-retention-input');
        if (input && data.log_retention_days) input.value = data.log_retention_days;
    } catch (e) { }
}

async function _saveRetention() {
    var input = document.getElementById('log-retention-input');
    if (!input) return;
    var days = parseInt(input.value, 10);
    if (isNaN(days) || days < 1 || days > 365) {
        if (typeof window.showToast === 'function') window.showToast('Valor entre 1 y 365 d\u00edas', 'error');
        return;
    }
    try {
        await api.put('/api/settings/admin', { log_retention_days: days });
        if (typeof window.showToast === 'function') window.showToast('Retenci\u00f3n guardada', 'ok');
    } catch (e) {
        if (typeof window.showToast === 'function') window.showToast('Error al guardar', 'error');
    }
}

// ── Filtros rápidos ────────────────────────────────────────────────────────────

function _applyQuickFilter(preset) {
    _clearAllFilters();
    if (preset === 'errors') {
        _setFilter('log-f-level', 'ERROR');
    } else if (preset === 'warnings') {
        // WARNING + ERROR → no hay opción combinada, usamos "WARNING" y la tabla mostrará
        // en realidad queremos WARNING o ERROR; la API solo soporta nivel exacto,
        // así que dejamos nivel vacío pero buscamos en q para orientar al usuario
        _setFilter('log-f-level', 'WARNING');
    } else if (preset === 'today') {
        var today = new Date().toISOString().slice(0, 10);
        _setFilter('log-f-date-from', today);
        _setFilter('log-f-date-to', today);
    }
    _loadLogs(1);
}

// ── Binding de eventos ─────────────────────────────────────────────────────────

function _bindLogEvents() {
    // Botón filtrar
    var btnFilter = document.getElementById('log-btn-filter');
    if (btnFilter) btnFilter.addEventListener('click', function () { _loadLogs(1); });

    // Botón limpiar
    var btnClear = document.getElementById('log-btn-clear');
    if (btnClear) btnClear.addEventListener('click', function () { _clearAllFilters(); _loadLogs(1); });

    // Botón limpiar (quick)
    var btnQClear = document.getElementById('log-quick-clear');
    if (btnQClear) btnQClear.addEventListener('click', function () { _clearAllFilters(); _loadLogs(1); });

    // Exportar
    var btnExport = document.getElementById('log-btn-export');
    if (btnExport) btnExport.addEventListener('click', _exportLogs);

    // Retención
    var btnRetention = document.getElementById('log-retention-save');
    if (btnRetention) btnRetention.addEventListener('click', _saveRetention);

    // Filtros rápidos
    var btnErrors = document.getElementById('log-quick-errors');
    var btnWarnings = document.getElementById('log-quick-warnings');
    var btnToday = document.getElementById('log-quick-today');
    if (btnErrors) btnErrors.addEventListener('click', function () { _applyQuickFilter('errors'); });
    if (btnWarnings) btnWarnings.addEventListener('click', function () { _applyQuickFilter('warnings'); });
    if (btnToday) btnToday.addEventListener('click', function () { _applyQuickFilter('today'); });

    // Enter en campos de texto
    ['log-f-ip', 'log-f-username', 'log-f-q'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') _loadLogs(1); });
    });

    // Clic en tabla (delegación)
    _bindTableClicks();
}

// ── Utilidades ─────────────────────────────────────────────────────────────────

function _esc(str) {
    if (str === null || str === undefined) return '-';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.initLogs = initLogs;
