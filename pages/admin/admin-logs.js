'use strict';
(function () {
    /* ── Estado ── */
    var _date = null;
    var _rawText = '';
    var _lines = [];
    var _level = '';
    var _service = '';
    var _search = '';
    var _timer = null;
    var _loaded = false;
    var _activeTab = 'summary';
    var _sortCol = 'ts';
    var _sortDir = -1;   // -1 = desc (más reciente primero)

    /* ── Helpers ── */
    function _pad(s) { return String(s).padStart(2, '0'); }
    // Fecha en formato YYYY-MM-DD (nuevo) o YYYYMMDD (legado)
    function _fmtDay(raw) {
        if (!raw) return '—';
        if (raw.length === 10) return raw.slice(8, 10) + '/' + raw.slice(5, 7) + '/' + raw.slice(0, 4);
        return raw.slice(6, 8) + '/' + raw.slice(4, 6) + '/' + raw.slice(0, 4);
    }
    function _today() {
        var d = new Date();
        return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
    }
    function _fmtSize(bytes) {
        if (!bytes || isNaN(bytes)) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    function _esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /* ── Parseo ── */
    var _SRC_RE = /^\[([^\]]+)\]\s*/;
    function _parseLine(raw) {
        var parts = raw.split(' - ', 3);
        if (parts.length < 3) return { raw: raw, ts: '', date: '', time: '', level: '', source: '', message: raw };
        var tsStr = parts[0].trim();
        var lvl = parts[1].trim();
        var fullMsg = parts[2];
        var tsp = tsStr.split(' ');
        var m = _SRC_RE.exec(fullMsg);
        return {
            raw: raw,
            ts: tsStr,
            date: tsp[0] || '',
            time: tsp[1] || '',
            level: lvl,
            source: m ? m[1] : 'request',
            message: m ? fullMsg.slice(m[0].length) : fullMsg,
        };
    }

    /* ── Render de tabla ── */
    var _LEVEL_CLS = {
        DEBUG: 'log-level-debug', INFO: 'log-level-info', OK: 'log-level-ok',
        WARNING: 'log-level-warning', ERROR: 'log-level-error',
    };

    function _render() {
        var search = _search.toLowerCase();
        var visible = _lines.filter(function (l) {
            if (_level && l.level !== _level) return false;
            if (_service === 'frontend' && l.source !== 'frontend') return false;
            if (_service === 'backend' && l.source === 'frontend') return false;
            if (search && l.raw.toLowerCase().indexOf(search) === -1) return false;
            return true;
        });

        if (_sortCol) {
            visible.sort(function (a, b) {
                var av = a[_sortCol] || '', bv = b[_sortCol] || '';
                return av < bv ? _sortDir : av > bv ? -_sortDir : 0;
            });
        }

        var tbody = document.getElementById('logs-tbody');
        if (!tbody) return;

        if (!visible.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="logs-td logs-td-empty">' +
                _esc(i18n.t('admin.logs.no_results')) + '</td></tr>';
        } else {
            var rows = visible.map(function (l) {
                var lvlCls = _LEVEL_CLS[l.level] || 'log-level-debug';
                var svcBadge = (l.source === 'frontend' || l.source === 'FE')
                    ? '<span class="log-badge log-badge-fe">FE</span>'
                    : '<span class="log-badge log-badge-be">BE</span>';
                var ip = l.ip || '-';
                var user = l.username || '-';
                return '<tr>' +
                    '<td class="logs-td logs-td-date">' + _esc(l.date) + '</td>' +
                    '<td class="logs-td logs-td-time">' + _esc(l.time) + '</td>' +
                    '<td class="logs-td"><span class="log-level ' + lvlCls + '">' + _esc(l.level) + '</span></td>' +
                    '<td class="logs-td" style="cursor:pointer;color:var(--accent)" data-log-ip="' + _esc(ip) + '" title="Filtrar por IP">' + _esc(ip) + '</td>' +
                    '<td class="logs-td" style="cursor:pointer;color:var(--accent)" data-log-user="' + _esc(user) + '" title="Filtrar por usuario">' + _esc(user) + '</td>' +
                    '<td class="logs-td">' + svcBadge + '</td>' +
                    '<td class="logs-td logs-td-msg">' + _esc(l.message || l.summary || '') + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = rows.join('');
        }

        var cnt = document.getElementById('logs-count');
        if (cnt) cnt.textContent = visible.length + ' / ' + _lines.length;
    }

    /* ── Sort ── */
    function _bindSort() {
        document.querySelectorAll('.logs-th.sortable').forEach(function (th) {
            th.addEventListener('click', function () {
                var col = th.dataset.col;
                if (_sortCol === col) {
                    _sortDir = -_sortDir;
                } else {
                    _sortCol = col;
                    _sortDir = -1;
                }
                document.querySelectorAll('.logs-th').forEach(function (h) {
                    h.classList.remove('sorted');
                    h.dataset.sortDir = '';
                });
                th.classList.add('sorted');
                th.dataset.sortDir = _sortDir === -1 ? 'desc' : 'asc';
                _render();
            });
        });
        // Marca el header inicial
        var initTh = document.querySelector('.logs-th[data-col="ts"]');
        if (initTh) { initTh.classList.add('sorted'); initTh.dataset.sortDir = 'desc'; }
    }

    /* ── Visor: controles ── */
    function _wireViewerSelects() {
        var lvl = document.getElementById('logs-level-select');
        var svc = document.getElementById('logs-service-select');
        var date = document.getElementById('logs-date-select');
        var si = document.getElementById('logs-search');
        var ref = document.getElementById('btn-logs-refresh');
        if (lvl) lvl.onchange = function () { _level = lvl.value; _render(); };
        if (svc) svc.onchange = function () { _service = svc.value; _render(); };
        if (date) date.onchange = function () { loadLog(date.value); };
        if (si) si.addEventListener('input', function () {
            clearTimeout(_timer);
            _timer = setTimeout(function () { _search = si.value; _render(); }, 200);
        });
        if (ref) ref.addEventListener('click', function () { loadSummary(); loadList(); });
    }

    function _setLoading() {
        var tbody = document.getElementById('logs-tbody');
        if (tbody) tbody.innerHTML =
            '<tr><td colspan="7" class="logs-td logs-td-empty">…</td></tr>';
    }

    function loadLog(date) {
        _date = date; _level = ''; _service = ''; _search = '';
        var lvl = document.getElementById('logs-level-select');
        var svc = document.getElementById('logs-service-select');
        var si = document.getElementById('logs-search');
        var sel = document.getElementById('logs-date-select');
        if (lvl) lvl.value = '';
        if (svc) svc.value = '';
        if (si) si.value = '';
        if (sel) sel.value = date;
        _setLoading();

        // Nueva API: query por fecha
        api.get('/api/admin/logs?date_from=' + date + '&date_to=' + date + '&page_size=500')
            .then(function (data) {
                var items = data.items || [];
                _lines = items.map(function (r) {
                    return {
                        raw: r.summary || '',
                        ts: r.date + ' ' + r.time,
                        date: r.date,
                        time: r.time,
                        level: r.level,
                        source: r.source,
                        ip: r.ip || '-',
                        username: r.username || '-',
                        message: r.summary || '',
                    };
                });
                _render();
                var wrap = document.querySelector('.logs-table-wrap');
                if (wrap) wrap.scrollTop = wrap.scrollHeight;
                // CSV download
                var dl = document.getElementById('btn-logs-download');
                if (dl) {
                    var csv = ['Fecha,Hora,Nivel,IP,Usuario,Fuente,Accion']
                        .concat(_lines.map(function (l) {
                            return [l.date, l.time, l.level, l.ip, l.username, l.source,
                            '"' + (l.message || '').replace(/"/g, '""') + '"'].join(',');
                        })).join('\n');
                    dl.style.display = '';
                    dl.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                    dl.download = date + '.csv';
                }
            }).catch(function (e) {
                var tbody = document.getElementById('logs-tbody');
                if (tbody) tbody.innerHTML =
                    '<tr><td colspan="7" class="logs-td logs-td-empty">' +
                    _esc(i18n.t('admin.logs.error_load')) + '</td></tr>';
                flog.error('admin-logs get: ' + (e && e.message ? e.message : e));
            });
    }

    function loadList() {
        // Usa el resumen para obtener las fechas disponibles (nuevo formato)
        api.get('/api/admin/logs/summary').then(function (items) {
            var sel = document.getElementById('logs-date-select');
            if (!sel) return;
            sel.innerHTML = '';
            if (!items || !items.length) return;
            var dates = items.map(function (i) { return i.date; });
            dates.forEach(function (d) {
                var opt = document.createElement('option');
                opt.value = d; opt.textContent = _fmtDay(d);
                if (d === _date) opt.selected = true;
                sel.appendChild(opt);
            });
            var today = _today();
            var target = dates.indexOf(today) !== -1 ? today : dates[0];
            if (!_date || dates.indexOf(_date) === -1) loadLog(target);
        }).catch(function (e) { flog.error('admin-logs list: ' + e); });
    }

    /* ── Resumen ── */
    function loadSummary() {
        var grid = document.getElementById('logs-summary-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="lsc-loading">' + _esc(i18n.t('admin.logs.loading') || '…') + '</div>';

        api.get('/api/admin/logs/summary').then(function (items) {
            grid.innerHTML = '';
            if (!items || !items.length) {
                grid.innerHTML = '<p class="logs-count">' + _esc(i18n.t('admin.logs.no_files')) + '</p>';
                return;
            }
            items.forEach(function (item) {
                var card = document.createElement('div');
                card.className = 'log-summary-card';
                function _cell(n, cls) {
                    return '<td class="' + (n > 0 ? cls : 'lsc-zero') + '">' + n + '</td>';
                }
                card.innerHTML =
                    '<div class="lsc-header">' +
                    '<span class="lsc-date">' + _fmtDay(item.date) + '</span>' +
                    (item.size_bytes ? '<span class="lsc-size">' + _fmtSize(item.size_bytes) + '</span>' : '') +
                    '</div>' +
                    '<div class="lsc-lines">' + item.lines + ' entradas</div>' +
                    '<table class="lsc-breakdown">' +
                    '<thead><tr>' +
                    '<th></th>' +
                    '<th>⚠</th>' +
                    '<th>✕</th>' +
                    '</tr></thead>' +
                    '<tbody>' +
                    '<tr><td><span class="log-badge log-badge-be">BE</span></td>' +
                    _cell(item.be_warnings || 0, 'lsc-bw') +
                    _cell(item.be_errors || 0, 'lsc-be') +
                    '</tr>' +
                    '<tr><td><span class="log-badge log-badge-fe">FE</span></td>' +
                    _cell(item.fe_warnings || 0, 'lsc-bw') +
                    _cell(item.fe_errors || 0, 'lsc-be') +
                    '</tr>' +
                    '</tbody>' +
                    '</table>';
                card.addEventListener('click', function () {
                    _switchTab('viewer');
                    loadList();
                    loadLog(item.date);
                });
                grid.appendChild(card);
            });
        }).catch(function (e) {
            grid.innerHTML = '<p class="logs-count">' + _esc(i18n.t('admin.logs.error_load')) + '</p>';
            flog.error('admin-logs summary: ' + e);
        });
    }

    /* ── Pestañas internas ── */
    function _switchTab(tab) {
        _activeTab = tab;
        document.querySelectorAll('.logs-inner-tab').forEach(function (b) {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        var summary = document.getElementById('logs-panel-summary');
        var viewer = document.getElementById('logs-panel-viewer');
        if (summary) summary.style.display = tab === 'summary' ? '' : 'none';
        if (viewer) viewer.style.display = tab === 'viewer' ? '' : 'none';
    }

    function _bindInnerTabs() {
        document.querySelectorAll('.logs-inner-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = btn.dataset.tab;
                _switchTab(tab);
                if (tab === 'viewer' && !_date) loadList();
            });
        });
    }

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', function () {
        _bindInnerTabs();
        _wireViewerSelects();
        _bindSort();
    });

    window.adminLogs = {
        init: function () {
            if (_loaded) return;
            _loaded = true;
            _bindInnerTabs();
            _wireViewerSelects();
            _bindSort();
            flog.info('[admin-logs] Visor de logs abierto');
            loadSummary();
        },
        reload: function () { loadSummary(); loadList(); },
        openViewer: function (date) {
            _switchTab('viewer');
            loadList();
            if (date) loadLog(date);
        },
    };
}());
