// i18n.js — lightweight i18n engine, no external deps
'use strict';

(function (global) {
    var _cache = {};       // { 'es/common': {...}, ... }
    var _lang = 'es';
    var _fallback = 'es';
    var _listeners = [];
    var _namespaces = ['common', 'agents', 'skills', 'connections', 'auth', 'memory', 'profile', 'admin', 'dashboard', 'docs', 'about', 'teams', 'manager', 'social', 'explore', 'labels'];
    var _ready = false;
    var _readyCallbacks = [];

    var STORAGE_KEY = 'ga-lang';
    var SUPPORTED = ['es', 'en'];

    function _detectLang() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
        var browser = (navigator.language || navigator.userLanguage || 'es').slice(0, 2).toLowerCase();
        return SUPPORTED.indexOf(browser) !== -1 ? browser : 'es';
    }

    function _get(obj, path) {
        return path.split('.').reduce(function (acc, k) {
            return acc && acc[k] !== undefined ? acc[k] : undefined;
        }, obj);
    }

    function _interpolate(str, params) {
        if (!params || typeof str !== 'string') return str;
        return str.replace(/\{\{(\w+)\}\}/g, function (_, k) {
            return params[k] !== undefined ? params[k] : '{{' + k + '}}';
        });
    }

    function _loadNs(lang, ns) {
        var key = lang + '/' + ns;
        if (_cache[key]) return Promise.resolve(_cache[key]);
        return fetch('/assets/locales/' + lang + '/' + ns + '.json')
            .then(function (r) {
                if (!r.ok) throw new Error('i18n: missing ' + key);
                return r.json();
            })
            .then(function (data) {
                _cache[key] = data;
                return data;
            });
    }

    function _loadAll(lang) {
        return Promise.all(_namespaces.map(function (ns) { return _loadNs(lang, ns); }));
    }

    function t(key, params) {
        // key format: 'namespace.path.to.string' or 'path.to.string' (defaults to common)
        var parts = key.split('.');
        var ns, path;
        if (_namespaces.indexOf(parts[0]) !== -1) {
            ns = parts[0];
            path = parts.slice(1).join('.');
        } else {
            ns = 'common';
            path = key;
        }

        var nsKey = _lang + '/' + ns;
        var fbKey = _fallback + '/' + ns;

        var val = _get(_cache[nsKey], path)
               || _get(_cache[fbKey], path)
               || key;

        return _interpolate(val, params);
    }

    function setLang(lang) {
        if (SUPPORTED.indexOf(lang) === -1) return;
        if (lang === _lang) return;
        _lang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.setAttribute('lang', lang);
        return _loadAll(lang).then(function () {
            _listeners.forEach(function (fn) { fn(lang); });
        });
    }

    function getLang() { return _lang; }

    function onLangChange(fn) { _listeners.push(fn); }

    function offLangChange(fn) {
        _listeners = _listeners.filter(function (l) { return l !== fn; });
    }

    function ready(fn) {
        if (_ready) { fn(); return; }
        _readyCallbacks.push(fn);
    }

    function applyDOM(root) {
        root = root || document;
        root.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
        });
        root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            el.title = t(el.getAttribute('data-i18n-title'));
        });
    }

    function init() {
        _lang = _detectLang();
        document.documentElement.setAttribute('lang', _lang);
        var loads = _lang !== _fallback
            ? [_loadAll(_lang), _loadAll(_fallback)]
            : [_loadAll(_lang)];
        return Promise.all(loads).then(function () {
            _ready = true;
            applyDOM();
            _readyCallbacks.forEach(function (fn) { fn(); });
            _readyCallbacks = [];
            onLangChange(function () { applyDOM(); });
        });
    }

    global.i18n = { t: t, setLang: setLang, getLang: getLang, onLangChange: onLangChange, offLangChange: offLangChange, ready: ready, init: init, applyDOM: applyDOM, SUPPORTED: SUPPORTED };
    global.t = t;

    // Auto-init on script load
    init();

}(window));
