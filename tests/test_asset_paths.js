// test_asset_paths.js — regresión: las páginas no deben referenciar assets
// con el prefijo /pages/ directamente.
//
// Contexto: el merge de origin/main introdujo páginas de auth (login, register,
// forgot-password, reset-password) con rutas tipo:
//   <link href="/pages/login/login.css">
//   <script src="/pages/login/login.js">
//
// Nginx maneja /login/... → /pages/login/... vía try_files /pages$uri.
// Si el HTML ya incluye /pages/, nginx añade otro prefijo y busca
// /pages/pages/login/login.css → 404 (MIME text/html en lugar de text/css).
//
// La convención correcta es /login/login.css, /profile/profile.js, etc.
//
// Ejecutar con: node frontend/tests/test_asset_paths.js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log('  OK  ' + name);
        passed++;
    } catch (e) {
        console.error('FAIL  ' + name);
        console.error('      ' + e.message);
        failed++;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRONTEND = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(FRONTEND, 'pages');

/** Devuelve recursivamente todos los .html dentro de dir. */
function findHtmlFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findHtmlFiles(full).forEach(function (f) { results.push(f); });
        } else if (entry.name.endsWith('.html')) {
            results.push(full);
        }
    });
    return results;
}

/**
 * Devuelve las referencias de asset (href/src) en un HTML que empiezan
 * por /pages/ — estas rompen el routing de nginx.
 */
function findBadAssetRefs(html) {
    var bad = [];
    // href="/pages/..." o src="/pages/..."
    var re = /(?:href|src)="(\/pages\/[^"]+)"/g;
    var m;
    while ((m = re.exec(html)) !== null) {
        bad.push(m[1]);
    }
    return bad;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\nAsset path regressions — /pages/ prefix en HTML');

var htmlFiles = findHtmlFiles(PAGES_DIR);

test('se encuentran ficheros HTML en pages/', function () {
    assert(htmlFiles.length > 0, 'No se encontró ningún fichero .html en pages/');
});

// Test individual por fichero
htmlFiles.forEach(function (file) {
    var rel = path.relative(FRONTEND, file);
    test(rel + ' — sin referencias /pages/ en href/src', function () {
        var html = fs.readFileSync(file, 'utf-8');
        var bad = findBadAssetRefs(html);
        assert.strictEqual(
            bad.length, 0,
            'Rutas con /pages/ encontradas (rompen nginx):\n      ' +
            bad.map(function (r) { return '  ' + r; }).join('\n      ') +
            '\n      Usa /' + path.basename(path.dirname(file)) + '/... en lugar de /pages/...'
        );
    });
});

// Test de páginas críticas de auth
var AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password'];

console.log('\nAuth pages — CSS/JS cargables por nginx');

AUTH_PAGES.forEach(function (page) {
    var indexFile = path.join(PAGES_DIR, page, 'index.html');

    test(page + '/index.html existe', function () {
        assert(fs.existsSync(indexFile), 'Falta ' + indexFile);
    });

    if (fs.existsSync(indexFile)) {
        var html = fs.readFileSync(indexFile, 'utf-8');

        test(page + ' — tiene al menos un <link rel="stylesheet">', function () {
            assert(/<link[^>]+rel="stylesheet"/.test(html),
                'No se encontró ningún CSS en ' + page + '/index.html');
        });

        test(page + ' — tiene al menos un <script src>', function () {
            assert(/<script[^>]+src=/.test(html),
                'No se encontró ningún script en ' + page + '/index.html');
        });

        test(page + ' — el CSS de login usa ruta /login/ (no /pages/login/)', function () {
            var hasLoginCss = html.includes('href="/login/login.css"');
            var hasBadLoginCss = html.includes('href="/pages/login/login.css"');
            assert(!hasBadLoginCss, 'Encontrada ruta incorrecta href="/pages/login/login.css" en ' + page);
            // Nota: solo login y register necesitan login.css específicamente;
            // este assert solo aplica si el fichero referencia login.css
            if (html.includes('login.css')) {
                assert(hasLoginCss || !hasBadLoginCss,
                    page + ' debe usar /login/login.css, no /pages/login/login.css');
            }
        });

        test(page + ' — los scripts JS usan ruta /' + page + '/ (no /pages/' + page + '/)', function () {
            var badScript = new RegExp('src="/pages/' + page + '/');
            assert(!badScript.test(html),
                'Encontrada ruta incorrecta src="/pages/' + page + '/..." en ' + page + '/index.html');
        });
    }
});

// ─── Resumen ──────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────');
console.log('  Passed: ' + passed + '  Failed: ' + failed);
if (failed > 0) process.exit(1);
