// landing.js — lógica de la landing page (extraído de pages/index.html para
// cumplir con la CSP de producción que prohíbe scripts inline).

// "/" decide entre landing (SaaS público) o ir directo a /login/, y ajusta
// el header según config + sesión. Ambos fetches se combinan con
// Promise.all (en vez de dejarlos sueltos) para evitar una condición de
// carrera: si "sesión activa" resolviera después que "config", podría
// reaparecer "Crear cuenta gratis" para un usuario ya autenticado.
Promise.all([
    fetch('/api/settings/platform/public').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('/api/auth/me').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
]).then(function (results) {
    var cfg = results[0];
    var user = results[1];

    if (!cfg || !cfg.landing_enabled) { location.replace('/login/'); return; }
    document.getElementById('landing-page').style.display = 'block';

    var loginBtn = document.getElementById('landing-header-login');
    var registerBtn = document.getElementById('landing-header-register');
    var isAuthenticated = !!(user && user.username);

    if (isAuthenticated) {
        // Ya tiene cuenta: "Crear cuenta" no aplica, "Iniciar sesión" lleva al dashboard.
        if (registerBtn) registerBtn.style.display = 'none';
        if (loginBtn) {
            loginBtn.href = '/dashboard';
            loginBtn.removeAttribute('data-i18n');
            loginBtn.textContent = '→ Dashboard';
        }
    } else {
        // "Crear cuenta gratis": mismo criterio que /login/ (login.js) —
        // solo visible con registro abierto y facturación desactivada.
        // Oculto por defecto en el HTML para que nunca parpadee.
        var showRegister = cfg.registration === 'open' && cfg.billing_enabled === false;
        if (registerBtn && showRegister) registerBtn.style.display = '';
    }
}).catch(function () { location.replace('/login/'); });

// Copiar comando de instalación
document.getElementById('landing-copy-btn').addEventListener('click', function () {
    var btn = this;
    var text = document.getElementById('landing-install-cmd').textContent;
    var copiedLabel = window.i18n ? window.i18n.t('landing.install.copied') : '¡Copiado!';
    var normalLabel = window.i18n ? window.i18n.t('landing.install.copy') : 'Copiar';
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(function () {
            btn.textContent = copiedLabel;
            setTimeout(function () { btn.textContent = normalLabel; }, 1500);
        })
        .catch(function () { });
});

// Instalación: un botón de ciclo por dimensión (frontend, modo, plataforma)
// en vez de mostrar todas las opciones a la vez. install.sh/install.ps1
// preguntan frontend y modo de forma interactiva, pero ese prompt depende de
// una TTY real (`[ -t 0 ]`) que NO existe en "curl ... | bash" (stdin es el
// pipe) — sin esto, el script cae siempre al valor por defecto (docker) sin
// importar qué mostrara el toggle. Por eso frontend y modo se fijan siempre
// explícitos vía variables de entorno (bash: tras el pipe, antes de "bash",
// ya que "VAR=x curl ... | bash" solo afecta a curl, no al bash del pipe;
// PowerShell: $env: antes de invocar irm).
var MODE_TO_FLAG = { docker: 'docker', nodocker: 'local' };
function _buildInstallCmd(frontend, mode, os) {
    var modeFlag = MODE_TO_FLAG[mode];
    if (os === 'windows') {
        return '$env:IAGENTSHUB_FRONTEND = "' + frontend + '"; $env:IAGENTSHUB_MODE = "' + modeFlag + '"; irm https://raw.githubusercontent.com/iagentshub/iAgents/main/install.ps1 | iex';
    }
    return 'curl -fsSL https://raw.githubusercontent.com/iagentshub/iAgents/main/install.sh | IAGENTSHUB_FRONTEND=' + frontend + ' IAGENTSHUB_MODE=' + modeFlag + ' bash';
}
var FRONTENDS = ['vanilla', 'react'];
var MODES = ['docker', 'nodocker'];
var OSES = ['linux', 'mac', 'windows'];
var _installFrontend = 'vanilla';
var _installMode = 'docker';
var _installOs = 'linux';

function _t(key, fallback) { return window.i18n ? window.i18n.t(key) : fallback; }

function _renderInstall() {
    var frontendBtn = document.getElementById('landing-install-frontend-toggle');
    var modeBtn = document.getElementById('landing-install-mode-toggle');
    var osBtn = document.getElementById('landing-install-os-toggle');
    frontendBtn.textContent = _t('landing.install.frontend_' + _installFrontend, _installFrontend);
    modeBtn.textContent = _t('landing.install.mode_' + _installMode, _installMode);
    osBtn.textContent = _t('landing.install.os_' + _installOs, _installOs);

    var codeEl = document.getElementById('landing-install-cmd');
    codeEl.textContent = _buildInstallCmd(_installFrontend, _installMode, _installOs);
}

document.getElementById('landing-install-frontend-toggle').addEventListener('click', function () {
    _installFrontend = FRONTENDS[(FRONTENDS.indexOf(_installFrontend) + 1) % FRONTENDS.length];
    _renderInstall();
});
document.getElementById('landing-install-mode-toggle').addEventListener('click', function () {
    _installMode = MODES[(MODES.indexOf(_installMode) + 1) % MODES.length];
    _renderInstall();
});
document.getElementById('landing-install-os-toggle').addEventListener('click', function () {
    _installOs = OSES[(OSES.indexOf(_installOs) + 1) % OSES.length];
    _renderInstall();
});
if (window.i18n) {
    // Esperar a que i18n cargue (primera visita: aún sin caché en
    // localStorage) para no pintar la clave cruda en vez del texto.
    window.i18n.ready(_renderInstall);
    window.i18n.onLangChange(_renderInstall);
} else {
    _renderInstall();
}

// Selector de idioma
var langBtn = document.getElementById('landing-lang-btn');
function _syncLangBtn() {
    if (langBtn && window.i18n) langBtn.textContent = window.i18n.getLang().toUpperCase();
}
if (langBtn) {
    langBtn.addEventListener('click', function () {
        if (!window.i18n) return;
        var curr = window.i18n.getLang();
        window.i18n.setLang(curr === 'es' ? 'en' : 'es');
    });
}
if (window.i18n) {
    window.i18n.ready(_syncLangBtn);
    window.i18n.onLangChange(_syncLangBtn);
}
