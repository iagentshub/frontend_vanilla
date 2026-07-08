// theme-early.js — Aplica el tema guardado antes del primer render para evitar FOUC.
// IMPORTANTE: debe cargarse de forma síncrona (sin defer/async) en <head>.
(function () {
    var m = {
        noir: 'dark-red', marble: 'light-red', ember: 'dark-orange',
        ocean: 'dark-blue', forest: 'dark-red', dusk: 'dark-purple', light: 'light-red'
    };
    var t = localStorage.getItem('ga-theme') || 'dark-red';
    t = m[t] || t;
    document.documentElement.setAttribute('data-theme', t);
    // Fijar color-scheme YA (síncrono, antes del primer paint): sin esto el
    // navegador pinta su lienzo BLANCO por defecto entre navegaciones, causando
    // el pestañeo en temas oscuros. Con color-scheme el lienzo ya es oscuro.
    document.documentElement.style.colorScheme = (t.indexOf('light') === 0) ? 'light' : 'dark';
})();
