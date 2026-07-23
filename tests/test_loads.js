// test_loads.js — tests para las funciones de importación de ficheros locales
// Ejecutar con: node frontend/tests/test_loads.js
'use strict';

const assert = require('assert');
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

// ─── Inline copies of production functions ────────────────────────────────────

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

function _parseGithubMdFree(text) {
    var lines = text.split('\n');
    var name = '';
    var copilotTopic = '';
    var bodyLines = [];
    lines.forEach(function (line) {
        if (!name && line.startsWith('# ')) {
            name = line.slice(2).trim();
        } else {
            var topicMatch = line.match(/^\*\*Topic:\*\*\s*(.+)/);
            if (topicMatch) {
                copilotTopic = topicMatch[1].trim();
            } else {
                bodyLines.push(line);
            }
        }
    });
    var body = bodyLines.join('\n').trim();
    var firstPara = body.split(/\n\n+/)[0] || '';
    var description = firstPara.length <= 200 && !firstPara.startsWith('#') ? firstPara : '';
    return { name: name || '', description: description, system_prompt: body, agent_type: 'github', copilot_topic: copilotTopic, _source: 'github_copilot_free' };
}

function _stripRoutinesGuide(body) {
    var marker = '> **Routines setup guide**';
    var idx = body.indexOf(marker);
    if (idx === -1) return body;
    var before = body.slice(0, idx);
    var sepIdx = before.lastIndexOf('\n---\n');
    return sepIdx !== -1 ? before.slice(0, sepIdx).trim() : body;
}

function _parseAndLoadAgent(filename, text) {
    var lower = filename.toLowerCase();
    if (lower.endsWith('.md')) {
        var parsed = _parseFrontmatter(text);
        if (Object.keys(parsed.meta).length > 0) {
            if (lower.endsWith('.agent.md')) {
                return { name: parsed.meta.name || filename.replace(/\.agent\.md$/i, ''), description: parsed.meta.description || '', system_prompt: parsed.body, agent_type: 'github', copilot_topic: parsed.meta.target || '', _source: 'github_copilot_agent' };
            }
            return { name: parsed.meta.name || '', description: parsed.meta.description || '', system_prompt: _stripRoutinesGuide(parsed.body), model: parsed.meta.model || '', agent_type: 'claude', _source: 'claude_code' };
        }
        return _parseGithubMdFree(text);
    }
    var data = JSON.parse(text);
    if (data.agent_type) { delete data.id; data.routines = data.routines || []; data._source = 'native'; return data; }
    if (data.instructions !== undefined || data.tool_choice !== undefined || data.frequency_penalty !== undefined) {
        return { name: data.name || '', description: data.description || '', system_prompt: data.instructions || '', model: data.model || '', temperature: data.temperature, agent_type: 'openai', response_format: (data.response_format && data.response_format.type) || data.response_format || 'text', tool_choice: data.tool_choice || 'auto', frequency_penalty: data.frequency_penalty || 0, presence_penalty: data.presence_penalty || 0, routines: data.routines || [], _source: 'openai_assistant' };
    }
    if (data.extended_thinking !== undefined || data.cache_control !== undefined || data.anthropic_betas !== undefined) {
        return { name: data.name || '', description: data.description || '', system_prompt: data.system_prompt || '', model: data.model || '', temperature: data.temperature, agent_type: 'claude', extended_thinking: !!data.extended_thinking, thinking_budget_tokens: data.thinking_budget_tokens || 10000, cache_control: !!data.cache_control, routines: data.routines || [], _source: 'claude_json' };
    }
    return { name: data.name || '', description: data.description || '', system_prompt: data.system_prompt || data.instructions || '', model: data.model || '', temperature: data.temperature, agent_type: 'generic', routines: data.routines || [], _source: 'generic_json' };
}

function _parseAndLoadSkill(filename, text) {
    var parsed = _parseFrontmatter(text);
    var name = parsed.meta.name || (filename || '').replace(/\.md$/i, '');
    if (!name) throw new Error('Missing required field: name');
    return { name: name, description: parsed.meta.description || '', icon: parsed.meta.icon || '', category: parsed.meta.category || '', content: parsed.body };
}

function _parseAndLoadMemory(filename, text) {
    if (filename.toLowerCase().endsWith('.json')) {
        var data = JSON.parse(text);
        return { filename: data.filename || filename.replace(/\.json$/i, ''), content: data.content || '' };
    }
    return { filename: filename.replace(/\.[^.]+$/, ''), content: text };
}

// ─── _parseFrontmatter ────────────────────────────────────────────────────────

console.log('\n_parseFrontmatter');

test('valid frontmatter extracts meta and body', function () {
    var r = _parseFrontmatter('---\nname: My Agent\nmodel: claude-3\n---\nThis is the body.');
    assert.strictEqual(r.meta.name, 'My Agent');
    assert.strictEqual(r.meta.model, 'claude-3');
    assert.strictEqual(r.body, 'This is the body.');
});

test('no frontmatter returns empty meta and full text as body', function () {
    var r = _parseFrontmatter('# Hello\nWorld');
    assert.deepStrictEqual(r.meta, {});
    assert.strictEqual(r.body, '# Hello\nWorld');
});

test('unclosed frontmatter (no closing ---) treated as no frontmatter', function () {
    var r = _parseFrontmatter('---\nname: X\nno closing delimiter');
    assert.deepStrictEqual(r.meta, {});
});

// ─── _parseAndLoadAgent ───────────────────────────────────────────────────────

console.log('\n_parseAndLoadAgent');

test('Claude Code .md with frontmatter', function () {
    var text = '---\nname: Sales Bot\ndescription: B2B sales expert\nmodel: claude-opus-4-7\n---\nYou are a sales expert.';
    var r = _parseAndLoadAgent('sales-bot.md', text);
    assert.strictEqual(r.agent_type, 'claude');
    assert.strictEqual(r.name, 'Sales Bot');
    assert.strictEqual(r.model, 'claude-opus-4-7');
    assert.strictEqual(r.system_prompt, 'You are a sales expert.');
});

test('GitHub Copilot .agent.md with frontmatter', function () {
    var text = '---\nname: DevOps Agent\ndescription: CI/CD helper\ntarget: devops\n---\nHelp with pipelines.';
    var r = _parseAndLoadAgent('devops.agent.md', text);
    assert.strictEqual(r.agent_type, 'github');
    assert.strictEqual(r.name, 'DevOps Agent');
    assert.strictEqual(r.copilot_topic, 'devops');
});

test('GitHub Copilot free-form .md (no frontmatter)', function () {
    var text = '# Code Reviewer\n**Topic:** security\nReview code for issues.';
    var r = _parseAndLoadAgent('copilot-instructions.md', text);
    assert.strictEqual(r.agent_type, 'github');
    assert.strictEqual(r.name, 'Code Reviewer');
    assert.strictEqual(r.copilot_topic, 'security');
    assert.ok(r.system_prompt.includes('Review code'));
});

test('iAgentshub JSON pass-through (id discarded)', function () {
    var text = JSON.stringify({ id: 'abc123', agent_type: 'claude', name: 'Test', system_prompt: 'Hello' });
    var r = _parseAndLoadAgent('agent.json', text);
    assert.strictEqual(r.agent_type, 'claude');
    assert.strictEqual(r.name, 'Test');
    assert.strictEqual(r.id, undefined);
});

test('OpenAI Assistants JSON (instructions field)', function () {
    var text = JSON.stringify({ name: 'GPT Agent', instructions: 'You are helpful.', model: 'gpt-4o', tool_choice: 'auto' });
    var r = _parseAndLoadAgent('openai-export.json', text);
    assert.strictEqual(r.agent_type, 'openai');
    assert.strictEqual(r.system_prompt, 'You are helpful.');
    assert.strictEqual(r.tool_choice, 'auto');
});

test('Claude API JSON (extended_thinking field)', function () {
    var text = JSON.stringify({ name: 'Thinker', system_prompt: 'Think deep.', extended_thinking: true, thinking_budget_tokens: 5000 });
    var r = _parseAndLoadAgent('claude-export.json', text);
    assert.strictEqual(r.agent_type, 'claude');
    assert.strictEqual(r.extended_thinking, true);
    assert.strictEqual(r.thinking_budget_tokens, 5000);
});

test('Generic JSON fallback', function () {
    var text = JSON.stringify({ name: 'Generic', system_prompt: 'Do stuff.' });
    var r = _parseAndLoadAgent('generic.json', text);
    assert.strictEqual(r.agent_type, 'generic');
    assert.strictEqual(r.system_prompt, 'Do stuff.');
});

test('Invalid JSON throws', function () {
    assert.throws(function () { _parseAndLoadAgent('bad.json', 'not json'); });
});

// ─── Routines — propagación en imports ───────────────────────────────────────

console.log('\nRoutines — import propagation');

var _sampleRoutines = [
    { name: 'Morning briefing', trigger_type: 'cron', schedule: '0 9 * * MON-FRI', prompt: 'Summarize tasks.' },
    { name: 'Weekly report', trigger_type: 'manual', prompt: 'Generate weekly report.' },
];

test('iAgentshub JSON pass-through preserves routines', function () {
    var text = JSON.stringify({ agent_type: 'claude', name: 'Bot', routines: _sampleRoutines });
    var r = _parseAndLoadAgent('agent.json', text);
    assert.strictEqual(r.routines.length, 2);
    assert.strictEqual(r.routines[0].name, 'Morning briefing');
    assert.strictEqual(r.routines[0].trigger_type, 'cron');
});

test('Claude API JSON preserves routines', function () {
    var text = JSON.stringify({ name: 'Thinker', system_prompt: 'x', extended_thinking: true, routines: _sampleRoutines });
    var r = _parseAndLoadAgent('claude.json', text);
    assert.strictEqual(r.routines.length, 2);
    assert.strictEqual(r.routines[1].trigger_type, 'manual');
});

test('OpenAI JSON preserves routines', function () {
    var text = JSON.stringify({ name: 'GPT', instructions: 'x', tool_choice: 'auto', routines: _sampleRoutines });
    var r = _parseAndLoadAgent('openai.json', text);
    assert.strictEqual(r.routines.length, 2);
});

test('Generic JSON preserves routines', function () {
    var text = JSON.stringify({ name: 'Generic', system_prompt: 'x', routines: _sampleRoutines });
    var r = _parseAndLoadAgent('generic.json', text);
    assert.strictEqual(r.routines.length, 2);
});

test('JSON without routines defaults to empty array', function () {
    var text = JSON.stringify({ name: 'No routines', system_prompt: 'x' });
    var r = _parseAndLoadAgent('generic.json', text);
    assert.deepStrictEqual(r.routines, []);
});

test('iAgentshub JSON without routines defaults to empty array', function () {
    var text = JSON.stringify({ agent_type: 'generic', name: 'No routines' });
    var r = _parseAndLoadAgent('agent.json', text);
    assert.deepStrictEqual(r.routines, []);
});

// ─── Claude — detección de formato y campos específicos ──────────────────────

console.log('\nClaude — format detection & fields');

test('Claude Code .md: _source = claude_code', function () {
    var text = '---\nname: Bot\n---\nYou are a bot.';
    var r = _parseAndLoadAgent('bot.md', text);
    assert.strictEqual(r._source, 'claude_code');
});

test('Claude Code .md: nombre y model del frontmatter', function () {
    var text = '---\nname: Code Expert\nmodel: claude-opus-4-7\n---\nYou are an expert.';
    var r = _parseAndLoadAgent('expert.md', text);
    assert.strictEqual(r.name, 'Code Expert');
    assert.strictEqual(r.model, 'claude-opus-4-7');
    assert.strictEqual(r.agent_type, 'claude');
});

test('Claude Code .md: strip routines guide del body', function () {
    var body = 'You are a bot.\n\n---\n> **Routines setup guide**\nThis should be removed.';
    var text = '---\nname: Bot\n---\n' + body;
    var r = _parseAndLoadAgent('bot.md', text);
    assert.ok(!r.system_prompt.includes('Routines setup guide'), 'routines guide debe eliminarse');
    assert.ok(r.system_prompt.includes('You are a bot.'));
});

test('Claude JSON (extended_thinking): _source = claude_json', function () {
    var text = JSON.stringify({ name: 'Thinker', system_prompt: 'Think.', extended_thinking: true });
    var r = _parseAndLoadAgent('thinker.json', text);
    assert.strictEqual(r._source, 'claude_json');
    assert.strictEqual(r.agent_type, 'claude');
});

test('Claude JSON: extended_thinking false preserva campo', function () {
    var text = JSON.stringify({ name: 'A', system_prompt: 'x', extended_thinking: false });
    var r = _parseAndLoadAgent('a.json', text);
    assert.strictEqual(r.extended_thinking, false);
    assert.strictEqual(r._source, 'claude_json');
});

test('Claude JSON: cache_control dispara detección', function () {
    var text = JSON.stringify({ name: 'C', system_prompt: 'x', cache_control: true });
    var r = _parseAndLoadAgent('c.json', text);
    assert.strictEqual(r._source, 'claude_json');
    assert.strictEqual(r.cache_control, true);
});

test('Claude JSON: thinking_budget_tokens por defecto 10000', function () {
    var text = JSON.stringify({ name: 'T', system_prompt: 'x', extended_thinking: true });
    var r = _parseAndLoadAgent('t.json', text);
    assert.strictEqual(r.thinking_budget_tokens, 10000);
});

test('Claude JSON: thinking_budget_tokens personalizado', function () {
    var text = JSON.stringify({ name: 'T', system_prompt: 'x', extended_thinking: true, thinking_budget_tokens: 20000 });
    var r = _parseAndLoadAgent('t.json', text);
    assert.strictEqual(r.thinking_budget_tokens, 20000);
});

test('Claude JSON: anthropic_betas dispara detección', function () {
    var text = JSON.stringify({ name: 'B', system_prompt: 'x', anthropic_betas: ['interleaved-thinking-2025-05-14'] });
    var r = _parseAndLoadAgent('b.json', text);
    assert.strictEqual(r._source, 'claude_json');
});

// ─── GitHub — detección de formato y campos específicos ──────────────────────

console.log('\nGitHub — format detection & fields');

test('.agent.md con frontmatter: _source = github_copilot_agent', function () {
    var text = '---\nname: CI Agent\ntarget: ci\n---\nRun your pipelines.';
    var r = _parseAndLoadAgent('ci.agent.md', text);
    assert.strictEqual(r._source, 'github_copilot_agent');
    assert.strictEqual(r.agent_type, 'github');
});

test('.agent.md: nombre y copilot_topic del frontmatter', function () {
    var text = '---\nname: Security Scanner\ndescription: Scans for vulns\ntarget: security\n---\nScan the code.';
    var r = _parseAndLoadAgent('scanner.agent.md', text);
    assert.strictEqual(r.name, 'Security Scanner');
    assert.strictEqual(r.copilot_topic, 'security');
    assert.strictEqual(r.description, 'Scans for vulns');
});

test('.agent.md: nombre desde filename si no hay frontmatter name', function () {
    var text = '---\ntarget: dev\n---\nHelp with code.';
    var r = _parseAndLoadAgent('my-helper.agent.md', text);
    assert.strictEqual(r.name, 'my-helper');
});

test('.agent.md: body como system_prompt', function () {
    var text = '---\nname: X\n---\nYou are a GitHub expert.';
    var r = _parseAndLoadAgent('x.agent.md', text);
    assert.strictEqual(r.system_prompt, 'You are a GitHub expert.');
});

test('.md sin frontmatter: _source = github_copilot_free', function () {
    var text = '# Assistant\nHelp with tasks.';
    var r = _parseAndLoadAgent('copilot-instructions.md', text);
    assert.strictEqual(r._source, 'github_copilot_free');
    assert.strictEqual(r.agent_type, 'github');
});

test('.md sin frontmatter: nombre del heading H1', function () {
    var text = '# My Assistant\nDo stuff.';
    var r = _parseAndLoadAgent('copilot.md', text);
    assert.strictEqual(r.name, 'My Assistant');
});

test('.md sin frontmatter: Topic extraído', function () {
    var text = '# Bot\n**Topic:** testing\nRun tests.';
    var r = _parseAndLoadAgent('bot.md', text);
    assert.strictEqual(r.copilot_topic, 'testing');
    assert.ok(r.system_prompt.includes('Run tests'));
    assert.ok(!r.system_prompt.includes('**Topic:**'));
});

test('.md sin frontmatter: descripción del primer párrafo ≤200 chars', function () {
    var text = '# Bot\nShort description.\n\nThis is more content.';
    var r = _parseAndLoadAgent('bot.md', text);
    assert.strictEqual(r.description, 'Short description.');
});

test('.md sin frontmatter: descripción vacía si primer párrafo empieza con #', function () {
    var text = '# Bot\n## Section\nContent.';
    var r = _parseAndLoadAgent('bot.md', text);
    assert.strictEqual(r.description, '');
});

// ─── OpenAI — detección de formato y campos específicos ──────────────────────

console.log('\nOpenAI — format detection & fields');

test('OpenAI Assistants JSON: _source = openai_assistant', function () {
    var text = JSON.stringify({ name: 'GPT Bot', instructions: 'Be helpful.' });
    var r = _parseAndLoadAgent('gpt.json', text);
    assert.strictEqual(r._source, 'openai_assistant');
    assert.strictEqual(r.agent_type, 'openai');
});

test('OpenAI: instructions → system_prompt', function () {
    var text = JSON.stringify({ name: 'Bot', instructions: 'You are a helpful assistant.' });
    var r = _parseAndLoadAgent('bot.json', text);
    assert.strictEqual(r.system_prompt, 'You are a helpful assistant.');
});

test('OpenAI: tool_choice dispara detección', function () {
    var text = JSON.stringify({ name: 'X', tool_choice: 'required' });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r._source, 'openai_assistant');
    assert.strictEqual(r.tool_choice, 'required');
});

test('OpenAI: frequency_penalty dispara detección', function () {
    var text = JSON.stringify({ name: 'X', frequency_penalty: 0.5 });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r._source, 'openai_assistant');
    assert.strictEqual(r.frequency_penalty, 0.5);
});

test('OpenAI: tool_choice por defecto "auto"', function () {
    var text = JSON.stringify({ name: 'X', instructions: 'x' });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r.tool_choice, 'auto');
});

test('OpenAI: response_format objeto → .type', function () {
    var text = JSON.stringify({ name: 'X', instructions: 'x', response_format: { type: 'json_object' } });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r.response_format, 'json_object');
});

test('OpenAI: response_format string directo', function () {
    var text = JSON.stringify({ name: 'X', instructions: 'x', response_format: 'json_object' });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r.response_format, 'json_object');
});

test('OpenAI: sin response_format → "text" por defecto', function () {
    var text = JSON.stringify({ name: 'X', instructions: 'x' });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r.response_format, 'text');
});

test('OpenAI: presence_penalty preservado', function () {
    var text = JSON.stringify({ name: 'X', instructions: 'x', presence_penalty: 0.8 });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r.presence_penalty, 0.8);
});

test('OpenAI: modelo preservado', function () {
    var text = JSON.stringify({ name: 'X', instructions: 'x', model: 'gpt-4o' });
    var r = _parseAndLoadAgent('x.json', text);
    assert.strictEqual(r.model, 'gpt-4o');
});

// ─── Native — iAgentshub pass-through ────────────────────────────────────────

console.log('\nNative — iAgentshub pass-through');

test('native JSON: _source = native', function () {
    var text = JSON.stringify({ agent_type: 'claude', name: 'Bot', system_prompt: 'x' });
    var r = _parseAndLoadAgent('config.json', text);
    assert.strictEqual(r._source, 'native');
});

test('native JSON: id descartado', function () {
    var text = JSON.stringify({ id: 'old-id', agent_type: 'generic', name: 'Bot' });
    var r = _parseAndLoadAgent('config.json', text);
    assert.strictEqual(r.id, undefined);
});

test('native JSON: agent_type preservado (openai)', function () {
    var text = JSON.stringify({ agent_type: 'openai', name: 'Bot', system_prompt: 'x' });
    var r = _parseAndLoadAgent('config.json', text);
    assert.strictEqual(r.agent_type, 'openai');
    assert.strictEqual(r._source, 'native');
});

// ─── _parseAndLoadSkill ───────────────────────────────────────────────────────

console.log('\n_parseAndLoadSkill');

test('SKILL.md with frontmatter', function () {
    var text = '---\nname: My Skill\ndescription: Does stuff\nicon: 🔧\ncategory: dev\n---\nInstructions...';
    var r = _parseAndLoadSkill('SKILL.md', text);
    assert.strictEqual(r.name, 'My Skill');
    assert.strictEqual(r.icon, '🔧');
    assert.strictEqual(r.category, 'dev');
    assert.strictEqual(r.content, 'Instructions...');
});

test('plain .md without frontmatter falls back to filename', function () {
    var r = _parseAndLoadSkill('my-skill.md', '# Body only, no frontmatter');
    assert.strictEqual(r.name, 'my-skill');
    assert.ok(r.content.includes('Body only'));
});

test('missing name throws when filename has no usable name', function () {
    assert.throws(function () { _parseAndLoadSkill('', '---\ncontent: x\n---\nbody'); }, /name/);
});

// ─── _parseAndLoadMemory ──────────────────────────────────────────────────────

console.log('\n_parseAndLoadMemory');

test('.md file uses filename without extension', function () {
    var r = _parseAndLoadMemory('my-agent.md', '# Context\nSome content');
    assert.strictEqual(r.filename, 'my-agent');
    assert.ok(r.content.includes('Some content'));
});

test('.json file reads filename and content fields', function () {
    var text = JSON.stringify({ filename: 'custom-name', content: 'The content' });
    var r = _parseAndLoadMemory('export.json', text);
    assert.strictEqual(r.filename, 'custom-name');
    assert.strictEqual(r.content, 'The content');
});

test('.json without filename field falls back to json filename stem', function () {
    var text = JSON.stringify({ content: 'hello' });
    var r = _parseAndLoadMemory('agent-memory.json', text);
    assert.strictEqual(r.filename, 'agent-memory');
});

test('compound filename strips only last extension', function () {
    var r = _parseAndLoadMemory('my.agent.md', 'data');
    assert.strictEqual(r.filename, 'my.agent');
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + (failed === 0 ? '✓' : '✗') + ' ' + passed + ' passed, ' + failed + ' failed\n');
if (failed > 0) process.exit(1);
