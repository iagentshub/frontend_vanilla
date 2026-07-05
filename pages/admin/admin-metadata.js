// admin-metadata.js — Página Metadata del sistema
// Autocontenida: no depende del estado interno de admin-logs.js
'use strict';
(function () {

    // ═══ TABS ════════════════════════════════════════════════════════════════
    function _switchTab(tab) {
        document.querySelectorAll('[data-meta-tab]').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.metaTab === tab);
        });
        var pl = document.getElementById('meta-panel-logs');
        var pt = document.getElementById('meta-panel-tables');
        if (pl) pl.style.display = tab === 'logs' ? '' : 'none';
        if (pt) pt.style.display = tab === 'tables' ? '' : 'none';
        if (tab === 'tables') _initTables();
    }
    window._metaSwitchTab = _switchTab;

    // ═══ LOG SUMMARY ════════════════════════════════════════════════════════
    function _fmtDay(date) {
        var p = date.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : date;
    }

    function _loadLogSummary() {
        var grid = document.getElementById('logs-summary-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="lsc-loading">' + t('admin.metadata.loading') + '</div>';
        api.get('/api/admin/logs/summary').then(function (items) {
            grid.innerHTML = '';
            if (!items || !items.length) {
                grid.innerHTML = '<p class="logs-count">' + t('admin.metadata.no_logs') + '</p>';
                return;
            }
            items.forEach(function (item) {
                var fmtDate = _fmtDay(item.date);
                var card = document.createElement('div');
                card.className = 'log-summary-card';
                card.innerHTML =
                    '<div class="lsc-header"><span class="lsc-date">' + fmtDate + '</span></div>' +
                    '<div class="lsc-lines">' + (item.lines || 0) + ' ' + t('admin.metadata.entries') + '</div>' +
                    '<table class="lsc-breakdown"><thead><tr><th></th><th>⚠</th><th>✕</th></tr></thead><tbody>' +
                    '<tr><td><span class="log-badge log-badge-be">BE</span></td>' +
                    '<td class="' + (item.be_warnings ? 'lsc-bw' : 'lsc-zero') + '">' + (item.be_warnings || 0) + '</td>' +
                    '<td class="' + (item.be_errors ? 'lsc-be' : 'lsc-zero') + '">' + (item.be_errors || 0) + '</td></tr>' +
                    '<tr><td><span class="log-badge log-badge-fe">FE</span></td>' +
                    '<td class="' + (item.fe_warnings ? 'lsc-bw' : 'lsc-zero') + '">' + (item.fe_warnings || 0) + '</td>' +
                    '<td class="' + (item.fe_errors ? 'lsc-be' : 'lsc-zero') + '">' + (item.fe_errors || 0) + '</td></tr>' +
                    '</tbody></table>';
                card.addEventListener('click', (function (d, fd) { return function () { _openLogModal(d, fd); }; })(item.date, fmtDate));
                grid.appendChild(card);
            });
        }).catch(function () {
            grid.innerHTML = '<p class="logs-count" style="color:var(--danger,#ef4444)">' + t('admin.metadata.error_summary') + '</p>';
        });
    }

    // ═══ LOG MODAL ══════════════════════════════════════════════════════════
    var _logLines = [], _logLevel = '', _logSource = '', _logSearch = '',
        _logIp = '', _logUser = '', _logTimer = null;
    var _logModalDate = null;
    var _logPage = 1, _logPageSize = 50, _logTotal = 0, _logPages = 0;
    var _LEVEL_CLS = { DEBUG: 'log-level-debug', INFO: 'log-level-info', OK: 'log-level-ok', WARNING: 'log-level-warning', ERROR: 'log-level-error' };

    function _esc(s) {
        return String(s == null ? '-' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _renderLogTable() {
        var search = _logSearch.toLowerCase();
        var ipQ = _logIp.toLowerCase();
        var userQ = _logUser.toLowerCase();
        var visible = _logLines.filter(function (l) {
            if (_logLevel && l.level !== _logLevel) return false;
            if (_logSource && l.source !== _logSource) return false;
            if (ipQ && l.ip.toLowerCase().indexOf(ipQ) === -1) return false;
            if (userQ && l.username.toLowerCase().indexOf(userQ) === -1) return false;
            if (search && (l.summary + l.date + l.time).toLowerCase().indexOf(search) === -1) return false;
            return true;
        });
        var tbody = document.getElementById('logs-tbody');
        if (!tbody) return;
        if (!visible.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="logs-td logs-td-empty">' + t('admin.metadata.no_results') + '</td></tr>';
        } else {
            tbody.innerHTML = visible.map(function (l) {
                var cls = _LEVEL_CLS[l.level] || 'log-level-debug';
                var svc = l.source === 'FE' ? '<span class="log-badge log-badge-fe">FE</span>' : '<span class="log-badge log-badge-be">BE</span>';
                return '<tr>' +
                    '<td class="logs-td logs-td-date">' + _esc(l.date) + '</td>' +
                    '<td class="logs-td logs-td-time">' + _esc(l.time) + '</td>' +
                    '<td class="logs-td"><span class="log-level ' + cls + '">' + _esc(l.level) + '</span></td>' +
                    '<td class="logs-td" style="cursor:pointer;color:var(--accent)" data-log-ip="' + _esc(l.ip) + '">' + _esc(l.ip) + '</td>' +
                    '<td class="logs-td" style="cursor:pointer;color:var(--accent)" data-log-user="' + _esc(l.username) + '">' + _esc(l.username) + '</td>' +
                    '<td class="logs-td">' + svc + '</td>' +
                    '<td class="logs-td logs-td-msg">' + _esc(l.summary) + '</td>' +
                    '</tr>';
            }).join('');
        }
        var cnt = document.getElementById('logs-count');
        var prev = document.getElementById('logs-pag-prev');
        var next = document.getElementById('logs-pag-next');
        var pLabel = document.getElementById('logs-pag-label');
        var active = [_logLevel, _logSource, _logIp, _logUser, _logSearch].filter(Boolean).length;
        if (cnt) {
            var entriesStr = active
                ? t('admin.metadata.page_entries_filtered', {
                    page: _logPage,
                    visible: visible.length,
                    total: _logLines.length,
                    count: active,
                    plural: active > 1 ? 's' : '',
                })
                : t('admin.metadata.page_entries', {
                    page: _logPage,
                    visible: visible.length,
                    total: _logLines.length,
                });
            cnt.textContent = entriesStr + ' — ' + t('admin.metadata.total_day', { total: _logTotal.toLocaleString() });
        }
        if (prev) prev.disabled = _logPage <= 1;
        if (next) next.disabled = _logPage >= _logPages;
        if (pLabel) pLabel.textContent = _logPages > 1
            ? t('admin.metadata.page_label', { page: _logPage, total: _logPages })
            : '';
    }

    function _loadLogData(date, page) {
        _logModalDate = date || _logModalDate;
        _logPage = page || 1;
        var tbody = document.getElementById('logs-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="logs-td logs-td-empty">' + t('admin.metadata.loading') + '</td></tr>';
        var qs = 'date_from=' + _logModalDate + '&date_to=' + _logModalDate + '&page_size=' + _logPageSize + '&page=' + _logPage;
        api.get('/api/admin/logs?' + qs).then(function (data) {
            _logLines = (data.items || []).map(function (r) {
                return { date: r.date, time: r.time, level: r.level, ip: r.ip || '-', username: r.username || '-', source: r.source, summary: r.summary || '' };
            });
            _logTotal = data.total || 0;
            _logPages = data.pages || 0;
            _renderLogTable();
            var dl = document.getElementById('btn-logs-download');
            if (dl) {
                var csv = ['Fecha,Hora,Nivel,IP,Usuario,Fuente,Accion'].concat(_logLines.map(function (l) {
                    return [l.date, l.time, l.level, l.ip, l.username, l.source, '"' + l.summary.replace(/"/g, '""') + '"'].join(',');
                })).join('\n');
                dl.style.display = '';
                dl.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                dl.download = _logModalDate + '_p' + _logPage + '.csv';
            }
        }).catch(function () {
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="logs-td logs-td-empty" style="color:var(--danger,#ef4444)">' + t('admin.metadata.error_data') + '</td></tr>';
        });
    }

    function _openLogModal(date, fmtDate) {
        _logLevel = ''; _logSource = ''; _logSearch = ''; _logIp = ''; _logUser = '';
        _logPage = 1;
        var modal = document.getElementById('logs-modal');
        var title = document.getElementById('logs-modal-title');
        if (modal) modal.style.display = '';
        if (title) title.textContent = 'Logs — ' + fmtDate;
        document.body.style.overflow = 'hidden';
        ['logs-level-select', 'logs-service-select', 'logs-search', 'logs-ip-filter', 'logs-user-filter'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
        _loadLogData(date, 1);
    }

    function _closeLogModal() {
        var modal = document.getElementById('logs-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function _bindLogModal() {
        var close = document.getElementById('btn-logs-modal-close');
        if (close) close.addEventListener('click', _closeLogModal);
        var modal = document.getElementById('logs-modal');
        if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) _closeLogModal(); });

        var lvl = document.getElementById('logs-level-select');
        var svc = document.getElementById('logs-service-select');
        var si = document.getElementById('logs-search');
        var ipEl = document.getElementById('logs-ip-filter');
        var usEl = document.getElementById('logs-user-filter');
        var clr = document.getElementById('logs-clear-filters');
        var rfr = document.getElementById('btn-logs-refresh');
        var prev = document.getElementById('logs-pag-prev');
        var next = document.getElementById('logs-pag-next');

        if (lvl) lvl.onchange = function () { _logLevel = lvl.value; _logPage = 1; _loadLogData(null, 1); };
        if (svc) svc.onchange = function () { _logSource = svc.value; _logPage = 1; _loadLogData(null, 1); };
        if (si) si.addEventListener('input', function () { clearTimeout(_logTimer); _logTimer = setTimeout(function () { _logSearch = si.value; _renderLogTable(); }, 200); });
        if (ipEl) ipEl.addEventListener('input', function () { clearTimeout(_logTimer); _logTimer = setTimeout(function () { _logIp = ipEl.value; _renderLogTable(); }, 200); });
        if (usEl) usEl.addEventListener('input', function () { clearTimeout(_logTimer); _logTimer = setTimeout(function () { _logUser = usEl.value; _renderLogTable(); }, 200); });
        if (clr) clr.addEventListener('click', function () {
            _logLevel = ''; _logSource = ''; _logSearch = ''; _logIp = ''; _logUser = '';
            [lvl, svc, si, ipEl, usEl].forEach(function (el) { if (el) el.value = ''; });
            _logPage = 1;
            _loadLogData(null, 1);
        });
        if (rfr) rfr.addEventListener('click', function () { _loadLogData(null, _logPage); });
        if (prev) prev.addEventListener('click', function () { if (_logPage > 1) _loadLogData(null, _logPage - 1); });
        if (next) next.addEventListener('click', function () { if (_logPage < _logPages) _loadLogData(null, _logPage + 1); });

        var tbody = document.getElementById('logs-tbody');
        if (tbody) tbody.addEventListener('click', function (e) {
            var ipCell = e.target.closest('[data-log-ip]');
            var userCell = e.target.closest('[data-log-user]');
            if (ipCell && ipCell.dataset.logIp !== '-') {
                if (ipEl) { ipEl.value = ipCell.dataset.logIp; }
                _logIp = ipCell.dataset.logIp;
                _renderLogTable();
            } else if (userCell && userCell.dataset.logUser !== '-') {
                if (usEl) { usEl.value = userCell.dataset.logUser; }
                _logUser = userCell.dataset.logUser;
                _renderLogTable();
            }
        });

        document.querySelectorAll('.logs-th.sortable').forEach(function (th) {
            th.addEventListener('click', function () {
                var col = th.dataset.col, dir = th._dir || 1;
                _logLines.sort(function (a, b) { var av = a[col] || '', bv = b[col] || ''; return av < bv ? -dir : av > bv ? dir : 0; });
                th._dir = -dir;
                _renderLogTable();
            });
        });
    }

    // ═══ TABLES ═════════════════════════════════════════════════════════════
    var _allTables = [], _tablesInit = false;
    var _tblSortCol = 'rows', _tblSortDir = -1;

    function _fmtBytes(b) {
        if (!b || isNaN(b)) return null;
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }

    function _initTables() {
        if (_tablesInit) { _renderTableRows(); return; }
        _tablesInit = true;
        var tbody = document.getElementById('meta-tables-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--text-2)">' + t('admin.metadata.loading') + '</td></tr>';
        api.get('/api/admin/metadata/tables').then(function (rows) {
            _allTables = rows || [];
            _renderTableRows();
            _bindTableSortHeaders();
        }).catch(function () {
            var tb = document.getElementById('meta-tables-tbody');
            if (tb) tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--danger,#ef4444)">' + t('admin.metadata.error_tables') + '</td></tr>';
        });
    }

    function _renderTableRows() {
        var q = ((document.getElementById('meta-table-search') || {}).value || '').toLowerCase();
        var filtered = _allTables.filter(function (tb) { return !q || tb.name.toLowerCase().indexOf(q) !== -1; });
        var cnt = document.getElementById('meta-table-count');
        if (cnt) cnt.textContent = t('admin.metadata.tables_count', { visible: filtered.length, total: _allTables.length });

        var col = _tblSortCol, dir = _tblSortDir;
        filtered.sort(function (a, b) {
            var av = (col === 'name') ? a.name : (a[col] != null ? a[col] : -1);
            var bv = (col === 'name') ? b.name : (b[col] != null ? b[col] : -1);
            return av < bv ? dir : av > bv ? -dir : 0;
        });

        var tbody = document.getElementById('meta-tables-tbody');
        if (!tbody) return;
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:28px;color:var(--text-2)">' + t('admin.metadata.no_results') + '</td></tr>';
            return;
        }
        tbody.innerHTML = filtered.map(function (r, i) {
            var size = _fmtBytes(r.size_bytes) || '—';
            var rowBg = i % 2 === 1 ? 'var(--surface-2,var(--surface))' : 'transparent';
            var emptyCol = r.rows ? '' : 'color:var(--text-2)';
            // Sin inline event handlers (bloqueados por CSP). Se usa data-table
            // y data-bg para event delegation en _bindTableBody().
            return '<tr data-table="' + r.name + '" data-bg="' + rowBg + '"' +
                ' style="background:' + rowBg + ';cursor:pointer;transition:background .1s">' +
                '<td style="padding:8px 14px;border-bottom:1px solid var(--border);font-family:monospace;font-size:0.82rem">' + r.name + '</td>' +
                '<td style="padding:8px 14px;border-bottom:1px solid var(--border);text-align:right;font-variant-numeric:tabular-nums;' + emptyCol + (r.rows ? ';font-weight:600' : '') + '">' + (r.rows || 0).toLocaleString() + '</td>' +
                '<td style="padding:8px 14px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-2)">' + (r.col_count || '—') + '</td>' +
                '<td style="padding:8px 14px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-2);font-size:0.78rem">' + size + '</td>' +
                '</tr>';
        }).join('');
    }
    window._metaFilterTables = _renderTableRows;

    function _bindTableSortHeaders() {
        var map = { 'th-name': 'name', 'th-rows': 'rows', 'th-cols': 'col_count', 'th-size': 'size_bytes' };
        Object.keys(map).forEach(function (thId) {
            var th = document.getElementById(thId);
            if (!th) return;
            th.addEventListener('click', function () {
                var field = map[thId];
                if (_tblSortCol === field) { _tblSortDir = -_tblSortDir; } else { _tblSortCol = field; _tblSortDir = -1; }
                Object.keys(map).forEach(function (id) {
                    var arr = document.getElementById(id + '-arrow');
                    if (arr) { arr.textContent = '↕'; arr.style.opacity = '0.4'; }
                });
                var arr = document.getElementById(thId + '-arrow');
                if (arr) { arr.textContent = _tblSortDir === -1 ? '↓' : '↑'; arr.style.opacity = '1'; }
                _renderTableRows();
            });
        });
        var initArr = document.getElementById('th-rows-arrow');
        if (initArr) { initArr.textContent = '↓'; initArr.style.opacity = '1'; }
    }

    // ═══ TABLE BROWSER DIALOG ═══════════════════════════════════════════════
    var _tbl = null, _tblPage = 1, _tblPageSize = 50, _tblQ = '';

    function _openTableDialog(name) {
        _tbl = name; _tblPage = 1; _tblQ = '';
        var dialog = document.getElementById('meta-table-dialog');
        var title = document.getElementById('meta-table-dialog-title');
        if (dialog) dialog.style.display = '';
        if (title) title.textContent = name;
        document.body.style.overflow = 'hidden';
        var si = document.getElementById('meta-table-search-data');
        if (si) si.value = '';
        _loadTableData();
    }

    function _closeTableDialog() {
        var d = document.getElementById('meta-table-dialog');
        if (d) d.style.display = 'none';
        document.body.style.overflow = '';
    }

    function _loadTableData() {
        if (!_tbl) return;
        var wrap = document.getElementById('meta-table-data-wrap');
        if (wrap) wrap.innerHTML = '<p style="text-align:center;padding:28px;color:var(--text-2)">' + t('admin.metadata.loading') + '</p>';
        var qs = 'page=' + _tblPage + '&page_size=' + _tblPageSize;
        if (_tblQ) qs += '&q=' + encodeURIComponent(_tblQ);
        api.get('/api/admin/metadata/tables/' + encodeURIComponent(_tbl) + '/data?' + qs).then(function (data) {
            var cols = data.columns || [], rows = data.rows || [], total = data.total || 0, pages = data.pages || 0;
            var html = '<div style="overflow:auto"><table class="logs-table" style="min-width:max-content;width:100%"><thead><tr>' +
                cols.map(function (c) { return '<th class="logs-th" style="white-space:nowrap">' + _esc(c) + '</th>'; }).join('') +
                '</tr></thead><tbody>';
            html += rows.length
                ? rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td class="logs-td" style="white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis">' + _esc(cell) + '</td>'; }).join('') + '</tr>'; }).join('')
                : '<tr><td colspan="' + cols.length + '" class="logs-td logs-td-empty">' + t('admin.metadata.no_data') + '</td></tr>';
            html += '</tbody></table></div>';

            var pageLabel = pages > 1
                ? t('admin.metadata.table_page_of', { page: _tblPage, pages: pages })
                : t('admin.metadata.table_page', { page: _tblPage });

            html += '<div style="display:flex;align-items:center;gap:8px;justify-content:center;padding:10px;border-top:1px solid var(--border);flex-shrink:0">' +
                '<button class="btn btn-ghost btn-sm" id="tbl-btn-prev" ' + (_tblPage <= 1 ? 'disabled' : '') + '>' + t('admin.metadata.prev_short') + '</button>' +
                '<span style="font-size:0.78rem;color:var(--text-2)">' + pageLabel + ' ' + t('admin.metadata.table_rows', { rows: total.toLocaleString() }) + '</span>' +
                '<button class="btn btn-ghost btn-sm" id="tbl-btn-next" ' + (_tblPage >= pages ? 'disabled' : '') + '>' + t('admin.metadata.next_short') + '</button>' +
                '</div>';
            if (wrap) {
                wrap.innerHTML = html;
                var prev = document.getElementById('tbl-btn-prev');
                var next = document.getElementById('tbl-btn-next');
                if (prev) prev.addEventListener('click', function () { _tblPage--; _loadTableData(); });
                if (next) next.addEventListener('click', function () { _tblPage++; _loadTableData(); });
            }
        }).catch(function () {
            if (wrap) wrap.innerHTML = '<p style="text-align:center;padding:28px;color:var(--danger,#ef4444)">' + t('admin.metadata.error_data') + '</p>';
        });
    }

    function _bindTableBody() {
        var tbody = document.getElementById('meta-tables-tbody');
        if (!tbody) return;
        // Click: abrir detalle de tabla
        tbody.addEventListener('click', function (e) {
            var tr = e.target.closest('tr[data-table]');
            if (tr) _openTableDialog(tr.dataset.table);
        });
        // Hover: resaltar fila sin inline handlers (bloqueados por CSP)
        tbody.addEventListener('mouseover', function (e) {
            var tr = e.target.closest('tr[data-table]');
            if (tr) tr.style.background = 'var(--surface-2,var(--surface))';
        });
        tbody.addEventListener('mouseout', function (e) {
            var tr = e.target.closest('tr[data-table]');
            if (tr) tr.style.background = tr.dataset.bg || 'transparent';
        });
    }

    function _bindTableDialog() {
        _bindTableBody();
        var close = document.getElementById('meta-table-dialog-close');
        if (close) close.addEventListener('click', _closeTableDialog);
        var dialog = document.getElementById('meta-table-dialog');
        if (dialog) dialog.addEventListener('click', function (e) { if (e.target === dialog) _closeTableDialog(); });
        var si = document.getElementById('meta-table-search-data');
        var btn = document.getElementById('meta-table-search-btn');
        function _doSearch() { _tblQ = si ? si.value.trim() : ''; _tblPage = 1; _loadTableData(); }
        if (si) si.addEventListener('keydown', function (e) { if (e.key === 'Enter') _doSearch(); });
        if (btn) btn.addEventListener('click', _doSearch);
    }

    // ═══ ESC ════════════════════════════════════════════════════════════════
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var td = document.getElementById('meta-table-dialog');
        var lm = document.getElementById('logs-modal');
        if (td && td.style.display !== 'none') { _closeTableDialog(); return; }
        if (lm && lm.style.display !== 'none') { _closeLogModal(); }
    });

    // ═══ INIT ════════════════════════════════════════════════════════════════
    function _bindTabs() {
        document.querySelectorAll('[data-meta-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () { _switchTab(btn.dataset.metaTab); });
        });
        var searchInput = document.getElementById('meta-table-search');
        if (searchInput) searchInput.addEventListener('input', _renderTableRows);
    }

    function init() {
        _bindLogModal();
        _bindTableDialog();
        _bindTabs();
        _loadLogSummary();
        // Aplicar traducciones y sincronizar al cambiar de idioma
        if (window.i18n) {
            window.i18n.ready(function () { window.i18n.applyDOM(); });
            window.i18n.onLangChange(function () { window.i18n.applyDOM(); });
        }
    }

    window.adminMetadata = { init: init };
    window._metaOpenTable = _openTableDialog;
    window._metaOpenDay = _openLogModal;
})();
