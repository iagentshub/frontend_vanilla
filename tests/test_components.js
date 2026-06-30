// test_components.js — tests de componentes JS del frontend
// Ejecutar con: node frontend/tests/test_components.js
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

const FRONTEND = path.resolve(__dirname, '..');

// ─── Mocks de globals del navegador ──────────────────────────────────────────

global.window = {};
global.t = function (key) { return key || ''; };
global.esc = function (v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
global.LABELS = {
    renderChips: function () { return ''; },
    getLabel: function (l) { return l || ''; },
};

// ─── Cargar agent-card.js ────────────────────────────────────────────────────

require(path.join(FRONTEND, 'assets', 'components', 'agent-card', 'agent-card.js'));
const AgentCard = global.window.AgentCard;

// ═══════════════════════════════════════════════════════════════════════════════
// AgentCard
// ═══════════════════════════════════════════════════════════════════════════════

test('AgentCard existe y expone render y renderGrid', function () {
    assert(AgentCard, 'AgentCard no está definido en window');
    assert(typeof AgentCard.render === 'function', 'AgentCard.render no es función');
    assert(typeof AgentCard.renderGrid === 'function', 'AgentCard.renderGrid no es función');
});

test('[regresión] AgentCard.render no lanza con agent.labels undefined (bug hoisting)', function () {
    // Antes del fix: var agentLabels se declaraba después de agentLabels.indexOf()
    // → TypeError: Cannot read properties of undefined (reading 'indexOf')
    var html = AgentCard.render(
        { name: 'Agente sin labels', id: 'test-1', scope: 'private', labels: undefined },
        [], [], {}
    );
    assert(typeof html === 'string', 'render debe retornar string');
});

test('[regresión] AgentCard.render no lanza con labels null', function () {
    var html = AgentCard.render(
        { name: 'Agente null labels', id: 'test-2', scope: 'private', labels: null },
        [], [], {}
    );
    assert(typeof html === 'string', 'render debe retornar string con labels=null');
});

test('AgentCard.render incluye el nombre del agente en el HTML', function () {
    var html = AgentCard.render(
        { name: 'Mi Agente Único', id: 'test-3', scope: 'private', labels: ['private'] },
        [], [], {}
    );
    assert(html.includes('Mi Agente Único'), 'HTML no contiene el nombre del agente');
});

test('AgentCard.render agente público tiene botones fork y link', function () {
    var html = AgentCard.render(
        { name: 'Agente Público', id: 'pub-1', scope: 'public', labels: ['private'] },
        [], [], {}
    );
    assert(html.includes('data-action="fork"'), 'Falta botón fork en agente público');
    assert(html.includes('data-action="link"'), 'Falta botón link en agente público');
});

test('AgentCard.render agente privado NO tiene botones fork ni link', function () {
    var html = AgentCard.render(
        { name: 'Privado', id: 'priv-1', scope: 'private', labels: ['private'] },
        [], [], {}
    );
    assert(!html.includes('data-action="fork"'), 'Agente privado no debe tener botón fork');
    assert(!html.includes('data-action="link"'), 'Agente privado no debe tener botón link');
});

test('AgentCard.render agente bloqueado desactiva el chat', function () {
    var html = AgentCard.render(
        { name: 'Archivado', id: 'arch-1', scope: 'private', labels: ['archived'] },
        [], [], {}
    );
    assert(html.includes('agent-card--blocked'), 'Falta clase agent-card--blocked');
});

test('AgentCard._fmtTokens formatea correctamente', function () {
    assert(AgentCard._fmtTokens(0) === '0', '_fmtTokens(0)');
    assert(AgentCard._fmtTokens(500) === '500', '_fmtTokens(500)');
    assert(AgentCard._fmtTokens(1500) === '1.5k', '_fmtTokens(1500)');
    assert(AgentCard._fmtTokens(1000000) === '1M', '_fmtTokens(1M)');
    assert(AgentCard._fmtTokens(2500000) === '2.5M', '_fmtTokens(2.5M)');
});

test('AgentCard.renderGrid muestra empty-state cuando no hay agentes', function () {
    var container = { innerHTML: '' };
    AgentCard.renderGrid([], [], [], container, {});
    assert(container.innerHTML.includes('empty-state'), 'Falta empty-state sin agentes');
});

test('AgentCard.renderGrid renderiza múltiples agentes', function () {
    var agents = [
        { name: 'A1', id: 'a1', scope: 'private', labels: ['private'] },
        { name: 'A2', id: 'a2', scope: 'private', labels: ['private'] },
    ];
    var container = { innerHTML: '' };
    AgentCard.renderGrid(agents, [], [], container, {});
    assert(container.innerHTML.includes('A1'), 'Falta agente A1');
    assert(container.innerHTML.includes('A2'), 'Falta agente A2');
});

// ═══════════════════════════════════════════════════════════════════════════════
// explore.js: _resourceUrl  (regresión scope public vs private)
// ═══════════════════════════════════════════════════════════════════════════════

// Extraemos la función real de explore.js para testear el código en producción
var exploreSource = fs.readFileSync(
    path.join(FRONTEND, 'pages', 'explore', 'explore.js'), 'utf8'
);

// Extraer el cuerpo de _resourceUrl y construir una función testeable
var _resourceUrlSrc = exploreSource.match(
    /function _resourceUrl\(type, id, action\) \{[\s\S]+?\n    \}/
);
// eslint-disable-next-line no-new-func
var _resourceUrl = _resourceUrlSrc
    ? new Function('return ' + _resourceUrlSrc[0])()
    : null;

test('[regresión] _resourceUrl existe en explore.js', function () {
    assert(_resourceUrl !== null, '_resourceUrl no encontrada en explore.js');
    assert(typeof _resourceUrl === 'function', '_resourceUrl no es función');
});

test('[regresión] _resourceUrl usa /public/ para agentes (no /private/)', function () {
    var url = _resourceUrl('agent', 'abc-1', 'fork');
    assert(url === '/api/agents/public/abc-1/fork',
        'URL incorrecta para fork de agente: ' + url);
    assert(!url.includes('/private/'),
        'URL contiene /private/ — debería ser /public/: ' + url);
});

test('[regresión] _resourceUrl usa /public/ para skills', function () {
    var url = _resourceUrl('skill', 'skill-x', 'link');
    assert(url === '/api/skills/public/skill-x/link',
        'URL incorrecta para link de skill: ' + url);
});

test('_resourceUrl knowledge no lleva scope', function () {
    var url = _resourceUrl('knowledge', 'know-1', 'fork');
    assert(url === '/api/knowledge/know-1/fork',
        'URL incorrecta para fork de knowledge: ' + url);
});

test('_resourceUrl aplica encodeURIComponent al id', function () {
    var url = _resourceUrl('agent', 'id/con espacios', 'fork');
    assert(!url.includes('id/con espacios'), 'ID no fue encodeado: ' + url);
    assert(url.includes('id%2Fcon%20espacios') || url.includes('id%2Fcon'),
        'Encoding incorrecto: ' + url);
});

// ─── Resultado ───────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
