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
    var _ticks = [];    // [{tick, avg_s, p95_s, rps, count, errors, min_s, max_s}]

    // ── DOM refs ─────────────────────────────────────────────────────────────
    function $$(id) { return document.getElementById(id); }

    // ── Tabs de sección (Funcionalidad / Rendimiento) ──────────────────────
    function _initSectionTabs() {
        var ALL_SECTIONS = ['functional', 'stress', 'probe'];
        document.querySelectorAll('.ctn-section-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var section = btn.dataset.section;
                document.querySelectorAll('.ctn-section-tab').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                var isFunctional = section === 'functional';
                // Elementos exclusivos de funcionalidad
                $$('ctn-progress-wrap').style.display = isFunctional ? '' : 'none';
                $$('ctn-summary-bar').style.display = isFunctional ? '' : 'none';
                var layout = document.querySelector('.ctn-layout');
                if (layout) layout.style.display = isFunctional ? '' : 'none';
                // Mostrar sección y acciones correctas
                ALL_SECTIONS.forEach(function (s) {
                    var sec = $$('ctn-section-' + s);
                    var act = $$('ctn-actions-' + s);
                    if (sec) sec.style.display = s === section ? '' : 'none';
                    if (act) act.style.display = s === section ? '' : 'none';
                });
                // Redimensionar canvas al hacerse visibles
                if (section === 'stress') _resizeCanvas();
                if (section === 'probe') _resizeProbeCanvas();
            });
        });
    }

    // ── Controles de configuración ──────────────────────────────────────────
    var _duration = 30;
    var _rampUp = 0;
    var _timeout = 10;

    function _concFmt(v) {
        return v === 0 ? '∞' : String(v);
    }

    function _initControls() {
        // Cargar default de concurrencia desde la config de plataforma — es
        // solo un prefill del slider, el test respeta lo que se pida aquí
        // (incluido "sin límite") sin importar lo configurado en admin/config.
        api.get('/api/settings/platform').then(function (cfg) {
            var def = cfg.stress_max_concurrency ?? 0;
            var slider = $$('stress-concurrency');
            var valEl = $$('stress-concurrency-val');
            if (!slider) return;
            if (def <= 1000) {
                slider.value = def;
                if (valEl) valEl.textContent = _concFmt(def);
            } else {
                slider.value = 1000;
                if (valEl) valEl.textContent = 1000;
                var wrap = $$('stress-concurrency-custom-wrap');
                var inp = $$('stress-concurrency-custom');
                if (wrap) wrap.style.display = '';
                if (inp) inp.value = def;
            }
        }).catch(function () { /* mantener default */ });

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

        // Slider concurrencia máxima
        var concSlider = $$('stress-concurrency');
        var concVal = $$('stress-concurrency-val');
        var concCustomWrap = $$('stress-concurrency-custom-wrap');
        if (concSlider) {
            concSlider.addEventListener('input', function () {
                var v = parseInt(concSlider.value, 10);
                var atMax = v >= 1000;
                concVal.textContent = _concFmt(v);
                if (concCustomWrap) concCustomWrap.style.display = atMax ? '' : 'none';
            });
        }

        // Pills concurrencia máxima (mantenidas por compatibilidad: ya no existen en el HTML)
        document.querySelectorAll('#stress-concurrency-pills .stress-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#stress-concurrency-pills .stress-pill').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
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
        // Leer concurrencia desde el slider
        var concurrency = parseInt($$('stress-concurrency').value, 10);  // 0 = sin límite
        var concCustomWrap = $$('stress-concurrency-custom-wrap');
        var concCustomInput = $$('stress-concurrency-custom');
        if (concCustomWrap && concCustomWrap.style.display !== 'none' && concCustomInput) {
            var cVal = parseInt(concCustomInput.value, 10);
            if (!isNaN(cVal)) concurrency = cVal;
        }
        return {
            method: method,
            path: path,
            users: users,
            duration: _duration,
            ramp_up: _rampUp,
            timeout: _timeout,
            max_concurrency: concurrency,
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
        var capNotice = $$('stress-cap-notice');
        if (capNotice) capNotice.style.display = 'none';

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

            // Aviso si el backend capó los usuarios reales por debajo de lo pedido
            // (límite de seguridad de hilos nativos, ver _MAX_THREADS en centinel.py)
            var capNotice = $$('stress-cap-notice');
            if (capNotice) {
                if (data.effective_users && data.requested_users && data.effective_users < data.requested_users) {
                    var capText = $$('stress-cap-notice-text');
                    if (capText) {
                        capText.textContent = 'Se pidieron ' + data.requested_users + ' usuarios pero el servidor limita a ' +
                            data.effective_users + ' hilos simultáneos por petición de estrés. Los resultados reflejan ' +
                            data.effective_users + ' usuarios reales, no ' + data.requested_users + '.';
                    }
                    capNotice.style.display = '';
                } else {
                    capNotice.style.display = 'none';
                }
            }

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
                    '<td class="se-ms">' + e.s + '</td>';
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
        var btnAbort = $$('btn-stress-abort');
        if (btnAbort) { btnAbort.disabled = true; btnAbort.textContent = 'Deteniendo…'; }
        try {
            await fetch('/api/admin/centinel/stress/run', { method: 'DELETE', credentials: 'include' });
        } catch (_) { }
        _setIdle();
    }

    function _setIdle() {
        _running = false;
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
        var btnRun = $$('btn-stress-run');
        var btnAbort = $$('btn-stress-abort');
        if (btnRun) { btnRun.style.display = ''; }
        if (btnAbort) { btnAbort.style.display = 'none'; btnAbort.disabled = false; btnAbort.textContent = 'Detener'; }
    }

    // ── Resumen ──────────────────────────────────────────────────────────────
    function _showSummary(ev) {
        $$('stress-summary').style.display = '';
        var errorPct = ev.total > 0 ? ((ev.errors / ev.total) * 100).toFixed(1) + '%' : '0%';
        [
            ['sstat-total', ev.total],
            ['sstat-errors', ev.errors + ' (' + errorPct + ')'],
            ['sstat-avg', ev.avg_s + ' s'],
            ['sstat-avg-per-user', ev.avg_per_user_s + ' s'],
        ].forEach(function (pair) {
            var el = $$(pair[0]);
            if (el) {
                el.textContent = pair[1];
                if (pair[0] === 'sstat-errors' && ev.errors > 0) el.style.color = 'var(--danger)';
            }
        });

        // Media por usuario notablemente peor que la media global: algunos
        // hilos están recibiendo peor servicio que otros, no solo "hay carga".
        var perUserEl = $$('sstat-avg-per-user');
        if (perUserEl) {
            var muchWorse = ev.avg_s > 0 && ev.avg_per_user_s > ev.avg_s * 1.15;
            perUserEl.style.color = muchWorse ? 'var(--danger)' : '';
        }

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
        var lines = ['tick,count,errors,avg_s,p95_s,min_s,max_s,rps,active_users'];
        _ticks.forEach(function (t) {
            lines.push([t.tick, t.count, t.errors, t.avg_s, t.p95_s, t.min_s, t.max_s, t.rps, t.active_users || 0].join(','));
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
        // Cada color hace un solo trabajo: good/critical = status (línea Media
        // vs su propia media acumulada, marcador de quiebre); p95/users/rps =
        // identidad de serie, sin significado bueno/malo (ver centinel-stress.css).
        var colorGood = cs.getPropertyValue('--chart-good').trim() || '#0ca30c';
        var colorCritical = cs.getPropertyValue('--chart-critical').trim() || '#d03b3b';
        var colorP95 = cs.getPropertyValue('--chart-p95').trim() || '#3987e5';
        var colorUsers = cs.getPropertyValue('--chart-users').trim() || '#d55181';
        var colorRps = cs.getPropertyValue('--chart-rps').trim() || '#9085e9';

        _ctx.clearRect(0, 0, W, H);

        // Datos
        var maxS = Math.max(0.001, ..._ticks.map(function (t) { return t.p95_s || 0; }));
        var maxRps = Math.max(1, ..._ticks.map(function (t) { return t.rps || 0; }));
        var maxUsers = Math.max(1, ..._ticks.map(function (t) { return t.active_users || 0; }));
        var N = _ticks.length;

        // Media móvil ponderada (por nº de peticiones) del tiempo de resolución
        // ANTES de cada tick — sirve de referencia para pintar cada tramo de la
        // línea "Media" en rojo (peor que lo visto hasta ahora) o verde (mejor).
        var cumWeightedSum = 0, cumCount = 0;
        var cumAvgBefore = _ticks.map(function (t) {
            var baseline = cumCount > 0 ? (cumWeightedSum / cumCount) : t.avg_s;
            cumWeightedSum += (t.avg_s || 0) * (t.count || 0);
            cumCount += (t.count || 0);
            return baseline;
        });

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
            var val = (maxS * (1 - i / gridLines)).toFixed(3);
            _ctx.fillStyle = colorInk;
            _ctx.font = '10px Inter, sans-serif';
            _ctx.textAlign = 'right';
            _ctx.fillText(val + 's', PAD.left - 6, y + 4);
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

        // Barras req/s (fondo) — identidad, no status: opacidad baja para que
        // quede detrás de las líneas de Media/p95/Usuarios sin competir con ellas.
        _ctx.globalAlpha = 0.14;
        _ctx.fillStyle = colorRps;
        _ticks.forEach(function (t, idx) {
            var barX = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var barH = cH * (t.rps / maxRps);
            _ctx.fillRect(barX - 2, PAD.top + cH - barH, 4, barH);
        });
        _ctx.globalAlpha = 1;

        // Marcador de punto de quiebre — status "critical": mismo color que los
        // tramos rojos de la línea Media, porque representa el mismo concepto
        // (tasa de error > 5%), no una serie nueva.
        if (breakTick >= 0) {
            var bx = PAD.left + (breakTick / Math.max(N - 1, 1)) * cW;
            _ctx.strokeStyle = colorCritical;
            _ctx.globalAlpha = 0.7;
            _ctx.lineWidth = 1.5;
            _ctx.setLineDash([4, 3]);
            _ctx.beginPath();
            _ctx.moveTo(bx, PAD.top);
            _ctx.lineTo(bx, PAD.top + cH);
            _ctx.stroke();
            _ctx.setLineDash([]);
            _ctx.globalAlpha = 1;
            _ctx.fillStyle = colorCritical;
            _ctx.font = 'bold 9px Inter, sans-serif';
            _ctx.textAlign = 'left';
            _ctx.fillText('quiebre', bx + 3, PAD.top + 10);
        }

        // Línea p95_s — identidad (magnitud), no status: no reutiliza el rojo
        // de "Media empeorando" para no confundirse con esa señal.
        _ctx.strokeStyle = colorP95;
        _ctx.lineWidth = 1.5;
        _ctx.beginPath();
        _ticks.forEach(function (t, idx) {
            var x = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var y = PAD.top + cH - (t.p95_s / maxS) * cH;
            idx === 0 ? _ctx.moveTo(x, y) : _ctx.lineTo(x, y);
        });
        _ctx.stroke();

        // Línea de usuarios activos (eje propio 0..maxUsers, misma altura de
        // gráfica) — identidad, discontinua para diferenciarla por forma además
        // de por color de las líneas de tiempo de respuesta.
        _ctx.strokeStyle = colorUsers;
        _ctx.lineWidth = 1.5;
        _ctx.setLineDash([2, 2]);
        _ctx.beginPath();
        _ticks.forEach(function (t, idx) {
            var x = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var y = PAD.top + cH - ((t.active_users || 0) / maxUsers) * cH;
            idx === 0 ? _ctx.moveTo(x, y) : _ctx.lineTo(x, y);
        });
        _ctx.stroke();
        _ctx.setLineDash([]);

        // Línea "Media" (avg_s) coloreada tramo a tramo: rojo si ese segundo
        // resolvió peor que la media acumulada hasta ese momento, verde si mejor.
        // Así se ve en vivo si subir usuarios concurrentes penaliza la latencia.
        for (var segIdx = 1; segIdx < N; segIdx++) {
            var x0 = PAD.left + ((segIdx - 1) / Math.max(N - 1, 1)) * cW;
            var y0 = PAD.top + cH - (_ticks[segIdx - 1].avg_s / maxS) * cH;
            var x1 = PAD.left + (segIdx / Math.max(N - 1, 1)) * cW;
            var y1 = PAD.top + cH - (_ticks[segIdx].avg_s / maxS) * cH;
            var worse = _ticks[segIdx].avg_s > cumAvgBefore[segIdx];
            _ctx.strokeStyle = worse ? colorCritical : colorGood;
            _ctx.lineWidth = 2.5;
            _ctx.beginPath();
            _ctx.moveTo(x0, y0);
            _ctx.lineTo(x1, y1);
            _ctx.stroke();
        }
        // Puntos por tick, mismo criterio de color (visible también con 1 solo tick)
        _ticks.forEach(function (t, idx) {
            var x = PAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var y = PAD.top + cH - (t.avg_s / maxS) * cH;
            var worse = idx > 0 && t.avg_s > cumAvgBefore[idx];
            _ctx.fillStyle = worse ? colorCritical : colorGood;
            _ctx.beginPath();
            _ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            _ctx.fill();
        });

        // Eje der (req/s y usuarios activos)
        _ctx.textAlign = 'left';
        _ctx.font = '10px Inter, sans-serif';
        _ctx.globalAlpha = 0.8;
        _ctx.fillStyle = colorRps;
        _ctx.fillText(Math.round(maxRps) + ' req/s', PAD.left + cW + 6, PAD.top + 12);
        _ctx.fillStyle = colorUsers;
        _ctx.fillText(Math.round(maxUsers) + ' usuarios', PAD.left + cW + 6, PAD.top + 26);
        _ctx.globalAlpha = 1;

        // Último tick como texto
        var last = _ticks[_ticks.length - 1];
        if (last) {
            var lastWorse = N > 1 && last.avg_s > cumAvgBefore[N - 1];
            _ctx.fillStyle = lastWorse ? colorCritical : colorGood;
            _ctx.textAlign = 'right';
            _ctx.font = 'bold 11px Inter, sans-serif';
            var lx = PAD.left + cW;
            var ly = PAD.top + cH - (last.avg_s / maxS) * cH - 6;
            _ctx.fillText(last.avg_s.toFixed(3) + 's', lx, Math.max(PAD.top + 12, ly));
        }
    }

    // ── Probe: búsqueda automática de punto de quiebre ───────────────────────
    var _probeTimer = null;
    var _probeDuration = 30;

    function _initProbe() {
        var btnStart = $$('btn-probe-start');
        var btnAbort = $$('btn-probe-abort');
        if (btnStart) btnStart.addEventListener('click', _startProbe);
        if (btnAbort) btnAbort.addEventListener('click', _abortProbe);
        // Pills duración por paso
        document.querySelectorAll('#probe-duration-pills .stress-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#probe-duration-pills .stress-pill').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                _probeDuration = parseInt(btn.dataset.value, 10);
            });
        });
        _initProbeCanvas();
    }

    // ── Probe canvas ──────────────────────────────────────────────
    var _probeCanvas, _probeCtx, _probeAnimFrame;
    var PPAD = { top: 20, right: 64, bottom: 44, left: 54 };

    function _initProbeCanvas() {
        _probeCanvas = $$('probe-canvas');
        if (!_probeCanvas) return;
        _probeCtx = _probeCanvas.getContext('2d');
        _resizeProbeCanvas();
        window.addEventListener('resize', _resizeProbeCanvas);
    }

    function _resizeProbeCanvas() {
        if (!_probeCanvas) return;
        var wrap = _probeCanvas.parentElement;
        _probeCanvas.width = wrap.clientWidth || 600;
        _probeCanvas.height = wrap.clientHeight || 220;
        _doDrawProbeChart([], []);
    }

    function _drawProbeChart(ticks, steps) {
        if (!_probeCtx) return;
        if (_probeAnimFrame) cancelAnimationFrame(_probeAnimFrame);
        _probeAnimFrame = requestAnimationFrame(function () { _doDrawProbeChart(ticks, steps); });
    }

    function _doDrawProbeChart(ticks, steps) {
        if (!_probeCtx) return;
        var W = _probeCanvas.width, H = _probeCanvas.height;
        var cW = W - PPAD.left - PPAD.right;
        var cH = H - PPAD.top - PPAD.bottom;
        var cs = getComputedStyle(document.documentElement);
        var colorLine = cs.getPropertyValue('--line').trim() || '#e2e8f0';
        var colorInk = cs.getPropertyValue('--ink-3').trim() || '#94a3b8';
        var colorBg = cs.getPropertyValue('--surface').trim() || '#fff';

        _probeCtx.clearRect(0, 0, W, H);

        if (!ticks || !ticks.length) {
            _probeCtx.fillStyle = colorInk;
            _probeCtx.font = '12px Inter, sans-serif';
            _probeCtx.textAlign = 'center';
            _probeCtx.fillText('Inicia la búsqueda para ver la gráfica en tiempo real', W / 2, H / 2);
            return;
        }

        var N = ticks.length;
        var maxRps = Math.max(1, ...ticks.map(function (t) { return t.rps || 0; }));
        var maxAvg = Math.max(0.001, ...ticks.map(function (t) { return t.avg_s || 0; }));
        var maxUsers = Math.max(1, ...ticks.map(function (t) { return t.users || 0; }));

        // Bandas de paso (colores alternos)
        var bandColors = ['rgba(99,102,241,0.07)', 'rgba(34,197,94,0.07)'];
        var prevUsers = null, bandStart = 0, bandIdx = 0;
        var drawnLabels = [];
        for (var bi = 0; bi <= N; bi++) {
            var curU = bi < N ? ticks[bi].users : null;
            if (curU !== prevUsers) {
                if (prevUsers !== null) {
                    var bx1 = PPAD.left + (bandStart / Math.max(N - 1, 1)) * cW;
                    var bx2 = PPAD.left + (bi / Math.max(N - 1, 1)) * cW;
                    _probeCtx.fillStyle = bandColors[bandIdx % 2];
                    _probeCtx.fillRect(bx1, PPAD.top, bx2 - bx1, cH);
                    drawnLabels.push({ cx: (bx1 + bx2) / 2, users: prevUsers });
                    bandIdx++;
                }
                bandStart = bi;
                prevUsers = curU;
            }
        }
        // última banda
        var blx = PPAD.left + (bandStart / Math.max(N - 1, 1)) * cW;
        _probeCtx.fillStyle = bandColors[bandIdx % 2];
        _probeCtx.fillRect(blx, PPAD.top, PPAD.left + cW - blx, cH);
        drawnLabels.push({ cx: (blx + PPAD.left + cW) / 2, users: prevUsers });

        // Grid horizontal
        _probeCtx.strokeStyle = colorLine;
        _probeCtx.lineWidth = 1;
        _probeCtx.setLineDash([3, 3]);
        for (var gi = 0; gi <= 4; gi++) {
            var gy = PPAD.top + (cH / 4) * gi;
            _probeCtx.beginPath();
            _probeCtx.moveTo(PPAD.left, gy);
            _probeCtx.lineTo(PPAD.left + cW, gy);
            _probeCtx.stroke();
            _probeCtx.fillStyle = colorInk;
            _probeCtx.font = '10px Inter, sans-serif';
            _probeCtx.textAlign = 'right';
            _probeCtx.fillText(Math.round(maxRps * (1 - gi / 4)), PPAD.left - 5, gy + 4);
        }
        _probeCtx.setLineDash([]);

        // Separadores de paso
        var seenU = new Set();
        ticks.forEach(function (t, i) {
            if (!seenU.has(t.users)) {
                seenU.add(t.users);
                if (i > 0) {
                    var sx = PPAD.left + (i / Math.max(N - 1, 1)) * cW;
                    _probeCtx.strokeStyle = colorLine;
                    _probeCtx.lineWidth = 1.5;
                    _probeCtx.beginPath();
                    _probeCtx.moveTo(sx, PPAD.top);
                    _probeCtx.lineTo(sx, PPAD.top + cH);
                    _probeCtx.stroke();
                }
            }
        });

        // Barras req/s (verde si ok, rojo si hay errores)
        ticks.forEach(function (t, idx) {
            var bx = PPAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var barH = cH * (t.rps / maxRps);
            _probeCtx.fillStyle = t.errors > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)';
            _probeCtx.fillRect(bx - 2, PPAD.top + cH - barH, 4, barH);
        });

        // Línea avg_s (púrpura)
        _probeCtx.strokeStyle = '#6366f1';
        _probeCtx.lineWidth = 2;
        _probeCtx.beginPath();
        ticks.forEach(function (t, idx) {
            var lx = PPAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var ly = PPAD.top + cH - (t.avg_s / maxAvg) * cH;
            idx === 0 ? _probeCtx.moveTo(lx, ly) : _probeCtx.lineTo(lx, ly);
        });
        _probeCtx.stroke();

        // Puntos de error (rojo)
        ticks.forEach(function (t, idx) {
            if (t.errors > 0) {
                var ex = PPAD.left + (idx / Math.max(N - 1, 1)) * cW;
                _probeCtx.fillStyle = '#ef4444';
                _probeCtx.beginPath();
                _probeCtx.arc(ex, PPAD.top + 8, 4, 0, Math.PI * 2);
                _probeCtx.fill();
            }
        });

        // Línea escalonada de usuarios (naranja, eje derecho)
        _probeCtx.strokeStyle = '#f97316';
        _probeCtx.lineWidth = 2.5;
        _probeCtx.setLineDash([]);
        _probeCtx.beginPath();
        var prevU = null;
        ticks.forEach(function (t, idx) {
            var ux = PPAD.left + (idx / Math.max(N - 1, 1)) * cW;
            var uy = PPAD.top + cH - (t.users / maxUsers) * cH;
            if (idx === 0) {
                _probeCtx.moveTo(ux, uy);
            } else if (t.users !== prevU) {
                // Salto vertical primero (línea escalonada)
                _probeCtx.lineTo(ux, uy);
            } else {
                _probeCtx.lineTo(ux, uy);
            }
            prevU = t.users;
        });
        _probeCtx.stroke();

        // Etiquetas de usuario por banda
        drawnLabels.forEach(function (l) {
            _probeCtx.fillStyle = 'rgba(99,102,241,0.8)';
            _probeCtx.font = 'bold 9px Inter, sans-serif';
            _probeCtx.textAlign = 'center';
            _probeCtx.fillText((l.users || '?') + ' u', l.cx, PPAD.top + cH + 30);
        });

        // Eje derecho: avg_s máximo (púrpura) + usuarios máximo (naranja)
        _probeCtx.font = '10px Inter, sans-serif';
        _probeCtx.textAlign = 'left';
        _probeCtx.fillStyle = 'rgba(99,102,241,0.8)';
        _probeCtx.fillText(maxAvg.toFixed(3) + 's', PPAD.left + cW + 5, PPAD.top + 12);
        _probeCtx.fillStyle = 'rgba(249,115,22,0.9)';
        _probeCtx.fillText(maxUsers + ' u', PPAD.left + cW + 5, PPAD.top + 24);
    }

    function _probeConfig() {
        var start = parseInt($$('probe-start').value, 10) || 10;
        var step = parseInt($$('probe-step').value, 10) || 50;
        var concurrency = parseInt(($$('probe-concurrency') || {}).value, 10) || 50;
        var timeout = parseFloat(($$('probe-timeout') || {}).value) || 10;
        return {
            start_users: start, step: step,
            duration: _probeDuration, max_concurrency: concurrency,
            timeout: timeout, token: ''
        };
    }

    async function _startProbe() {
        var btnStart = $$('btn-probe-start');
        var btnAbort = $$('btn-probe-abort');
        var verdict = $$('probe-verdict');
        if (btnStart) btnStart.style.display = 'none';
        if (btnAbort) btnAbort.style.display = '';
        if (verdict) { verdict.style.display = 'none'; verdict.innerHTML = ''; }

        try {
            var cfg = _probeConfig();
            await api.post('/api/admin/centinel/stress/probe', cfg);
            _probeTimer = setInterval(_pollProbe, 1200);
        } catch (err) {
            toast && toast('Error al iniciar búsqueda: ' + err.message, 'error');
            _setProbeIdle();
        }
    }

    async function _abortProbe() {
        var btnAbort = $$('btn-probe-abort');
        if (btnAbort) { btnAbort.disabled = true; btnAbort.textContent = 'Deteniendo…'; } try { await fetch('/api/admin/centinel/stress/probe', { method: 'DELETE', credentials: 'include' }); } catch (_) { }
        _setProbeIdle();
    }

    function _setProbeIdle() {
        if (_probeTimer) { clearInterval(_probeTimer); _probeTimer = null; }
        var btnStart = $$('btn-probe-start');
        var btnAbort = $$('btn-probe-abort');
        if (btnStart) btnStart.style.display = '';
        if (btnAbort) btnAbort.style.display = 'none';
    }

    async function _pollProbe() {
        try {
            var data = await api.get('/api/admin/centinel/stress/probe');
            _drawProbeChart(data.ticks || [], data.steps || []);
            if (data.status !== 'running') {
                _setProbeIdle();
                if (data.verdict) _showProbeVerdict(data.verdict, data.status);
            }
        } catch (_) { }
    }

    function _renderProbeSteps(steps) {
        var el = $$('probe-steps');
        if (!el) return;
        el.innerHTML = '';
        if (!steps.length) return;

        var html = '<table class="probe-table"><thead><tr>' +
            '<th>Usuarios</th><th>Req/s</th><th>Errores</th><th>Avg s</th><th>Estado</th>' +
            '</tr></thead><tbody>';
        steps.forEach(function (s) {
            var isRunning = s.status === 'running';
            var isOk = s.status === 'ok';
            var isFail = s.status === 'fail';
            var statusHtml = isRunning
                ? '<span class="probe-status probe-status--running"><span class="probe-spinner"></span>Probando\u2026</span>'
                : isOk
                    ? '<span class="probe-status probe-status--ok">\u2713 Estable</span>'
                    : '<span class="probe-status probe-status--fail">\u2717 Errores</span>';
            var errPct = s.total > 0 ? ((s.errors / s.total) * 100).toFixed(1) + '%' : '\u2013';
            html += '<tr class="' + (isFail ? 'probe-row--fail' : isRunning ? 'probe-row--running' : '') + '">' +
                '<td><strong>' + s.users + '</strong></td>' +
                '<td>' + (s.rps || '\u2013') + '</td>' +
                '<td>' + (s.errors ? s.errors + ' (' + errPct + ')' : '0') + '</td>' +
                '<td>' + (s.avg_s != null ? s.avg_s.toFixed(3) : '\u2013') + '</td>' +
                '<td>' + statusHtml + '</td>' +
                '</tr>';
        });
        html += '</tbody></table>';
        el.innerHTML = html;
    }

    function _showProbeVerdict(v, finalStatus) {
        var el = $$('probe-verdict');
        if (!el) return;
        el.style.display = '';
        if (finalStatus === 'aborted') {
            el.innerHTML = '<div class="probe-verdict-banner probe-verdict--warn">⚠️ Búsqueda detenida manualmente.' +
                (v && v.stable_users ? ' Último nivel estable: <strong>' + v.stable_users + ' usuarios</strong>.' : '') +
                '</div>';
            return;
        }
        if (!v) return;
        var total = v.break_total ? v.break_total.toLocaleString('es') : null;
        var errPct = v.error_rate != null ? (v.error_rate * 100).toFixed(1) : '?';
        if (v.break_users === null) {
            el.innerHTML = '<div class="probe-verdict-banner probe-verdict--ok">' +
                '✅ No se encontraron errores hasta <strong>' + (v.stable_users || '?') + ' usuarios</strong>. ' +
                'Aumenta el paso para explorar más.' +
                '</div>';
        } else if (v.stable_users === null) {
            el.innerHTML = '<div class="probe-verdict-banner probe-verdict--fail">' +
                '❌ <strong>Primer fallo a los ' + v.break_users + ' usuarios simultáneos</strong>' +
                (total ? ' &middot; <strong>' + total + ' peticiones</strong> concurrentes' : '') +
                ' &middot; ' + errPct + '% errores' +
                '<div style="font-size:11px;color:var(--ink-3);margin-top:4px">El servidor muestra problemas desde el primer nivel. Puede haber carga previa.</div>' +
                '</div>';
        } else {
            el.innerHTML = '<div class="probe-verdict-banner probe-verdict--warn">' +
                '<div class="probe-verdict-row">' +
                '<span class="probe-verdict-ok">✅ Estable hasta <strong>' + v.stable_users + ' usuarios</strong></span>' +
                '<span class="probe-verdict-sep">→</span>' +
                '<span class="probe-verdict-fail">❌ Primer fallo a los <strong>' + v.break_users + ' usuarios simultáneos</strong>' +
                (total ? ' &middot; <strong>' + total + '</strong> peticiones concurrentes' : '') +
                ' &middot; ' + errPct + '% errores</span>' +
                '</div>' +
                '</div>';
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        _initSectionTabs();
        _initControls();
        _initCanvas();
        _initProbe();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
