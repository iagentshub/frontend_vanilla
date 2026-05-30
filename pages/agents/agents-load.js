// agents-load.js — importa agentes desde ficheros locales (Claude Code, GitHub Copilot, OpenAI, iAgentshub)
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

    return {
        name: name || '',
        description: description,
        system_prompt: body,
        agent_type: 'github',
        copilot_topic: copilotTopic,
        _source: 'github_copilot_free',
    };
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
                return {
                    name: parsed.meta.name || filename.replace(/\.agent\.md$/i, ''),
                    description: parsed.meta.description || '',
                    system_prompt: parsed.body,
                    agent_type: 'github',
                    copilot_topic: parsed.meta.target || '',
                    _source: 'github_copilot_agent',
                };
            }
            // Claude Code .md with frontmatter
            return {
                name: parsed.meta.name || '',
                description: parsed.meta.description || '',
                system_prompt: _stripRoutinesGuide(parsed.body),
                model: parsed.meta.model || '',
                agent_type: 'claude',
                _source: 'claude_code',
            };
        }
        return _parseGithubMdFree(text);
    }

    var data = JSON.parse(text);

    if (data.agent_type) {
        delete data.id;
        data.routines = data.routines || [];
        data._source = 'native';
        return data;
    }

    if (data.instructions !== undefined || data.tool_choice !== undefined || data.frequency_penalty !== undefined) {
        return {
            name: data.name || '',
            description: data.description || '',
            system_prompt: data.instructions || '',
            model: data.model || '',
            temperature: data.temperature,
            agent_type: 'openai',
            response_format: (data.response_format && data.response_format.type) || data.response_format || 'text',
            tool_choice: data.tool_choice || 'auto',
            frequency_penalty: data.frequency_penalty || 0,
            presence_penalty: data.presence_penalty || 0,
            routines: data.routines || [],
            _source: 'openai_assistant',
        };
    }

    if (data.extended_thinking !== undefined || data.cache_control !== undefined || data.anthropic_betas !== undefined) {
        return {
            name: data.name || '',
            description: data.description || '',
            system_prompt: data.system_prompt || '',
            model: data.model || '',
            temperature: data.temperature,
            agent_type: 'claude',
            extended_thinking: !!data.extended_thinking,
            thinking_budget_tokens: data.thinking_budget_tokens || 10000,
            cache_control: !!data.cache_control,
            routines: data.routines || [],
            _source: 'claude_json',
        };
    }

    return {
        name: data.name || '',
        description: data.description || '',
        system_prompt: data.system_prompt || data.instructions || '',
        model: data.model || '',
        temperature: data.temperature,
        agent_type: 'generic',
        routines: data.routines || [],
        _source: 'generic_json',
    };
}
