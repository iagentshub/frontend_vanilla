// theme.js — gestión de temas
'use strict';

(function () {
    var LEGACY = {
        'noir':   'dark-red',
        'marble': 'light-red',
        'ember':  'dark-orange',
        'ocean':  'dark-blue',
        'forest': 'dark-red',
        'dusk':   'dark-purple',
        'light':  'light-red'
    };

    function _resolve(t) { return LEGACY[t] || t || 'dark-red'; }

    var saved = _resolve(localStorage.getItem('ga-theme'));
    document.documentElement.setAttribute('data-theme', saved);

    window.THEMES = [
        { id: 'dark-red',     name: 'Rojo',    dark: true,  mode: 'dark',  accent: 'red',    bg: '#0A0A0A', accentColor: '#FF3B30' },
        { id: 'dark-blue',    name: 'Azul',    dark: true,  mode: 'dark',  accent: 'blue',   bg: '#0A0A0A', accentColor: '#0A84FF' },
        { id: 'dark-orange',  name: 'Naranja', dark: true,  mode: 'dark',  accent: 'orange', bg: '#0A0A0A', accentColor: '#ffa31a' },
        { id: 'dark-purple',  name: 'Morado',  dark: true,  mode: 'dark',  accent: 'purple', bg: '#0A0A0A', accentColor: '#BF5AF2' },
        { id: 'light-red',    name: 'Rojo',    dark: false, mode: 'light', accent: 'red',    bg: '#F5F5F7', accentColor: '#E0282A' },
        { id: 'light-blue',   name: 'Azul',    dark: false, mode: 'light', accent: 'blue',   bg: '#F5F5F7', accentColor: '#006ADB' },
        { id: 'light-orange', name: 'Naranja', dark: false, mode: 'light', accent: 'orange', bg: '#F5F5F7', accentColor: '#d4870e' },
        { id: 'light-purple', name: 'Morado',  dark: false, mode: 'light', accent: 'purple', bg: '#F5F5F7', accentColor: '#7B2FF7' },
    ];

    window.getTheme = function () {
        return _resolve(document.documentElement.getAttribute('data-theme') || 'dark-red');
    };

    window.setTheme = function (theme) {
        var t = _resolve(theme);
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.style.colorScheme = (t.indexOf('light') === 0) ? 'light' : 'dark';
        localStorage.setItem('ga-theme', t);
    };

    window._syncThemeFromServer = function () {
        fetch('/api/settings')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (s) {
                if (s && s.theme) {
                    var t = _resolve(s.theme);
                    if (t !== window.getTheme()) window.setTheme(t);
                }
            })
            .catch(function () { });
    };
}());
