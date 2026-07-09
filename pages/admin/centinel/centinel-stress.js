// centinel-stress.js — Tab de prueba de rendimiento / stress test
'use strict';

(function () {
    // ── Estado ──────────────────────────────────────────────────────────────
    var _pollTimer = null;
    var _runId = null;
    var _running = false;
    var _lastTickCount = 0;
    var _animFrame = null;

    // Datos de la gráfica (acumulados desde el backend)
    var _ticks = [];    // [{tick, avg_ms, p95_ms, rps, count, errors, min_ms, max_ms}]

    // ── DOM refs ─────────────────────────────────────────────────────────────
    function $$(id) { return document.getElementById(id); }

    // ── Tabs de sección (Funcionalidad / Rendimiento) ──────────────────────
    function _initSectionTabs() {
        document.querySelectorAll('.ctn-section-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var section = btn.dataset.section;
                document.querySelectorAll('.ctn-section-tab').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                var isFunctional = section === 'functional';
                // Mostrar/ocultar paneles
                $$('ctn-progress-wrap').style.display = isFunctional ? '' : 'none';
                $$('ctn-summary-bar').style.display = isFunctional ? '' : 'none';
                var layout = document.querySelector('.ctn-layout');
                if (layout) layout.style.display = isFunctional ? '' : 'none';
                $$('ctn-section-functional').style.display = isFunctional ? '' : 'none';
                $$('ctn-section-stress').style.display = isFunctional ? 'none' : '';
                // Mostrar/ocultar acciones
                $$('ctn-actions-functional').style.display = isFunctional ? '' : 'none';
                $$('ctn-actions-stress').style.display = isFunctional ? 'none' : '';
            });
        });
    }

    // ── Controles de configuración ──────────────────────────────────────────
    var _duration = 30;
    var _rampUp = 0;
    var _timeout = 10;   // timeout por petición en segundos

    function _initControls() {
        // Slider de usuarios
        var slider = $$('stress-users');
        var sliderVal = $$('stress-users-val');
        var customWrap = $$('stress-users-custom-wrap');
        var customInput = $$('stress-users-custom');
        if (slider) {
            slider.addEventListener('input', function () {
                var atMax = parseInt(slider.value, 10) >= 1000;
                sliderVal.textContent = slider.value;
                if (customWrap) customWrap.style.display = atMax ? '' : 'none';
            });
        }

        // Pills duración
        document.querySelectorAll('#stress-duration-pills .stress-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#stress-duration-pills .stress-pill').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                _duration = parseInt(btn.dataset.value, 10);
            });
        });

        // Pills ramp-up
        document.querySelectorAll('#stress-rampup-pills .stress-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#stress-rampup-pills .stress-pill').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                _rampUp = parseInt(btn.dataset.value, 10);
            });
        });

        // Pills timeout
        document.querySelectorAll('#stress-timeout-pills .stress-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#stress-timeout-pills .stress-pill').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                _timeout = parseFloat(btn.dataset.value);
            });
        });

        // Select endpoint → mostrar/ocultar custom input; bloquear método si Random
        var sel = $$('stress-endpoint-select');
        var custom = $$('stress-custom-path');
        var methodSel = $$('stress-method');
        if (sel && custom) {
            function _applyEndpointMode() {
                custom.style.display = sel.value === 'custom' ? '' : 'none';
                if (sel.value === 'RANDOM') {
                    methodSel.value = 'RANDOM';
                    methodSel.disabled = true;
                } else {
                    methodSel.disabled = false;
                    if (methodSel.value === 'RANDOM') methodSel.value = 'GET';
                }
            }
            sel.addEventListener('change', _applyEndpointMode);
            _applyEndpointMode(); // aplicar estado inicial
        }

        // Botón ⓘ Ramp-up
        var infoBtn = $$('btn-rampup-info');
        var tooltip = $$('stress-rampup-tooltip');
        var closeBtn = $$('btn-rampup-info-close');
        if (infoBtn && tooltip) {
            infoBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                tooltip.style.display = tooltip.style.display === 'none' ? '' : 'none';
            });
        }
        if (closeBtn && tooltip) {
            closeBtn.addEventListener('click', function () { tooltip.style.display = 'none'; });
        }
        document.addEventListener('click', function (e) {
            if (tooltip && !tooltip.contains(e.target) && e.target !== infoBtn) {
                tooltip.style.display = 'none';
            }
        });

        // Botones
        var btnRun = $$('btn-stress-run');
        var btnAbort = $$('btn-stress-abort');
        var btnExport = $$('btn-stress-export');
        if (btnRun) btnRun.addEventListener('click', _startStress);
        if (btnAbort) btnAbort.addEventListener('click', _abortStress);
        if (btnExport) btnExport.addEventListener('click', _exportCsv);
    }

    // ── Obtener configuración actual ────────────────────────────────────────
    function _getConfig() {
        var sel = $$('stress-endpoint-select');
        var path = sel.value === 'custom'
            ? ($$('stress-custom-path').value.trim() || '/api/auth/me')
            : sel.value;   // incluye "RANDOM"
        var method = $$('stress-method').value;
        var users = parseInt($$('stress-users').value, 10);
        // Si el slider está en el tope y hay un custom input visible, usarlo
        var customWrap = $$('stress-users-custom-wrap');
        var customInput = $$('stress-users-custom');
        if (customWrap && customWrap.style.display !== 'none' && customInput) {
            var customVal = parseInt(customInput.value, 10);
            if (!isNaN(customVal) && customVal > 1000) users = customVal;
        }
        var fluctuate = !!($$('stress-fluctuate') && $$('stress-fluctuate').checked);
        return {
            method: method,
            path: path,
            users: users,
            duration: _duration,
            ramp_up: _rampUp,
            timeout: _timeout,
            fluctuate_users: fluctuate,
            token: '',
        };
    }

    // ── Iniciar prueba ──────────────────────────────────────────────────────
    async function _startStress() {
        if (_running) return;
        _running = true;
        _ticks = [];
        _lastTickCount = 0;
        _renderedErrors = 0;
        _clearChart();
        $$('stress-summary').style.display = 'none';
        var errCard = $$('stress-errors-card');
        if (errCard) { errCard.style.display = 'none'; var tb = $$('stress-errors-body'); if (tb) tb.innerHTML = ''; }
        $$('stress-chart-empty').style.display = 'none';
        $$('btn-stress-run').style.display = 'none';
        $$('btn-stress-abort').style.display = '';

        try {
            var cfg = _getConfig();
            var resp = await fetch('/api/admin/centinel/stress/run', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg),
            });
            if (!resp.ok) {
                var err = await resp.json().catch(function () { return {}; });
                throw new Error(err.detail || 'Error iniciando prueba');
            }
            var data = await resp.json();
            _runId = data.run_id;
            _startPolling();
        } catch (e) {
            _setIdle();
            if (window.toast) toast(e.message, 'error');
        }
    }

    // ── Polling HTTP (evita conflictos con el SSE de funcionalidad) ─────────
    function _startPolling() {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(_poll, 800);
        _poll();
    }

    async function _poll() {
        try {
            var r = await fetch('/api/admin/centinel/stress/status', { credentials: 'include' });
            if (!r.ok) return;
            var data = await r.json();

            if (data.ticks && data.ticks.length > _lastTickCount) {
                var newTicks = data.ticks.slice(_lastTickCount);
                _lastTickCount = data.ticks.length;
                newTicks.forEach(function (t) { _ticks.push(t); });
                if (_ticks.length > 0) {
                    $$('stress-chart-empty').style.display = 'none';
                    _drawChart();
                }
            }

            // Tabla de errores en tiempo real
            if (data.errors && data.errors.length > 0) {
                _renderErrors(data.errors);
            }

            if (data.status === 'done' || data.status === 'error' || data.status === 'aborted') {
                if (data.result && data.result.total > 0) _showSummary(data.result);
                if (data.errors) _renderErrors(data.errors);
                _setIdle();
            }
        } catch (_) { }
    }

    // ── Tabla de errores ────────────────────────────────────────────────────
    var _renderedErrors = 0;

    function _renderErrors(errors) {
        _lastErrors = errors;   // guardar para Top 3
        var card = $$('stress-errors-card');
        var tbody = $$('stress-errors-body');
        var badge = $$('stress-errors-count');
        if (!card || !tbody) return;

        if (errors.length === 0) { card.style.display = 'none'; return; }

        card.style.display = '';
        if (badge) badge.textContent = errors.length;

        // Solo añadir filas nuevas (evitar re-renderizar toda la tabla)
        if (errors.length > _renderedErrors) {
            var newErrors = errors.slice(_renderedErrors);
            _renderedErrors = errors.length;
            newErrors.forEach(function (e) {
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td class="se-t">' + e.t + 's</td>' +
                    '<td class="se-method se-method--' + (e.method || 'GET').toLowerCase() + '">' + (e.method || '–') + '</td>' +
                    '<td class="se-path" title="' + (e.path || '') + '">' + (e.path || '–') + '</td>' +
                    '<td class="se-code se-code--' + (e.status ? (e.status >= 500 ? 'err' : 'warn') : 'conn') + '">' + (e.status || '–') + '</td>' +
                    '<td class="se-msg">' + _escErr(e.msg || '–') + '</td>' +
                    '<td class="se-ms">' + e.ms + '</td>';
                tbody.appendChild(tr);
            });
            // Auto-scroll al fondo si hay scroll
            var wrap = card.querySelector('.stress-errors-wrap');
            if (wrap) wrap.scrollTop = wrap.scrollHeight;
        }
        _renderTop3Errors();  // actualizar Top 3 con cada nuevo error
    }

    function _escErr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Abortar ─────────────────────────────────────────────────────────────
    async function _abortStress() {
        try {
            await fetch('/api/admin/centinel/stress/run', { method: 'DELETE', credentials: 'include' });
        } catch (_) { }
        _setIdle();
    }

    function _setIdle() {
        _running = false;
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
        $$('btn-stress-run').style.display = '';
        $$('btn-stress-abort').style.display = 'none';
    }

    // ── Resumen ──────────────────────────────────────────────────────────────
    function _showSummary(ev) {
        $$('stress-summary').style.display = '';
        var errorPct = ev.total > 0 ? ((ev.errors / ev.total) * 100).toFixed(1) + '%' : '0%';
        [
            ['sstat-total', ev.total],
            ['sstat-errors', ev.errors + ' (' + errorPct + ')'],
            ['sstat-rps', ev.rps + ' req/s'],
            ['sstat-avg', ev.avg_ms + ' ms'],
            ['sstat-p50', ev.p50_ms + ' ms'],
            ['sstat-p90', ev.p90_ms + ' ms'],
            ['sstat-p95', ev.p95_ms + ' ms'],
            ['sstat-p99', ev.p99_ms + ' ms'],
            ['sstat-min', ev.min_ms + ' ms'],
            ['sstat-max', ev.max_ms + ' ms'],
        ].forEach(function (pair) {
            var el = $$(pair[0]);
            if (el) {
                el.textContent = pair[1];
                if (pair[0] === 'sstat-errors' && ev.errors > 0) el.style.color = 'var(--danger)';
            }
        });

        // Top 3 endpoints con más fallos (se calcula del array de errores acumulado)
        _renderTop3Errors();
    }

    function _renderTop3Errors() {
        var top3El = $$('stress-top3');
        if (!top3El) return;

        var errors = _lastErrors || [];
        if (errors.length === 0) { top3El.style.display = 'none'; return; }
        top3El.style.display = '';

        // Top 3 endpoints con más fallos
        var endpointCounts = {};
        errors.forEach(function (e) {
            var key = (e.method || 'GET') + ' ' + (e.path || '?');
            endpointCounts[key] = (endpointCounts[key] || 0) + 1;
        });
        var topEndpoints = Object.keys(endpointCounts).sort(function (a, b) {
            return endpointCounts[b] - endpointCounts[a];
        }).slice(0, 3);

        // Top 3 tipos de error
        var msgCounts = {};
        errors.forEach(function (e) {
            // Normalizar: quitar detalles variables (IPs, IDs…), quedarse con el tipo
            var msg = (e.msg || 'Error desconocido').split(':')[0].trim();
            if (e.status) msg = 'HTTP ' + e.status;
            msgCounts[msg] = (msgCounts[msg] || 0) + 1;
        });
        var topMsgs = Object.keys(msgCounts).sort(function (a, b) {
            return msgCounts[b] - msgCounts[a];
        }).slice(0, 3);

        var total = errors.length;
        var htmlE = '', htmlM = '';

        if (topEndpoints.length) {
            htmlE += '<div class="stress-top3-title">Top endpoints</div>';
            topEndpoints.forEach(function (key, i) {
                var parts = key.split(' ');
                var method = parts[0];
                var path = parts.slice(1).join(' ');
                var cls = method === 'GET' ? 'se-method--get' : method === 'DELETE' ? 'se-method--delete' : 'se-method--post';
                var pct = ((endpointCounts[key] / total) * 100).toFixed(1) + '%';
                htmlE += '<div class="stress-top3-row">' +
                    '<span class="stress-top3-rank">' + (i + 1) + '</span>' +
                    '<span class="se-method ' + cls + '">' + method + '</span>' +
                    '<span class="stress-top3-path" title="' + path + '">' + path + '</span>' +
                    '<span class="stress-top3-count">' + pct + '</span>' +
                    '</div>';
            });
        }

        if (topMsgs.length) {
            htmlM += '<div class="stress-top3-title">Top tipos de error</div>';
            topMsgs.forEach(function (msg, i) {
                var pct = ((msgCounts[msg] / total) * 100).toFixed(1) + '%';
                htmlM += '<div class="stress-top3-row">' +
                    '<span class="stress-top3-rank">' + (i + 1) + '</span>' +
                    '<span class="stress-top3-path stress-top3-err" title="' + msg + '">' + msg + '</span>' +
                    '<span class="stress-top3-count">' + pct + '</span>' +
                    '</div>';
            });
        }

        var html = '';
        if (htmlE) html += '<div class="stress-top3-col">' + htmlE + '</div>';
        if (htmlM) html += '<div class="stress-top3-col">' + htmlM + '</div>';
        top3El.innerHTML = html;
    }

    var _lastErrors = [];

    // ── Exportar CSV ─────────────────────────────────────────────────────────
    function _exportCsv() {
        var lines = ['tick,count,errors,avg_ms,p95_ms,min_ms,max_ms,rps'];
        _ticks.forEach(function (t) {
            lines.push([t.tick, t.count, t.errors, t.avg_ms, t.p95_ms, t.min_ms, t.max_ms, t.rps].join(','));
        });
        var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'stress-' + (new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ── Gráfica Canvas ───────────────────────────────────────────────────────
    var _canvas, _ctx;
    var PAD = { top: 16, right: 60, bottom: 36, left: 56 };

    function _initCanvas() {
        _canvas = $$('stress-canvas');
        if (!_canvas) return;
        _ctx = _canvas.getContext('2d');
        _resizeCanvas();
        window.addEventListener('resize', _resizeCanvas);
    }

    function _resizeCanvas() {
        if (!_canvas) return;
        var wrap = _canvas.parentElement;
        _canvas.width = wrap.clientWidth || 600;
        _canvas.height = wrap.clientHeight || 240;
        _drawChart();
    }

    function _clearChart() {
        if (!_ctx) return;
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    }

    function _drawChart() {
        if (!_ctx || !_ticks.length) return;
        if (_animFrame) cancelAnimationFrame(_animFrame);
        _animFrame = requestAnimationFrame(_doDrawChart);
    }

    function _doDrawChart() {
        var W = _canvas.width, H = _canvas.height;
        var cW = W - PAD.left - PAD.right;
        var cH = H - PAD.top - PAD.bottom;
        var cs = getComputedStyle(document.documentElement);
        var colorBg = cs.getPropertyValue('--surface').trim() || '#fff';
        var colorLine = cs.getPropertyValue('--line').trim() || '#e2e8f0';
        var colorInk = cs.getPropertyValue('--ink-3').trim() || '#94a3b8';

        _ctx.clearRect(0, 0, W, H);

        // Datos
        var maxMs = Math.max(1, ..._ticks.map(function (t) { return t.p95_ms || 0; }));
        var maxRps = Math.max(1, ..._ticks.map(function (t) { return t.rps || 0; }));
        var N = _ticks.length;

        // Detectar punto de quiebre (primer tick con tasa de error > 5%)
        var breakTick = -1;
        for (var bi = 0; bi < _ticks.length; bi++) {
            var t = _ticks[bi];
            var errRate = t.count > 0 ? (t.errors / t.count) : 0;
            if (errRate > 0.05) { breakTick = bi; break; }
        }

        // Grid
        _ctx.strokeStyle = colorLine;
        _ctx.lineWidth = 1;
        _ctx.setLineDash([3, 3]);
        var gridLines = 4;
        for (var i = 0; i <= gridLines; i++) {
            var y = PAD.top + (cH / gridLines) * i;
            _ctx.beginPath();
            _ctx.moveTo(PAD.left, y);
            _ctx.lineTo(PAD.left + cW, y);
            _ctx.stroke();
            var val = Math.round(maxMs * (1 - i / gridLines));
            _ctx.fillStyle = colorInk;
            _ctx.font = '10px Inter, sans-serif';
            _ctx.textAlign = 'right';
            _ctx.fillText(val + 'ms', PAD.left - 6, y + 4);
        }
        _ctx.setLineDash([]);

        // Eje X (segundos)
        _ctx.fillStyle = colorInk;
        _ctx.textAlign = 'center';
        _ctx.font = '10px Inter, sans-serif';
        var step = Math.max(1, Math.ceil(N / 6));
        for (var j = 0; j < N; j += step) {
            var x = PAD.left + (j / Math.max(N - 1, 1)) * cW;
            _ctx.fillText(j + 's', x, H - PAD.bottom + 14);
        }

        // Barras req/s (fondo)
        _ticks.forEach(function (t, idx) {
            var barX = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var barH = cH * (t.rps / maxRps);
            _ctx.fillStyle = 'rgba(99,102,241,0.12)';
            _ctx.fillRect(barX - 2, PAD.top + cH - barH, 4, barH);
        });

        // Marcador de punto de quiebre (línea vertical roja)
        if (breakTick >= 0) {
            var bx = PAD.left + (breakTick / Math.max(N - 1, 1)) * cW;
            _ctx.strokeStyle = 'rgba(239,68,68,0.7)';
            _ctx.lineWidth = 1.5;
            _ctx.setLineDash([4, 3]);
            _ctx.beginPath();
            _ctx.moveTo(bx, PAD.top);
            _ctx.lineTo(bx, PAD.top + cH);
            _ctx.stroke();
            _ctx.setLineDash([]);
            _ctx.fillStyle = '#ef4444';
            _ctx.font = 'bold 9px Inter, sans-serif';
            _ctx.textAlign = 'left';
            _ctx.fillText('quiebre', bx + 3, PAD.top + 10);
        }

        // Línea p95_ms
        _ctx.strokeStyle = '#ef4444';
        _ctx.lineWidth = 1.5;
        _ctx.beginPath();
        _ticks.forEach(function (t, idx) {
            var x = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var y = PAD.top + cH - (t.p95_ms / maxMs) * cH;
            idx === 0 ? _ctx.moveTo(x, y) : _ctx.lineTo(x, y);
        });
        _ctx.stroke();

        // Línea avg_ms
        _ctx.strokeStyle = '#22c55e';
        _ctx.lineWidth = 2;
        _ctx.beginPath();
        _ticks.forEach(function (t, idx) {
            var x = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var y = PAD.top + cH - (t.avg_ms / maxMs) * cH;
            idx === 0 ? _ctx.moveTo(x, y) : _ctx.lineTo(x, y);
        });
        _ctx.stroke();

        // Eje der (req/s)
        _ctx.fillStyle = 'rgba(99,102,241,0.6)';
        _ctx.textAlign = 'left';
        _ctx.font = '10px Inter, sans-serif';
        _ctx.fillText(Math.round(maxRps) + ' req/s', PAD.left + cW + 6, PAD.top + 12);

        // Último tick como texto
        var last = _ticks[_ticks.length - 1];
        if (last) {
            _ctx.fillStyle = '#22c55e';
            _ctx.textAlign = 'right';
            _ctx.font = 'bold 11px Inter, sans-serif';
            var lx = PAD.left + cW;
            var ly = PAD.top + cH - (last.avg_ms / maxMs) * cH - 6;
            _ctx.fillText(last.avg_ms + 'ms', lx, Math.max(PAD.top + 12, ly));
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        _initSectionTabs();
        _initControls();
        _initCanvas();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
