// skills-load.js — importa skills desde ficheros SKILL.md (front-matter YAML + cuerpo)
'use strict';

function _parseFrontmatter(text) {
    if (!text.startsWith('---')) return { meta: {}, body: text.trim() };
    var end = text.indexOf('\n---', 3);
    if (end === -1) return { meta: {}, body: text.trim() };
    var meta = {};
    text.slice(4, end).split('\n').forEach(function (line) {
        var m = line.match(/^([\w-]+):\s*(.+)/);
        if (m) meta[m[1].trim()] = m[2].trim();
    });
    return { meta: meta, body: text.slice(end + 4).trim() };
}

function _parseAndLoadSkill(filename, text) {
    var parsed = _parseFrontmatter(text);
    var name = parsed.meta.name || (filename || '').replace(/\.md$/i, '');
    if (!name) throw new Error('Missing required field: name');
    return {
        name: name,
        description: parsed.meta.description || '',
        icon: parsed.meta.icon || '',
        category: parsed.meta.category || '',
        content: parsed.body,
    };
}
