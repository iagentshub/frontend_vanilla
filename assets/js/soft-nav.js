// soft-nav.js — Router del lado cliente (SPA-lite) para iAgents Hub. v2
//
// Al navegar entre vistas de la app NO se recarga el documento: el nav
// (#nav-root) PERSISTE (mismo nodo DOM → cero pestañeo) y solo se intercambia
// <main class="page-content"> con un deslizamiento sutil.
//
// Requisitos que cumplen los scripts de página (auditado):
//  · Sin let/const/class a nivel superior (usan var/function, re-declarables).
//    La re-ejecución en cada navegación resetea su estado sobre el DOM nuevo.
//  · Los listeners sobre document/window registrados por la vista se etiquetan
//    por "época" y se limpian al salir de ella (evita duplicados).
//  · Las vistas que arrancan con DOMContentLoaded reciben un DCL sintético.
//
// Fuera de la allowlist PILOT (login, /u/<usuario>, docs públicas…) la
// navegación es la normal del navegador. Ante cualquier error: fallback a
// recarga completa (location.href).
'use strict';

(function (global) {
    if (global.__softNav) return;
    global.__softNav = true;

    var CONTENT_SEL = '.page-content';
    var NAV_SEL = '#nav-root';
    var PILOT = [
        '/dashboard', '/explore', '/agents', '/knowledge', '/connections',
        '/labels', '/manager', '/memory', '/profile',
        '/admin', '/admin/metadata', '/admin/centinel', '/admin/logs'
    ];

    // ─── Épocas de listeners (document y window) ────────────────────────────
    var _epoch = 0;
    var _scoped = [];
    var _docAdd = document.addEventListener.bind(document);
    var _docRemove = document.removeEventListener.bind(document);
    var _winAdd = window.addEventListener.bind(window);
    var _winRemove = window.removeEventListener.bind(window);

    document.addEventListener = function (type, fn, opts) {
        if (_epoch > 0) _scoped.push({ t: 'doc', epoch: _epoch, type: type, fn: fn, opts: opts });
        return _docAdd(type, fn, opts);
    };
    window.addEventListener = function (type, fn, opts) {
        if (_epoch > 0) _scoped.push({ t: 'win', epoch: _epoch, type: type, fn: fn, opts: opts });
        return _winAdd(type, fn, opts);
    };

    function _clearEpoch(ep) {
        _scoped = _scoped.filter(function (l) {
            if (l.epoch !== ep) return true;
            (l.t === 'doc' ? _docRemove : _winRemove)(l.type, l.fn, l.opts);
            return false;
        });
    }

    // ─── Utilidades ─────────────────────────────────────────────────────────
    function _path(url) {
        var p = new URL(url, location.href).pathname;
        return p.length > 1 ? p.replace(/\/$/, '') : p;
    }
    function _isPilot(url) { return PILOT.indexOf(_path(url)) !== -1; }

    function _isInternal(a) {
        if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#') return false;
        if (a.dataset && a.dataset.noSoftnav !== undefined) return false;
        var u; try { u = new URL(a.href, location.href); } catch (e) { return false; }
        return u.origin === location.origin && u.pathname.indexOf('/api/') !== 0;
    }

    function _pageScriptSrcs(root) {
        // Scripts específicos de la vista = todo lo que NO vive en /assets/.
        return Array.prototype.map.call(root.querySelectorAll('script[src]'), function (s) {
            return s.getAttribute('src');
        }).filter(function (src) { return src && src.indexOf('/assets/') !== 0 && src.indexOf('http') !== 0; });
    }

    function _missingGlobalScripts(doc) {
        // Componentes /assets/ que la vista destino necesita y aún no están
        // cargados (p.ej. skill-catalog al ir de agents → knowledge). Se cargan
        // UNA vez y persisten (no se re-ejecutan si ya existen).
        var have = {};
        Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
            have[s.getAttribute('src')] = true;
        });
        return Array.prototype.map.call(doc.querySelectorAll('script[src]'), function (s) {
            return s.getAttribute('src');
        }).filter(function (src) {
            return src && src.indexOf('/assets/') === 0 && !have[src];
        });
    }

    function _loadGlobalScripts(srcs) {
        return srcs.reduce(function (p, src) {
            return p.then(function () {
                return new Promise(function (res) {
                    var el = document.createElement('script');
                    el.src = src;
                    el.onload = el.onerror = function () { res(); };
                    document.body.appendChild(el);
                });
            });
        }, Promise.resolve());
    }

    function _isViewFurniture(el) {
        // Hijos de <body> propios de la vista (modales, overlays…): todo lo que
        // no sea el shell (contiene el nav), scripts o links.
        if (el.tagName === 'SCRIPT' || el.tagName === 'LINK') return false;
        if (el.id === 'nav-root') return false;
        if (el.querySelector && el.querySelector('#nav-root')) return false; // .app-shell
        return true;
    }

    function _tagInitialFurniture() {
        Array.prototype.forEach.call(document.body.children, function (el) {
            if (_isViewFurniture(el)) el.setAttribute('data-soft-view', '');
        });
    }

    function _swapFurniture(doc) {
        // fuera los modales/overlays de la vista anterior…
        Array.prototype.forEach.call(document.querySelectorAll('body > [data-soft-view]'), function (el) {
            el.remove();
        });
        // …y dentro los de la vista destino (adoptados del doc parseado)
        Array.prototype.slice.call(doc.body.children).forEach(function (el) {
            if (!_isViewFurniture(el)) return;
            el.setAttribute('data-soft-view', '');
            document.body.appendChild(el);
        });
    }

    function _injectMissingStyles(doc) {
        // Hojas de estilo de la vista destino que faltan en el documento actual.
        // Se esperan a que carguen ANTES del intercambio para evitar FOUC.
        var have = {};
        Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
            have[l.getAttribute('href')] = true;
        });
        var waits = [];
        Array.prototype.forEach.call(doc.querySelectorAll('link[rel="stylesheet"]'), function (l) {
            var href = l.getAttribute('href');
            if (!href || have[href]) return;
            waits.push(new Promise(function (res) {
                var el = document.createElement('link');
                el.rel = 'stylesheet';
                el.href = href;
                el.onload = el.onerror = function () { res(); };
                document.head.appendChild(el);
            }));
        });
        return Promise.all(waits);
    }

    function _runScripts(srcs) {
        Array.prototype.forEach.call(document.querySelectorAll('script[data-soft-page]'), function (s) { s.remove(); });
        return srcs.reduce(function (p, src) {
            return p.then(function () {
                return new Promise(function (res) {
                    var el = document.createElement('script');
                    el.src = src;
                    el.setAttribute('data-soft-page', '');
                    el.onload = el.onerror = function () { res(); };
                    document.body.appendChild(el);
                });
            });
        }, Promise.resolve());
    }

    // ─── Animación: deslizamiento sutil del contenido ───────────────────────
    function _direction(from, to) {
        var i = PILOT.indexOf(_path(from)), j = PILOT.indexOf(_path(to));
        if (i === -1 || j === -1) return 1;
        return j >= i ? 1 : -1;
    }

    function _animateSwap(oldEl, newEl, dir) {
        // Reemplazo en flujo normal (el nuevo contenido ocupa su sitio en el
        // flex junto al nav — NUNCA se superpone). Solo un fundido sutil con
        // un desplazamiento mínimo en la dirección del viaje.
        return new Promise(function (resolve) {
            oldEl.replaceWith(newEl);
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) { resolve(); return; }
            newEl.style.opacity = '0';
            newEl.style.transform = 'translateX(' + (dir * 10) + 'px)';
            requestAnimationFrame(function () {
                newEl.style.transition = 'transform .18s cubic-bezier(.4,0,.2,1), opacity .15s ease';
                newEl.style.opacity = '1';
                newEl.style.transform = 'translateX(0)';
            });
            setTimeout(function () {
                newEl.style.transition = newEl.style.transform = newEl.style.opacity = '';
                resolve();
            }, 200);
        });
    }

    // ─── Navegación ─────────────────────────────────────────────────────────
    var _busy = false;
    function navigate(url, opts) {
        opts = opts || {};
        if (!_isPilot(url)) { location.href = url; return; }
        if (_busy) return;
        _busy = true;
        var from = location.pathname;

        return fetch(url, { headers: { 'X-Soft-Nav': '1' } })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var newContent = doc.querySelector(CONTENT_SEL);
                var curContent = document.querySelector(CONTENT_SEL);
                if (!newContent || !curContent) { location.href = url; return; }

                _clearEpoch(_epoch);
                _epoch += 1;
                if (doc.title) document.title = doc.title;
                if (!opts.pop) history.pushState({ soft: true }, '', url);
                _updateActiveNav(url);

                // CSS y componentes globales que la vista destino necesite y falten
                return Promise.all([_injectMissingStyles(doc), _loadGlobalScripts(_missingGlobalScripts(doc))]).then(function () {
                    _swapFurniture(doc); // modales/overlays de la vista (fuera de .page-content)
                    return _animateSwap(curContent, newContent, _direction(from, url));
                }).then(function () {
                    if (global.i18n && global.i18n.applyDOM) global.i18n.applyDOM(newContent);
                    return _runScripts(_pageScriptSrcs(doc));
                }).then(function () {
                    // Vistas que arrancan con DOMContentLoaded (ya disparado):
                    // les damos un DCL sintético. Los globales no escuchan DCL.
                    try { document.dispatchEvent(new Event('DOMContentLoaded')); } catch (e) { }
                });
            })
            .catch(function () { location.href = url; })
            .then(function () { _busy = false; window.scrollTo(0, 0); });
    }

    function _updateActiveNav(url) {
        var path = _path(url);
        document.querySelectorAll(NAV_SEL + ' .nav-link, ' + NAV_SEL + ' .nav-icon-btn').forEach(function (el) {
            var href = (el.getAttribute('href') || '').replace(/\/$/, '');
            el.classList.toggle('active', !!href && href === path);
        });
    }

    // ─── Interceptar clics + botón atrás ────────────────────────────────────
    _docAdd('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || !_isInternal(a) || !_isPilot(a.href)) return;
        e.preventDefault();
        navigate(a.href);
    });

    _winAdd('popstate', function () {
        if (_isPilot(location.href)) navigate(location.href, { pop: true });
        else location.reload();
    });

    // Los scripts de la vista inicial corren solos (defer) tras este router.
    // Abrimos la época 1 para que sus listeners sean limpiables al navegar.
    _epoch = 1;
    _tagInitialFurniture();

    global.softNav = { navigate: navigate };
}(window));
