'use strict';
/* global api, toast, esc */

window.centinel = (function () {

    // ── State ──────────────────────────────────────────────────────────
    var _s = {
        status: 'idle',
        runId: null,
        es: null,              // EventSource
        totalTests: 0,
        lastProgress: 0,
        // results: file → { hdr, body, counts, startTs, fileState, secEl, ... }
        results: {},
        fileOrder: [],
        selectedFiles: null,   // null = todos, Set<string> = selección parcial
        failedIds: [],
        filter: 'all',
        treeData: null,
        treeSearch: '',
        activeFile: null,      // archivo que se está ejecutando ahora mismo
    };

    // ── DOM refs ───────────────────────────────────────────────────────
    function $$(id) { return document.getElementById(id); }

    // ── Status icons ───────────────────────────────────────────────────
    var ICONS = {
        pending: '○',
        passed: '✓',
        failed: '✗',
        skipped: '⊘',
        running: '◌',
        error: '✗',
    };

    // ID consistente para una fila de test
    function _rowId(file, testName) {
        return 'trow-' + (file + '-' + testName).replace(/[^a-z0-9]/gi, '_');
    }

    // ── Init ───────────────────────────────────────────────────────────
    function init() {
        _bindButtons();
        _bindFilters();
        _bindTreeSearch();
        _loadTree();
        _loadHistory();
        _checkExistingRun();
    }

    async function _checkExistingRun() {
        try {
            var d = await api.get('/api/admin/centinel/status');
            if (d.status === 'running' && d.run_id) {
                _setRunningUI(d.run_id);
                _connectSSE(d.run_id);
            } else if (d.status === 'done' || d.status === 'error') {
                _setIdleUI(d.summary, d.failed_ids);
            }
        } catch (e) { /* ignore */ }
    }

    // ── Buttons ────────────────────────────────────────────────────────
    function _bindButtons() {
        $$('btn-run').addEventListener('click', _runCurrent);
        $$('btn-abort').addEventListener('click', _abort);
        $$('btn-rerun-failed').addEventListener('click', function () { _startRun('tests/', true); });
        $$('btn-select-all').addEventListener('click', _selectAll);
        $$('btn-deselect-all').addEventListener('click', _deselectAll);
    }

    function _runCurrent() {
        if (_s.selectedFiles !== null && _s.selectedFiles.size === 0) return;
        if (_s.selectedFiles === null) {
            _startRun('tests/');
        } else {
            var files = Array.from(_s.selectedFiles);
            _startRun(files.length === 1 ? files[0] : files.join(' '));
        }
    }

    // ── Tree search ────────────────────────────────────────────────────
    function _bindTreeSearch() {
        $$('ctn-tree-search').addEventListener('input', function (e) {
            _s.treeSearch = e.target.value.toLowerCase();
            _applyTreeSearch();
        });
    }

    function _applyTreeSearch() {
        var q = _s.treeSearch;
        document.querySelectorAll('.ctn-file-row').forEach(function (row) {
            if (!q) {
                row.classList.remove('hidden');
            } else {
                var name = (row.dataset.file || '').toLowerCase();
                row.classList.toggle('hidden', !name.includes(q));
            }
        });
    }

    // ── Selection ──────────────────────────────────────────────────────
    function _selectAll() {
        _s.selectedFiles = null;
        document.querySelectorAll('.ctn-file-cb').forEach(function (cb) { cb.checked = true; });
        _updateSelCount();
        _updateRunBtn();
        _syncPendingVisibility();
    }

    function _deselectAll() {
        _s.selectedFiles = new Set();
        document.querySelectorAll('.ctn-file-cb').forEach(function (cb) { cb.checked = false; });
        _updateSelCount();
        _updateRunBtn();
        _syncPendingVisibility();
    }

    function _updateSelCount() {
        var totalTests = 0, selTests = 0;
        (_s.treeData && _s.treeData.dirs || []).forEach(function (dir) {
            var dirId = 'dir-' + dir.dir.replace(/[^a-z0-9]/gi, '_');
            var dTotal = 0, dSel = 0;
            dir.files.forEach(function (f) {
                var n = f.count || 0;
                totalTests += n;
                dTotal += n;
                var checked = _s.selectedFiles === null || _s.selectedFiles.has(f.file);
                if (checked) { selTests += n; dSel += n; }
            });
            var el = document.getElementById('dcnt-' + dirId);
            if (el) el.textContent = dSel === dTotal ? dTotal : (dSel + '/' + dTotal);
        });
        var el = $$('ctn-sel-count');
        if (!el) return;
        el.textContent = totalTests ? (selTests + '/' + totalTests) : '';
    }

    function _updateRunBtn() {
        var btn = $$('btn-run');
        if (!btn) return;
        var nothingSelected = _s.selectedFiles !== null && _s.selectedFiles.size === 0;
        btn.disabled = _s.status === 'running' || nothingSelected;
    }

    // ── Filter tabs ────────────────────────────────────────────────────
    function _bindFilters() {
        document.querySelectorAll('.ctn-filter-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.ctn-filter-tab').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                _s.filter = btn.dataset.filter;
                _applyResultFilter();
            });
        });
    }

    function _applyResultFilter() {
        document.querySelectorAll('.ctn-test-row').forEach(function (row) {
            var status = row.dataset.status;
            if (_s.filter === 'all') {
                row.classList.remove('hidden');
            } else {
                row.classList.toggle('hidden', status !== _s.filter);
            }
        });
        document.querySelectorAll('.ctn-file-section').forEach(function (sec) {
            var visible = sec.querySelectorAll('.ctn-test-row:not(.hidden)').length;
            sec.style.display = visible > 0 ? '' : 'none';
        });
    }

    // ── Load tree ──────────────────────────────────────────────────────
    async function _loadTree() {
        try {
            var d = await api.get('/api/admin/centinel/tree');
            _s.treeData = d;
            // Lookup rápido file → [testNames] para pre-poblar filas individuales
            _s.testsByFile = {};
            (d.dirs || []).forEach(function (dir) {
                dir.files.forEach(function (f) {
                    _s.testsByFile[f.file] = f.tests || [];
                });
            });
            _renderTree(d);
            // Mostrar todos los archivos como "Pendiente" desde el inicio
            if (_s.status === 'idle') {
                _prepopulateResults(_getTargetFiles('tests/', false));
            }
        } catch (e) {
            $$('ctn-tree').innerHTML = '<div class="ctn-tree-loading" style="color:var(--danger)">Error al descubrir tests</div>';
        }
    }

    function _renderTree(data) {
        var html = '';
        (data.dirs || []).forEach(function (dir) {
            var dirId = 'dir-' + dir.dir.replace(/[^a-z0-9]/gi, '_');
            html += '<div class="ctn-dir-item">' +
                '<div class="ctn-dir-hdr" data-dir="' + esc(dir.dir) + '">' +
                '<svg class="ctn-dir-chevron" viewBox="0 0 16 16" fill="none"><path d="M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '<span class="ctn-dir-name">' + esc(dir.dir) + '</span>' +
                '<span class="ctn-dir-count" id="dcnt-' + dirId + '">' + dir.count + '</span>' +
                '</div>' +
                '<div class="ctn-dir-files" id="' + dirId + '" style="display:none">';
            dir.files.forEach(function (f) {
                var shortName = f.file.split('/').pop();
                html += '<div class="ctn-file-row" data-file="' + esc(f.file) + '">' +
                    '<input type="checkbox" class="ctn-file-cb" data-file="' + esc(f.file) + '" checked />' +
                    '<div class="ctn-file-dot" id="fdot-' + esc(f.file).replace(/[^a-z0-9]/gi, '_') + '"></div>' +
                    '<span class="ctn-file-name" title="' + esc(f.file) + '">' + esc(shortName) + '</span>' +
                    '<span class="ctn-file-count">' + f.count + '</span>' +
                    '</div>';
            });
            html += '</div></div>';
        });
        $$('ctn-tree').innerHTML = html;
        // Delegación de eventos (evita inline handlers bloqueados por CSP)
        $$('ctn-tree').addEventListener('click', function (e) {
            var cb = e.target.closest('.ctn-file-cb');
            if (cb) { e.stopPropagation(); _onFileCheck(cb); return; }
            var fileRow = e.target.closest('.ctn-file-row');
            if (fileRow) { _toggleFile(fileRow); return; }
            var dirHdr = e.target.closest('.ctn-dir-hdr');
            if (dirHdr) { _toggleDir(dirHdr); return; }
        });
        _updateSelCount();
    }

    function _toggleDir(hdr) {
        var chevron = hdr.querySelector('.ctn-dir-chevron');
        var filesEl = hdr.nextElementSibling;
        var isOpen = chevron.classList.contains('open');
        chevron.classList.toggle('open', !isOpen);
        filesEl.style.display = isOpen ? 'none' : '';
    }

    function _toggleFile(row) {
        var cb = row.querySelector('.ctn-file-cb');
        if (!cb) return;
        cb.checked = !cb.checked;
        _onFileCheck(cb);
    }

    function _onFileCheck(cb) {
        var file = cb.dataset.file;
        if (!cb.checked) {
            if (!_s.selectedFiles) {
                // Inicializar con todos menos este
                _s.selectedFiles = new Set();
                document.querySelectorAll('.ctn-file-cb').forEach(function (c) {
                    if (c.checked) _s.selectedFiles.add(c.dataset.file);
                });
            } else {
                _s.selectedFiles.delete(file);
            }
        } else {
            if (_s.selectedFiles) _s.selectedFiles.add(file);
        }
        _updateSelCount();
        _updateRunBtn();
        _syncPendingVisibility();
    }

    // Muestra/oculta secciones Pendiente según la selección actual
    function _syncPendingVisibility() {
        if (_s.status !== 'idle') return;
        Object.keys(_s.results).forEach(function (file) {
            var fd = _s.results[file];
            if (!fd || fd.fileState !== 'pending' || !fd.secEl) return;
            var selected = _s.selectedFiles === null || _s.selectedFiles.has(file);
            fd.secEl.style.display = selected ? '' : 'none';
        });
    }

    // ── Pre-poblar resultados (pendiente) ────────────────────────────────
    function _getTargetFiles(target, rerunFailed) {
        if (rerunFailed && _s.failedIds && _s.failedIds.length > 0) {
            var files = [], seen = {};
            _s.failedIds.forEach(function (id) {
                var f = id.split('::')[0];
                if (!seen[f]) { seen[f] = true; files.push(f); }
            });
            return files;
        }
        if (!_s.treeData) return [];
        var allFiles = [];
        (_s.treeData.dirs || []).forEach(function (dir) {
            dir.files.forEach(function (f) { allFiles.push(f.file); });
        });
        var targets = target.trim().split(/\s+/);
        return allFiles.filter(function (f) {
            return targets.some(function (t) { return f.startsWith(t) || f === t; });
        }).sort();  // orden alfabético = orden de ejecución de pytest
    }

    function _prepopulateResults(files) {
        files.forEach(function (file) {
            if (_s.results[file]) return; // ya existe, no duplicar
            _s.results[file] = {
                counts: { passed: 0, failed: 0, skipped: 0 },
                startTs: null, fileState: 'pending', inProgressRow: null,
            };
            _s.fileOrder.push(file);
            _createFileSection(file);
        });
    }

    // ── Start run ──────────────────────────────────────────────────────
    async function _startRun(target, rerurFailed) {
        if (_s.status === 'running') return;
        _s.results = {};
        _s.fileOrder = [];
        _s.lastProgress = 0;
        _s.totalTests = 0;
        _clearResults();
        // Pre-poblar el panel con todos los archivos en estado "Pendiente"
        _prepopulateResults(_getTargetFiles(target, rerurFailed));
        try {
            var d = await api.post('/api/admin/centinel/run', {
                target: target,
                rerun_failed: !!rerurFailed,
            });
            _setRunningUI(d.run_id);
            _connectSSE(d.run_id);
        } catch (e) {
            _clearResults();
            toast.error('No se pudo iniciar el run: ' + (e.detail || e.message || ''));
        }
    }

    // ── Abort ──────────────────────────────────────────────────────────
    async function _abort() {
        try {
            await api.del('/api/admin/centinel/run');
            toast.show('Run abortado');
        } catch (e) {
            toast.error('No se pudo abortar');
        }
    }

    // ── UI state ───────────────────────────────────────────────────────
    function _setRunningUI(runId) {
        _s.status = 'running';
        _s.runId = runId;
        $$('btn-run').disabled = true;
        $$('btn-rerun-failed').style.display = 'none';
        $$('btn-abort').style.display = '';
        $$('ctn-progress-wrap').style.display = '';
        $$('ctn-summary-bar').style.display = 'none';
        _setProgress(0, '');
    }

    function _setIdleUI(summary, failedIds) {
        _s.status = 'idle';
        _s.failedIds = failedIds || [];
        _updateRunBtn();
        $$('btn-abort').style.display = 'none';
        if (_s.failedIds.length > 0) {
            $$('btn-rerun-failed').style.display = '';
        }
        $$('ctn-progress-wrap').style.display = 'none';
        if (summary) _renderSummaryBar(summary);
    }

    function _setProgress(pct, currentFile) {
        $$('ctn-progress-bar').style.width = pct + '%';
        $$('ctn-progress-text').textContent = pct + '%';
        $$('ctn-progress-current').textContent = currentFile;
        var hasFailed = Object.values(_s.results).some(function (r) { return r.counts.failed > 0; });
        $$('ctn-progress-bar').classList.toggle('ctn-has-failures', hasFailed);
    }

    // ── SSE ────────────────────────────────────────────────────────────
    function _connectSSE(runId) {
        if (_s.es) { _s.es.close(); }
        var es = new EventSource('/api/admin/centinel/stream/' + runId, { withCredentials: true });
        _s.es = es;

        es.onmessage = function (e) {
            var ev;
            try { ev = JSON.parse(e.data); } catch (_) { return; }
            _handleEvent(ev);
        };
        es.onerror = function () {
            es.close();
            _s.es = null;
            if (_s.status === 'running') {
                setTimeout(function () { _connectSSE(runId); }, 3000);
            }
        };
    }

    function _handleEvent(ev) {
        switch (ev.type) {
            case 'started':
                $$('ctn-subtitle').textContent = 'Ejecutando: ' + ev.target;
                break;
            case 'collecting':
                _s.totalTests = ev.count;
                $$('ctn-subtitle').textContent = 'Descubriendo ' + ev.count + ' tests…';
                break;
            case 'test':
                _handleTestEvent(ev);
                break;
            case 'summary':
                // handled on done
                break;
            case 'done':
                _s.es && _s.es.close();
                _s.es = null;
                _finalizeActiveFile();
                _setIdleUI(_s.results ? _buildLocalSummary() : {}, ev.failed_ids || []);
                _renderSummaryBar(_buildLocalSummary());
                $$('ctn-subtitle').textContent = 'Test runner del backend';
                _loadHistory();
                break;
            case 'aborted':
                _s.es && _s.es.close();
                _s.es = null;
                _finalizeActiveFile();
                _setIdleUI(_buildLocalSummary(), []);
                toast.show('Run abortado');
                _loadHistory();
                break;
            case 'error':
                _s.es && _s.es.close();
                _s.es = null;
                _setIdleUI({}, []);
                toast.error('Error en el run: ' + ev.message);
                break;
        }
    }

    function _buildLocalSummary() {
        var passed = 0, failed = 0, skipped = 0, total = 0;
        Object.values(_s.results).forEach(function (r) {
            passed += r.counts.passed;
            failed += r.counts.failed;
            skipped += r.counts.skipped;
            total += r.counts.passed + r.counts.failed + r.counts.skipped;
        });
        return { passed: passed, failed: failed, skipped: skipped };
    }

    // ── Test event ─────────────────────────────────────────────────────
    function _handleTestEvent(ev) {
        var file = ev.file;
        var status = ev.status;

        // Progress
        if (_s.totalTests > 0) {
            _setProgress(ev.progress, file);
        }

        // Crear sección si no existe (fallback: reconexión, o run lanzado sin árbol cargado)
        // Siempre en 'pending' para que el bloque de transición se ejecute correctamente
        if (!_s.results[file]) {
            _s.results[file] = {
                counts: { passed: 0, failed: 0, skipped: 0 },
                startTs: null, fileState: 'pending', inProgressRow: null,
            };
            _s.fileOrder.push(file);
            _createFileSection(file);
        }
        var fileData = _s.results[file];

        // Primer test de este archivo: transición pending → running
        if (fileData.fileState === 'pending') {
            fileData.fileState = 'running';
            fileData.startTs = Date.now();

            // El archivo anterior queda marcado como terminado
            if (_s.activeFile && _s.activeFile !== file) {
                var prev = _s.results[_s.activeFile];
                if (prev) prev.fileState = 'done';
                _updateInProgressTest(_s.activeFile);   // limpia ◌ del archivo anterior
                _updateFileSectionHeader(_s.activeFile);
                _setTreeRowActive(_s.activeFile, false);
            }
            _s.activeFile = file;
            _setTreeRowActive(file, true);
            _refreshActiveDirHighlight();               // resalta directorio activo

            // Auto-scroll al archivo activo en el panel de resultados
            if (fileData.secEl) {
                fileData.secEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        fileData.counts[status] = (fileData.counts[status] || 0) + 1;

        // Añadir fila al cuerpo (aunque esté colapsado, se inserta en el DOM)
        _appendTestRow(file, ev);
        _updateInProgressTest(file);                    // avanza ◌ al siguiente pendiente

        // Actualizar cabecera
        _updateFileSectionHeader(file);

        // Actualizar punto en el árbol
        _updateTreeDot(file, status);
    }

    function _createFileSection(file) {
        var secId = 'fsec-' + file.replace(/[^a-z0-9]/gi, '_');

        // Filas individuales pre-pobladas como "pendiente"
        var tests = (_s.testsByFile && _s.testsByFile[file]) || [];
        var bodyHtml = tests.map(function (name) {
            return '<div class="ctn-test-row pending" id="' + _rowId(file, name) + '"' +
                ' data-name="' + esc(name) + '" data-status="pending">' +
                '<span class="ctn-test-icon pending">' + ICONS.pending + '</span>' +
                '<span class="ctn-test-name pending">' + esc(name) + '</span>' +
                '</div>';
        }).join('');

        var el = document.createElement('div');
        el.className = 'ctn-file-section';
        el.id = secId;
        el.innerHTML =
            '<div class="ctn-file-sec-hdr">' +
            '<svg class="ctn-file-sec-chevron" viewBox="0 0 16 16" fill="none"><path d="M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span class="ctn-file-sec-name">' + esc(file) + '</span>' +
            '<div class="ctn-file-sec-badges" id="' + secId + '-badges"><span class="ctn-sec-badge pending">Pendiente</span></div>' +
            '<span class="ctn-file-sec-dur" id="' + secId + '-dur"></span>' +
            '</div>' +
            '<div class="ctn-file-sec-body collapsed" id="' + secId + '-body">' + bodyHtml + '</div>';
        // Listener sin inline handler (bloqueado por CSP en producción)
        el.querySelector('.ctn-file-sec-hdr').addEventListener('click', function () {
            _toggleFileSec(this);
        });

        var emptyState = $$('ctn-results').querySelector('.ctn-empty-state');
        if (emptyState) emptyState.remove();
        $$('ctn-results').appendChild(el);
        _s.results[file].secEl = el;
        _s.results[file].bodyEl = el.querySelector('#' + secId + '-body');
        _s.results[file].badgesEl = el.querySelector('#' + secId + '-badges');
        _s.results[file].durEl = el.querySelector('#' + secId + '-dur');
        _s.results[file].hdrNameEl = el.querySelector('.ctn-file-sec-name');
    }

    function _appendTestRow(file, ev) {
        var fd = _s.results[file];
        if (!fd || !fd.bodyEl) return;

        var icon = ICONS[ev.status] || '·';
        var finalStatus = ev.status === 'error' ? 'failed' : ev.status;
        var isClickable = finalStatus === 'failed';
        var tbId = 'tb-' + (file + '-' + ev.name).replace(/[^a-z0-9]/gi, '_');
        var rid = _rowId(file, ev.name);

        // Buscar fila pendiente pre-poblada; actualizar si existe
        var row = document.getElementById(rid);
        if (row) {
            row.className = 'ctn-test-row' + (isClickable ? ' clickable' : '');
            row.dataset.status = finalStatus;
            row.innerHTML =
                '<span class="ctn-test-icon ' + ev.status + '">' + icon + '</span>' +
                '<span class="ctn-test-name ' + ev.status + '">' + esc(ev.name) + '</span>';
            if (isClickable && ev.traceback) {
                row.addEventListener('click', function () {
                    var tb = document.getElementById(tbId);
                    if (tb) tb.classList.toggle('open');
                });
                var tbEl = document.createElement('pre');
                tbEl.className = 'ctn-traceback';
                tbEl.id = tbId;
                tbEl.textContent = ev.traceback;
                row.parentNode.insertBefore(tbEl, row.nextSibling);
            }
        } else {
            // Fallback: test no estaba en el árbol → crear fila nueva
            row = document.createElement('div');
            row.id = rid;
            row.className = 'ctn-test-row' + (isClickable ? ' clickable' : '');
            row.dataset.status = finalStatus;
            row.innerHTML =
                '<span class="ctn-test-icon ' + ev.status + '">' + icon + '</span>' +
                '<span class="ctn-test-name ' + ev.status + '">' + esc(ev.name) + '</span>';
            if (isClickable && ev.traceback) {
                row.addEventListener('click', function () {
                    var tb = document.getElementById(tbId);
                    if (tb) tb.classList.toggle('open');
                });
            }
            fd.bodyEl.appendChild(row);
            if (isClickable && ev.traceback) {
                var tbEl2 = document.createElement('pre');
                tbEl2.className = 'ctn-traceback';
                tbEl2.id = tbId;
                tbEl2.textContent = ev.traceback;
                fd.bodyEl.appendChild(tbEl2);
            }
        }

        // Aplicar filtro activo
        if (_s.filter !== 'all' && row.dataset.status !== _s.filter) {
            row.classList.add('hidden');
        } else {
            row.classList.remove('hidden');
        }
    }

    function _updateFileSectionHeader(file) {
        var fd = _s.results[file];
        if (!fd) return;
        if (fd.fileState === 'pending') return; // mantener badge "Pendiente"

        var isActive = file === _s.activeFile && fd.fileState !== 'done';
        var c = fd.counts;
        var badges = '';
        if (isActive) badges += '<span class="ctn-sec-badge running">◌</span>';
        if (c.passed) badges += '<span class="ctn-sec-badge passed">' + c.passed + ' ✓</span>';
        if (c.failed) badges += '<span class="ctn-sec-badge failed">' + c.failed + ' ✗</span>';
        if (c.skipped) badges += '<span class="ctn-sec-badge skipped">' + c.skipped + ' ⊘</span>';
        if (fd.badgesEl) fd.badgesEl.innerHTML = badges;
        if (fd.hdrNameEl) fd.hdrNameEl.classList.toggle('has-failed', c.failed > 0);
        if (fd.durEl && fd.startTs) {
            fd.durEl.textContent = ((Date.now() - fd.startTs) / 1000).toFixed(1) + 's';
        }
    }

    // Marca el primer test pendiente de un archivo como "en curso" (◌)
    function _updateInProgressTest(file) {
        var fd = _s.results[file];
        if (!fd || !fd.bodyEl) return;
        // Restaurar icono del anterior test "en curso"
        if (fd.inProgressRow) {
            var prevIcon = fd.inProgressRow.querySelector('.ctn-test-icon');
            if (prevIcon && prevIcon.textContent === ICONS.running) {
                prevIcon.className = 'ctn-test-icon pending';
                prevIcon.textContent = ICONS.pending;
            }
            fd.inProgressRow = null;
        }
        // Solo avanzar si el archivo sigue ejecutándose
        if (fd.fileState !== 'running') return;
        var nextRow = fd.bodyEl.querySelector('.ctn-test-row[data-status="pending"]');
        if (nextRow) {
            var icon = nextRow.querySelector('.ctn-test-icon');
            if (icon) {
                icon.className = 'ctn-test-icon running';
                icon.textContent = ICONS.running;
            }
            fd.inProgressRow = nextRow;
        }
    }

    // Resalta el directorio del árbol que contiene el archivo activo
    function _refreshActiveDirHighlight() {
        document.querySelectorAll('.ctn-dir-hdr.ctn-dir-active').forEach(function (h) {
            h.classList.remove('ctn-dir-active');
        });
        if (!_s.activeFile || !_s.treeData) return;
        (_s.treeData.dirs || []).forEach(function (dir) {
            if (dir.files.some(function (f) { return f.file === _s.activeFile; })) {
                var hdr = document.querySelector('.ctn-dir-hdr[data-dir="' + dir.dir.replace(/"/g, '\\"') + '"]');
                if (hdr) hdr.classList.add('ctn-dir-active');
            }
        });
    }

    function _setTreeRowActive(file, active) {
        var row = document.querySelector('.ctn-file-row[data-file="' + file.replace(/"/g, '\\"') + '"]');
        if (row) row.classList.toggle('ctn-file-active', active);
    }

    function _updateTreeDot(file, status) {
        var dotId = 'fdot-' + file.replace(/[^a-z0-9]/gi, '_');
        var dot = document.getElementById(dotId);
        if (!dot) return;
        var fd = _s.results[file];
        if (!fd) return;
        var finalStatus = fd.counts.failed > 0 ? 'failed' : fd.counts.passed > 0 ? 'passed' : 'skipped';
        dot.className = 'ctn-file-dot ' + finalStatus;
    }

    function _finalizeActiveFile() {
        if (_s.activeFile && _s.results[_s.activeFile]) {
            _s.results[_s.activeFile].fileState = 'done';
            _updateInProgressTest(_s.activeFile);   // limpia ◌ del último archivo
            _updateFileSectionHeader(_s.activeFile);
            _setTreeRowActive(_s.activeFile, false);
        }
        _s.activeFile = null;
        _refreshActiveDirHighlight();               // desactiva highlight de directorio
    }

    function _clearResults() {
        _s.activeFile = null;
        var res = $$('ctn-results');
        res.innerHTML = '<div class="ctn-empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity=".3"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><p>Ejecutando…</p></div>';
        document.querySelectorAll('.ctn-file-dot').forEach(function (d) { d.className = 'ctn-file-dot'; });
        document.querySelectorAll('.ctn-file-active').forEach(function (r) { r.classList.remove('ctn-file-active'); });
        $$('ctn-summary-bar').style.display = 'none';
    }

    function _renderSummaryBar(summary) {
        var bar = $$('ctn-summary-bar');
        var total = (summary.passed || 0) + (summary.failed || 0) + (summary.skipped || 0);
        var dur = summary.duration_s ? _fmtDur(summary.duration_s) : '';
        bar.innerHTML =
            '<span class="ctn-badge passed">✓ ' + (summary.passed || 0) + ' pasados</span>' +
            (summary.failed ? '<span class="ctn-badge failed">✗ ' + summary.failed + ' fallidos</span>' : '') +
            (summary.skipped ? '<span class="ctn-badge skipped">⊘ ' + summary.skipped + ' omitidos</span>' : '') +
            '<span class="ctn-badge">' + total + ' en total</span>' +
            (dur ? '<span class="ctn-badge duration">⏱ ' + dur + '</span>' : '');
        bar.style.display = 'flex';
    }

    function _fmtDur(secs) {
        if (secs < 60) return secs.toFixed(1) + 's';
        var m = Math.floor(secs / 60);
        var s = Math.round(secs % 60);
        return m + 'm ' + s + 's';
    }

    // ── History ────────────────────────────────────────────────────────
    async function _loadHistory() {
        try {
            var items = await api.get('/api/admin/centinel/history');
            _renderHistory(items);
        } catch (e) { /* ignore */ }
    }

    function _renderHistory(items) {
        var el = $$('ctn-history');
        if (!items || items.length === 0) {
            el.innerHTML = '<div class="ctn-history-empty">Sin ejecuciones previas</div>';
            return;
        }
        el.innerHTML = items.map(function (item) {
            var s = item.summary || {};
            var dotClass = s.failed ? 'failed' : (item.status === 'aborted' ? 'aborted' : item.status);
            var dur = item.finished_at && item.started_at
                ? _fmtDur(item.finished_at - item.started_at) : '—';
            var date = item.started_at ? new Date(item.started_at * 1000).toLocaleString('es', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            }) : '—';
            var target = item.target || '';
            return '<div class="ctn-history-row">' +
                '<div class="ctn-history-dot ' + dotClass + '"></div>' +
                '<span class="ctn-history-date">' + esc(date) + '</span>' +
                '<span class="ctn-history-target" title="' + esc(target) + '">' + esc(target) + '</span>' +
                '<div class="ctn-history-summary">' +
                (s.passed !== undefined ? '<span class="ctn-badge passed" style="font-size:11px">✓ ' + s.passed + '</span>' : '') +
                (s.failed ? '<span class="ctn-badge failed"  style="font-size:11px">✗ ' + s.failed + '</span>' : '') +
                (s.skipped ? '<span class="ctn-badge skipped" style="font-size:11px">⊘ ' + s.skipped + '</span>' : '') +
                '</div>' +
                '<span class="ctn-history-dur">' + esc(dur) + '</span>' +
                '</div>';
        }).join('');
    }

    // ── Toggles (llamados desde HTML) ──────────────────────────────────
    function _toggleFileSec(hdr) {
        var chevron = hdr.querySelector('.ctn-file-sec-chevron');
        var body = hdr.nextElementSibling;
        var isOpen = chevron.classList.contains('open');
        chevron.classList.toggle('open', !isOpen);
        body.classList.toggle('collapsed', isOpen);
    }

    // ── Public API ─────────────────────────────────────────────────────
    return {
        init: init,
        _toggleDir: _toggleDir,
        _toggleFile: _toggleFile,
        _onFileCheck: _onFileCheck,
        _toggleFileSec: _toggleFileSec,
    };
}());
