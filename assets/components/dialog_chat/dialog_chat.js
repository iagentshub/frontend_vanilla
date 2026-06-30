// dialog_chat.js — Chat SSE con countdown timer e historial de conversaciones
'use strict';

const _USER_AVATAR = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const _ARR_UP   = '<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M4 7V1M1.5 3.5L4 1l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const _ARR_DOWN = '<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M4 1v6M1.5 4.5L4 7l2.5-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const _ICON_X   = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const _COPY_ICON  = '<svg width="12" height="12" viewBox="0 0 14 15" fill="none" aria-hidden="true"><rect x="4.5" y="1" width="8.5" height="10.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="3.5" width="8.5" height="10.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/></svg> Copy';
const _CHECK_ICON = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!';

// ── Syntax highlighter ───────────────────────────────────────────────────────

function _hlRules(lang) {
    var L = (lang || '').toLowerCase();

    var STR_PY   = /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
    var STR_JS   = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
    var STR_DQSQ = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
    var CMT_HASH  = /#[^\n]*/g;
    var CMT_SLASH = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
    var CMT_SQL   = /--[^\n]*|\/\*[\s\S]*?\*\//g;
    var CMT_HTML  = /<!--[\s\S]*?-->/g;
    var NUM_BASIC = /\b\d+(?:\.\d+)?\b/g;
    var NUM_HEX   = /\b0x[\da-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;

    if (L === 'python' || L === 'py') return [
        ['hl-cmt', CMT_HASH],
        ['hl-str', STR_PY],
        ['hl-kw',  /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g],
        ['hl-fn',  /\b([A-Za-z_]\w*)\s*(?=\()/g],
        ['hl-num', NUM_HEX],
    ];
    if (L === 'javascript' || L === 'js' || L === 'jsx') return [
        ['hl-cmt', CMT_SLASH],
        ['hl-str', STR_JS],
        ['hl-kw',  /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|false|try|typeof|undefined|var|void|while|with|yield)\b/g],
        ['hl-fn',  /\b([A-Za-z_$][\w$]*)\s*(?=\()/g],
        ['hl-num', NUM_HEX],
    ];
    if (L === 'typescript' || L === 'ts' || L === 'tsx') return [
        ['hl-cmt', CMT_SLASH],
        ['hl-str', STR_JS],
        ['hl-kw',  /\b(abstract|any|as|async|await|boolean|break|case|catch|class|const|continue|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|implements|import|in|instanceof|interface|keyof|let|namespace|never|new|null|number|of|override|private|protected|public|readonly|return|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unknown|var|void|while|with|yield)\b/g],
        ['hl-fn',  /\b([A-Za-z_$][\w$]*)\s*(?=\()/g],
        ['hl-num', NUM_HEX],
    ];
    if (L === 'bash' || L === 'sh' || L === 'shell' || L === 'zsh') return [
        ['hl-cmt', CMT_HASH],
        ['hl-str', STR_DQSQ],
        ['hl-kw',  /\b(case|do|done|elif|else|esac|fi|for|function|if|in|return|select|then|until|while)\b/g],
        ['hl-fn',  /\$\{?[\w]+\}?/g],
        ['hl-num', NUM_BASIC],
    ];
    if (L === 'json') return [
        ['hl-fn',  /"(?:[^"\\]|\\.)*"(?=\s*:)/g],
        ['hl-str', STR_DQSQ],
        ['hl-kw',  /\b(true|false|null)\b/g],
        ['hl-num', /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g],
    ];
    if (L === 'html' || L === 'xml') return [
        ['hl-cmt', CMT_HTML],
        ['hl-fn',  /<\/?[A-Za-z][\w:-]*/g],
        ['hl-str', STR_DQSQ],
        ['hl-kw',  />/g],
    ];
    if (L === 'css' || L === 'scss' || L === 'less') return [
        ['hl-cmt', /\/\*[\s\S]*?\*\//g],
        ['hl-fn',  /[.#][\w-]+|@[\w-]+/g],
        ['hl-str', STR_DQSQ],
        ['hl-kw',  /\b[\w-]+(?=\s*:)/g],
        ['hl-num', /#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?[\w]*/g],
    ];
    if (L === 'sql') return [
        ['hl-cmt', CMT_SQL],
        ['hl-kw',  /\b(ADD|ALL|ALTER|AND|AS|ASC|BETWEEN|BY|CASE|COLUMN|COUNT|CREATE|CROSS|DATABASE|DEFAULT|DELETE|DESC|DISTINCT|DROP|ELSE|END|EXISTS|FOREIGN|FROM|FULL|GROUP|HAVING|IN|INDEX|INNER|INSERT|INTO|IS|JOIN|LEFT|LIKE|LIMIT|NOT|NULL|OF|OFFSET|ON|OR|ORDER|OUTER|PRIMARY|REFERENCES|RIGHT|SELECT|SET|TABLE|THEN|TOP|TRUNCATE|UNION|UNIQUE|UPDATE|VALUES|VIEW|WHEN|WHERE|WITH)\b/gi],
        ['hl-str', STR_DQSQ],
        ['hl-num', NUM_BASIC],
    ];
    return [];
}

function _hl(code, lang) {
    var rules = _hlRules(lang);
    if (!rules.length) return esc(code);

    var out = '';
    var pos = 0;

    while (pos < code.length) {
        var bestIdx   = code.length;
        var bestMatch = null;
        var bestCls   = '';

        for (var ri = 0; ri < rules.length; ri++) {
            var re = rules[ri][1];
            re.lastIndex = pos;
            var m = re.exec(code);
            if (m && m.index < bestIdx) {
                bestIdx   = m.index;
                bestMatch = m;
                bestCls   = rules[ri][0];
                if (bestIdx === pos) break; // can't beat current position
            }
        }

        if (!bestMatch) { out += esc(code.slice(pos)); break; }
        if (bestIdx > pos) out += esc(code.slice(pos, bestIdx));
        out += '<span class="' + bestCls + '">' + esc(bestMatch[0]) + '</span>';
        pos = bestIdx + bestMatch[0].length || bestIdx + 1; // guard zero-length
    }

    return out;
}

// ─────────────────────────────────────────────────────────────────────────────

function _mdInline(text) {
    let s = esc(text);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    return s;
}

function _mdTableRow(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
}

function _md(text) {
    const lines = text.split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code block
        if (/^```/.test(line)) {
            const lang = line.slice(3).trim();
            i++;
            const codeLines = [];
            while (i < lines.length && !/^```/.test(lines[i])) { codeLines.push(lines[i]); i++; }
            if (i < lines.length) i++;
            const codeText   = codeLines.join('\n');
            const langLabel  = lang ? esc(lang) : '';
            const codeHtml   = _hl(codeText, lang);
            const langClass  = langLabel ? ' class="language-' + langLabel + '"' : '';
            html += '<div class="code-block">'
                  + '<div class="code-block-hd">'
                  + '<span class="code-block-lang">' + langLabel + '</span>'
                  + '<button class="code-block-copy" type="button">' + _COPY_ICON + '</button>'
                  + '</div>'
                  + '<pre><code' + langClass + '>' + codeHtml + '</code></pre>'
                  + '</div>';
            continue;
        }

        // Table: current line has pipes, next is separator (only |-: chars)
        if (/\|/.test(line) && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1])) {
            html += '<table><thead><tr>';
            _mdTableRow(line).forEach(function (h) { html += `<th>${_mdInline(h)}</th>`; });
            html += '</tr></thead><tbody>';
            i += 2;
            while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
                html += '<tr>';
                _mdTableRow(lines[i]).forEach(function (c) { html += `<td>${_mdInline(c)}</td>`; });
                html += '</tr>';
                i++;
            }
            html += '</tbody></table>';
            continue;
        }

        // Heading (h1–h3)
        const hm = line.match(/^(#{1,3}) +(.*)/);
        if (hm) {
            html += `<h${hm[1].length}>${_mdInline(hm[2])}</h${hm[1].length}>`;
            i++;
            continue;
        }

        // Unordered list
        if (/^[-*+] /.test(line)) {
            html += '<ul>';
            while (i < lines.length && /^[-*+] /.test(lines[i])) {
                html += `<li>${_mdInline(lines[i].replace(/^[-*+] +/, ''))}</li>`;
                i++;
            }
            html += '</ul>';
            continue;
        }

        // Ordered list
        if (/^\d+\. /.test(line)) {
            html += '<ol>';
            while (i < lines.length && /^\d+\. /.test(lines[i])) {
                html += `<li>${_mdInline(lines[i].replace(/^\d+\. +/, ''))}</li>`;
                i++;
            }
            html += '</ol>';
            continue;
        }

        // Empty line — skip
        if (!line.trim()) { i++; continue; }

        // Paragraph: collect consecutive plain lines
        const pLines = [];
        while (
            i < lines.length && lines[i].trim() &&
            !/^```/.test(lines[i]) &&
            !/^#{1,3} /.test(lines[i]) &&
            !/^[-*+] /.test(lines[i]) &&
            !/^\d+\. /.test(lines[i]) &&
            !(/\|/.test(lines[i]) && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1]))
        ) { pLines.push(lines[i]); i++; }
        if (pLines.length) html += `<p>${pLines.map(_mdInline).join('<br>')}</p>`;
    }

    return html;
}

function _fmtTok(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

class AgentChatDialog {
    constructor(agent) {
        this.agent = agent;
        this.messages = [];
        this._sessionTok = { in: 0, out: 0 };
        this._timerInterval = null;
        this._timerSecs = 0;
        this._timerRemaining = 0;
        this._abortCtrl = null;
        this._el = null;
        this._convId = null;
        this._convList = [];
        this._convPage = 1;
        this._isGuest = false;
    }

    _sumHistoryTok() {
        return this.messages.reduce(function (acc, m) {
            if (m.tokens) {
                acc.in += m.tokens.in || 0;
                acc.out += m.tokens.out || 0;
            }
            return acc;
        }, { in: 0, out: 0 });
    }

    open() {
        if (document.getElementById('ga-chat-modal')) return;
        const el = document.createElement('div');
        el.id = 'ga-chat-modal';
        el.className = 'chat-modal-bg';
        const name = this.agent.name || 'Agente';
        const initials = name.charAt(0).toUpperCase();
        const globalTimeout = Number(localStorage.getItem('ga-chat-timeout')) || 0;
        const hasTimeout = (this.agent.timeout > 0) || globalTimeout > 0;
        const density = localStorage.getItem('ga-chat-density') || 'normal';
        el.innerHTML = `
        <div class="chat-box${density === 'compact' ? ' chat-box--compact' : ''}" id="ga-chat-box">
            <div class="chat-header">
                <div class="chat-header-avatar">${esc(initials)}</div>
                <div class="chat-header-info">
                    <div class="chat-header-name">${esc(name)}</div>
                    <div class="chat-header-sub">
                        ${esc(this.agent.model || '')}
                        <span class="chat-tok-counter" id="ga-tok-counter" style="display:none">
                            · ${_ARR_UP} <span id="ga-tok-in">0</span> ${_ARR_DOWN} <span id="ga-tok-out">0</span> tok
                        </span>
                    </div>
                </div>
                <div class="chat-header-actions">
                    ${hasTimeout ? `
                    <div class="chat-countdown" id="ga-chat-countdown">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="11" fill="none" stroke="var(--surface-3)" stroke-width="2"/>
                            <circle class="ccd-ring" id="ga-ccd-ring" cx="12" cy="12" r="11" stroke-width="2"/>
                        </svg>
                        <span id="ga-ccd-label">—</span>
                    </div>` : ''}
                    <button class="modal-close" id="ga-chat-close" type="button" title="${t('agents.chat.close')}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chat-body" id="ga-chat-body">
                <div class="chat-history-sidebar" id="ga-chat-history" style="display:none"></div>
                <div class="chat-messages" id="ga-chat-msgs"></div>
            </div>
            <div class="chat-input-bar">
                <textarea class="chat-input" id="ga-chat-input" placeholder="${t('agents.chat.placeholder')}" rows="1"></textarea>
                <button class="chat-send-btn" id="ga-chat-send" title="${t('actions.send')}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 14L14 8 2 2v4l8 2-8 2v4z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        </div>`;
        document.body.appendChild(el);
        this._el = el;
        this._bindClose();
        this._bindSend();
        this._bindCopyButtons();
        this._autoResizeInput();
        this._renderMessages();
        document.getElementById('ga-chat-input').focus();
        this._initConversation();
    }

    // ── Conversation lifecycle ────────────────────────────────────────────────

    async _initConversation() {
        try {
            const list = await api.get(`/api/chats/${encodeURIComponent(this.agent.id)}`);
            if (list.length > 0) {
                this._convList = list;
                this._convPage = 1;
                const target = this._convId && list.find(c => c.id === this._convId)
                    ? this._convId : list[0].id;
                await this._loadConversation(target);
                this._showSidebar();
            } else {
                await this._newConversation();
            }
        } catch { this._fallbackGuest(); }
    }

    _fallbackGuest() {
        this._isGuest = true;
        this.messages = this._loadHistory();
        this._sessionTok = this._sumHistoryTok();
        this._renderMessages();
    }

    _showSidebar() {
        const sidebar = document.getElementById('ga-chat-history');
        const box = document.getElementById('ga-chat-box');
        if (!sidebar || !box) return;
        sidebar.style.display = '';
        box.classList.add('chat-box--with-history');
    }

    async _newConversation() {
        let conv;
        try {
            conv = await api.post(`/api/chats/${encodeURIComponent(this.agent.id)}`, { title: '' });
        } catch (e) {
            if (e.status === 403) { this._fallbackGuest(); }
            return;
        }
        this._convList.unshift(conv);
        this._convId = conv.id;
        this.messages = [];
        this._sessionTok = { in: 0, out: 0 };
        this._showSidebar();
        this._renderSidebar();
        this._renderMessages();
    }

    async _loadConversation(convId) {
        let msgs;
        try {
            msgs = await api.get(`/api/chats/${encodeURIComponent(this.agent.id)}/${encodeURIComponent(convId)}`);
        } catch { return; }
        this._convId = convId;
        this.messages = msgs.map(m => ({
            role: m.role,
            content: m.content,
            ts: m.created_at ? m.created_at.slice(11, 16) : '',
        }));
        this._sessionTok = this._sumHistoryTok();
        this._renderSidebar();
        this._renderMessages();
    }

    async _deleteConversation(convId) {
        const r = await fetch(
            `/api/chats/${encodeURIComponent(this.agent.id)}/${encodeURIComponent(convId)}`,
            { method: 'DELETE' }
        );
        if (!r.ok) return;
        this._convList = this._convList.filter(c => c.id !== convId);
        if (this._convId === convId) {
            if (this._convList.length > 0) {
                await this._loadConversation(this._convList[0].id);
            } else {
                this._convId = null;
                await this._newConversation();
            }
        } else {
            this._renderSidebar();
        }
    }

    _renderSidebar() {
        const el = document.getElementById('ga-chat-history');
        if (!el) return;
        const newLabel = t('agents.chat.new_conversation') || 'Nueva conversación';
        const ps = getPageSize();
        const visible = this._convList.slice(0, this._convPage * ps);
        const hasMore = this._convList.length > visible.length;
        const items = visible.map(c => {
            const title = c.title || newLabel;
            const active = c.id === this._convId ? ' active' : '';
            return `<li class="chat-history-item${active}" data-conv-id="${esc(c.id)}">
                <span class="history-item-title">${esc(title)}</span>
                <button class="history-del-btn" data-del-id="${esc(c.id)}" title="${t('common.actions.delete') || 'Borrar'}">${_ICON_X}</button>
            </li>`;
        }).join('');
        const moreBtn = hasMore
            ? `<button class="history-load-more-btn" id="ga-hist-more">Ver ${this._convList.length - visible.length} más</button>`
            : '';
        el.innerHTML = `
            <button class="history-new-btn" id="ga-history-new">
                <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                ${esc(newLabel)}
            </button>
            <ul class="chat-history-list">${items}</ul>
            ${moreBtn}`;
        document.getElementById('ga-history-new')?.addEventListener('click', () => this._newConversation());
        document.getElementById('ga-hist-more')?.addEventListener('click', () => {
            this._convPage++;
            this._renderSidebar();
        });
        el.querySelectorAll('.chat-history-item').forEach(li => {
            const convId = li.dataset.convId;
            li.addEventListener('click', e => {
                if (e.target.closest('.history-del-btn')) return;
                this._loadConversation(convId);
            });
        });
        el.querySelectorAll('.history-del-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this._deleteConversation(btn.dataset.delId);
            });
        });
    }

    // ── Copy buttons (delegated) ──────────────────────────────────────────────

    _bindCopyButtons() {
        const cont = document.getElementById('ga-chat-msgs');
        if (!cont) return;
        cont.addEventListener('click', (e) => {
            const btn = e.target.closest('.code-block-copy');
            if (!btn) return;
            const code = btn.closest('.code-block')?.querySelector('code')?.textContent ?? '';
            const orig = btn.innerHTML;
            const apply = () => {
                btn.innerHTML = _CHECK_ICON;
                btn.classList.add('code-block-copy--ok');
                setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('code-block-copy--ok'); }, 1500);
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(code).then(apply).catch(() => {});
            } else {
                const ta = Object.assign(document.createElement('textarea'), { value: code });
                ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); apply(); } catch (_) {}
                ta.remove();
            }
        });
    }

    // ── Input / send ─────────────────────────────────────────────────────────

    _bindClose() {
        document.getElementById('ga-chat-close')?.addEventListener('click', () => this.close());
    }

    _updateSessionTok() {
        var counter = document.getElementById('ga-tok-counter');
        var inEl = document.getElementById('ga-tok-in');
        var outEl = document.getElementById('ga-tok-out');
        if (!counter) return;
        counter.style.display = '';
        if (inEl) inEl.textContent = _fmtTok(this._sessionTok.in);
        if (outEl) outEl.textContent = _fmtTok(this._sessionTok.out);
    }

    _bindSend() {
        const sendBtn = document.getElementById('ga-chat-send');
        const input = document.getElementById('ga-chat-input');
        sendBtn.addEventListener('click', () => this._send());
        input.addEventListener('keydown', e => {
            const enterToSend = localStorage.getItem('ga-send-on-enter') !== 'false';
            if (e.key === 'Enter' && !e.shiftKey && enterToSend) { e.preventDefault(); this._send(); }
            if (e.key === 'Enter' && e.ctrlKey && !enterToSend) { e.preventDefault(); this._send(); }
        });
    }

    _loadHistory() {
        try {
            const raw = localStorage.getItem(`chat_history_${this.agent.id}`);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    _saveHistory() {
        if (!this._isGuest) return;
        try {
            localStorage.setItem(`chat_history_${this.agent.id}`, JSON.stringify(this.messages));
        } catch { /* storage lleno o no disponible */ }
    }

    _autoResizeInput() {
        const input = document.getElementById('ga-chat-input');
        if (!input) return;
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    }

    async _send() {
        const input = document.getElementById('ga-chat-input');
        const text = input?.value.trim();
        if (!text) return;
        input.value = '';
        input.style.height = 'auto';
        this._setLoading(true);
        var now = new Date();
        this.messages.push({ role: 'user', content: text, ts: now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') });
        this._saveHistory();
        this._renderMessages();
        this._appendTyping();
        const ctrl = new AbortController();
        this._abortCtrl = ctrl;
        this._startTimer();
        try {
            const body = { messages: this.messages.map(function (m) { return { role: m.role, content: m.content }; }) };
            if (this._convId) body.conversation_id = this._convId;
            const resp = await fetch(`/api/agents/${encodeURIComponent(this.agent.id)}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: ctrl.signal,
            });
            if (!resp.ok) throw new Error(`Error ${resp.status}`);
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            let reply = '';
            let tokens = null;
            let serverError = null;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === 'token') { reply += ev.token; }
                        if (ev.type === 'done') {
                            reply = ev.reply || reply;
                            tokens = (ev.tokens && (ev.tokens.in || ev.tokens.out)) ? ev.tokens : null;
                        }
                        if (ev.type === 'error') { serverError = ev.message || 'Error desconocido'; }
                    } catch { /* ignorar líneas no-json */ }
                }
            }
            this._stopTimer();
            this._removeTyping();
            if (ctrl.signal.aborted) {
                this._pushSystem(t('agents.chat.timeout_msg') || 'Tiempo agotado — el agente no respondió a tiempo.');
                return;
            }
            if (serverError) throw new Error(serverError);
            var replyTs = new Date();
            var replyTime = replyTs.getHours() + ':' + String(replyTs.getMinutes()).padStart(2, '0');
            this.messages.push({ role: 'assistant', content: reply, ts: replyTime, tokens: tokens });
            if (tokens) {
                this._sessionTok.in += tokens.in || 0;
                this._sessionTok.out += tokens.out || 0;
                this._updateSessionTok();
            }
            this._saveHistory();
            this._renderMessages();
            // Auto-fill conversation title locally on first message
            if (this._convId) {
                const conv = this._convList.find(c => c.id === this._convId);
                if (conv && !conv.title) {
                    conv.title = text.slice(0, 80);
                    this._renderSidebar();
                }
            }
        } catch (e) {
            this._stopTimer();
            this._removeTyping();
            if (e.name === 'AbortError' || ctrl.signal.aborted) {
                this._pushSystem(t('agents.chat.timeout_msg') || 'Tiempo agotado — el agente no respondió a tiempo.');
            } else {
                toast(e.message, 'error');
            }
        } finally {
            this._abortCtrl = null;
            this._setLoading(false);
        }
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    _renderMessages() {
        const cont = document.getElementById('ga-chat-msgs');
        if (!cont) return;
        const initials = this.agent.name?.charAt(0)?.toUpperCase() || '?';
        cont.innerHTML = this.messages.map(m => {
            if (m.role === 'system') {
                return `<div class="msg-wrap msg-system"><div class="msg-system-text">${esc(m.content)}</div></div>`;
            }
            const tokBadge = (m.role === 'assistant' && m.tokens)
                ? `<div class="msg-tok">${_ARR_UP} ${_fmtTok(m.tokens.in)} ${_ARR_DOWN} ${_fmtTok(m.tokens.out)} tok</div>`
                : '';
            const time = m.ts ? `<span class="msg-time">${esc(m.ts)}</span>` : '';
            return `
            <div class="msg-wrap ${m.role}">
                <div class="msg-avatar">${m.role === 'assistant' ? esc(initials) : _USER_AVATAR}</div>
                <div class="msg-body">
                    <div class="msg-bubble">${m.role === 'assistant' ? _md(m.content) : esc(m.content)}</div>
                    <div class="msg-meta">${time}${tokBadge}</div>
                </div>
            </div>`;
        }).join('');
        cont.scrollTop = cont.scrollHeight;
        if (this._sessionTok.in || this._sessionTok.out) this._updateSessionTok();
    }

    _appendTyping() {
        const cont = document.getElementById('ga-chat-msgs');
        if (!cont) return;
        const el = document.createElement('div');
        el.id = 'ga-typing';
        el.className = 'msg-wrap assistant';
        el.innerHTML = `
            <div class="msg-avatar">${esc(this.agent.name?.charAt(0)?.toUpperCase() || '?')}</div>
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>`;
        cont.appendChild(el);
        cont.scrollTop = cont.scrollHeight;
    }

    _removeTyping() {
        document.getElementById('ga-typing')?.remove();
    }

    _pushSystem(text) {
        this.messages.push({ role: 'system', content: text });
        this._renderMessages();
    }

    _setLoading(on) {
        const btn = document.getElementById('ga-chat-send');
        const input = document.getElementById('ga-chat-input');
        if (btn) btn.disabled = on;
        if (input) input.disabled = on;
    }

    // ── Timer ─────────────────────────────────────────────────────────────────

    _startTimer() {
        let secs = Number(this.agent.timeout) || 0;
        if (!secs) secs = Number(localStorage.getItem('ga-chat-timeout')) || 0;
        if (!secs) return;
        this._timerSecs = secs;
        this._timerRemaining = secs;
        const cdEl = document.getElementById('ga-chat-countdown');
        const ring = document.getElementById('ga-ccd-ring');
        const label = document.getElementById('ga-ccd-label');
        const circ = 69.115; // 2π×11

        if (!cdEl) return;
        cdEl.classList.add('active');

        const update = () => {
            if (!label || !ring) return;
            const frac = this._timerRemaining / this._timerSecs;
            const offset = circ * (1 - frac);
            ring.style.strokeDashoffset = offset;
            const m = Math.floor(this._timerRemaining / 60);
            const s = this._timerRemaining % 60;
            label.textContent = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
            cdEl.classList.toggle('expiring', frac <= 0.2 && frac > 0);
            cdEl.classList.toggle('expired', frac <= 0);
        };

        update();
        this._timerInterval = setInterval(() => {
            this._timerRemaining = Math.max(0, this._timerRemaining - 1);
            update();
            if (this._timerRemaining === 0) {
                this._stopTimer();
                this._abortCtrl?.abort();
            }
        }, 1000);
    }

    _stopTimer() {
        clearInterval(this._timerInterval);
        this._timerInterval = null;
        const cdEl = document.getElementById('ga-chat-countdown');
        cdEl?.classList.remove('active', 'expiring', 'expired');
    }

    close() {
        this._stopTimer();
        this._el?.remove();
        this._el = null;
    }
}

if (!window._chatInstances) window._chatInstances = new Map();

window.openChat = function (agent) {
    let dlg = window._chatInstances.get(agent.id);
    if (!dlg) {
        dlg = new AgentChatDialog(agent);
        window._chatInstances.set(agent.id, dlg);
    }
    dlg.open();
};
