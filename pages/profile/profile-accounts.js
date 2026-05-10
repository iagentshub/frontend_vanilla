// profile-accounts.js — sección "Conectar cuentas" en el perfil
'use strict';

var _PROVIDER_LABELS = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    github: 'GitHub Copilot',
    ollama: 'Ollama',
    nvidia: 'NVIDIA NIM',
    google: 'Google Gemini',
};

var _PROVIDER_COLORS = {
    anthropic: '#cc7722',
    openai: '#10a37f',
    github: '#6e40c9',
    ollama: '#5a5a5a',
    nvidia: '#76b900',
    google: '#4285f4',
};

function _initials(provider) {
    return { anthropic: 'An', openai: 'Ai', github: 'GH', ollama: 'Ol', nvidia: 'NV', google: 'Go' }[provider] || provider.slice(0, 2).toUpperCase();
}

function _relativeTime(isoStr) {
    if (!isoStr) return t('profile.accounts.never_synced');
    var diff = Date.now() - new Date(isoStr).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return mins + ' min';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.floor(hrs / 24) + 'd';
}

// ── Modal ────────────────────────────────────────────────────────────────────

function _openAccountModal(provider) {
    var label = _PROVIDER_LABELS[provider] || provider;
    var needsHost = provider === 'ollama';

    document.getElementById('account-modal-provider').value = provider;
    document.getElementById('account-modal-title').textContent =
        t('profile.accounts.modal_title').replace('{provider}', label);
    document.getElementById('account-api-key').value = '';
    document.getElementById('account-host').value = '';
    document.getElementById('account-field-host').style.display = needsHost ? '' : 'none';
    document.getElementById('account-field-apikey').style.display = needsHost ? 'none' : '';

    var placeholders = { anthropic: 'sk-ant-…', openai: 'sk-…', github: 'ghp_…', nvidia: 'nvapi-…', google: 'AIza…' };
    var apiKeyInput = document.getElementById('account-api-key');
    if (apiKeyInput) apiKeyInput.placeholder = placeholders[provider] || '••••••••';
    _clearTestResult();

    var saveBtn = document.getElementById('account-modal-save');
    saveBtn.disabled = false;
    saveBtn.textContent = t('profile.accounts.save_btn');

    document.getElementById('account-modal').style.display = 'flex';
    setTimeout(function () {
        var focusEl = needsHost
            ? document.getElementById('account-host')
            : document.getElementById('account-api-key');
        if (focusEl) focusEl.focus();
    }, 80);
}

function _closeAccountModal() {
    document.getElementById('account-modal').style.display = 'none';
    _clearTestResult();
}

function _clearTestResult() {
    var el = document.getElementById('account-test-result');
    el.style.display = 'none';
    el.className = 'account-test-result';
    el.textContent = '';
}

function _showTestResult(ok, text) {
    var el = document.getElementById('account-test-result');
    el.style.display = '';
    el.className = 'account-test-result account-test-result--' + (ok ? 'ok' : 'error');
    el.textContent = text;
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function _testAccount() {
    var provider = document.getElementById('account-modal-provider').value;
    var apiKey = document.getElementById('account-api-key').value.trim();
    var host = document.getElementById('account-host').value.trim();
    var testBtn = document.getElementById('account-modal-test');

    if (!apiKey && provider !== 'ollama') {
        _showTestResult(false, t('profile.accounts.field_api_key') + ' requerida');
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = t('profile.accounts.testing');
    _clearTestResult();

    try {
        var result = await api.post('/api/accounts/' + provider + '/test', { api_key: apiKey, host: host });
        var modelsText = result.models_count
            ? t('profile.accounts.models_count').replace('{n}', result.models_count)
            : '';
        _showTestResult(true, '✓ ' + t('profile.accounts.test_ok') + (modelsText ? ' — ' + modelsText : ''));
    } catch (e) {
        _showTestResult(false, '✗ ' + (e.message || t('profile.accounts.error_sync')));
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = t('profile.accounts.test_btn');
    }
}

async function _saveAccount() {
    var provider = document.getElementById('account-modal-provider').value;
    var apiKey = document.getElementById('account-api-key').value.trim();
    var host = document.getElementById('account-host').value.trim();
    var saveBtn = document.getElementById('account-modal-save');

    if (!apiKey && provider !== 'ollama') {
        _showTestResult(false, t('profile.accounts.field_api_key') + ' requerida');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = t('profile.accounts.saving');

    try {
        await api.put('/api/accounts/' + provider, { api_key: apiKey, host: host });
        toast(t('profile.accounts.saved'), 'success');
        _closeAccountModal();
        await loadAccounts();
    } catch (e) {
        toast(e.message || t('profile.accounts.error_link'), 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = t('profile.accounts.save_btn');
    }
}

async function _syncAccount(provider, btn) {
    var origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('profile.accounts.syncing');
    try {
        await api.post('/api/accounts/' + provider + '/sync', {});
        toast(t('profile.accounts.synced'), 'success');
        await loadAccounts();
    } catch (e) {
        toast(e.message || t('profile.accounts.error_sync'), 'error');
        btn.disabled = false;
        btn.textContent = origText;
    }
}

async function _unlinkAccount(provider) {
    var label = _PROVIDER_LABELS[provider] || provider;
    var msg = t('profile.accounts.confirm_unlink').replace('{provider}', label);
    if (!confirm(msg)) return;
    try {
        await api.del('/api/accounts/' + provider);
        toast(t('profile.accounts.unlinked'), 'success');
        await loadAccounts();
    } catch (e) {
        toast(e.message || t('profile.accounts.error_link'), 'error');
    }
}

// ── Sync summary ─────────────────────────────────────────────────────────────

function _renderSyncSummary(s) {
    var pills = [];
    var conns = (s.connections_created || 0) + (s.connections_updated || 0);
    if (conns > 0) {
        pills.push(t('profile.accounts.summary_connections').replace('{n}', conns));
    }
    if (s.agents_count > 0) {
        pills.push(t('profile.accounts.summary_agents').replace('{n}', s.agents_count));
    }
    if (s.routines_count > 0) {
        pills.push(t('profile.accounts.summary_routines').replace('{n}', s.routines_count));
    }
    if (s.skills_private_count > 0) {
        pills.push(t('profile.accounts.summary_skills').replace('{n}', s.skills_private_count));
    }
    if (!pills.length) return '';
    return '<div class="account-sync-pills">' +
        pills.map(function (p) { return '<span class="account-sync-pill">' + esc(p) + '</span>'; }).join('') +
        '</div>';
}

// ── Render ───────────────────────────────────────────────────────────────────

function _renderAccounts(accounts) {
    var root = document.getElementById('accounts-list');
    if (!root) return;

    root.innerHTML = accounts.map(function (a) {
        var isLinked = !!a.linked_at;
        var color = _PROVIDER_COLORS[a.provider] || 'var(--ink-3)';
        var label = _PROVIDER_LABELS[a.provider] || a.provider;

        var statusBadge = isLinked
            ? '<span class="account-badge account-badge--linked">' + esc(t('profile.accounts.linked')) + '</span>'
            : '<span class="account-badge account-badge--unlinked">' + esc(t('profile.accounts.not_linked')) + '</span>';

        var meta = '';
        if (isLinked) {
            var modelsText = a.models && a.models.length
                ? t('profile.accounts.models_count').replace('{n}', a.models.length)
                : t('profile.accounts.never_synced');
            var syncText = a.last_synced_at
                ? t('profile.accounts.last_synced') + ': ' + _relativeTime(a.last_synced_at)
                : t('profile.accounts.never_synced');
            meta = '<div class="account-meta">' + esc(syncText) + ' · ' + esc(modelsText) + '</div>';
            if (a.api_key_masked) {
                meta += '<div class="account-key">' + esc(a.api_key_masked) + '</div>';
            }
            if (a.sync_summary && a.last_synced_at) {
                meta += _renderSyncSummary(a.sync_summary);
            }
        }

        var actions = isLinked
            ? '<button class="btn btn-ghost btn-sm account-sync-btn" data-provider="' + esc(a.provider) + '">' + esc(t('profile.accounts.sync_btn')) + '</button>' +
              '<button class="btn btn-danger-ghost btn-sm account-unlink-btn" data-provider="' + esc(a.provider) + '">' + esc(t('profile.accounts.unlink_btn')) + '</button>'
            : '<button class="btn btn-ghost btn-sm account-link-btn" data-provider="' + esc(a.provider) + '">' + esc(t('profile.accounts.link_btn')) + '</button>';

        return '<div class="account-card" data-provider="' + esc(a.provider) + '">' +
            '<div class="account-card-left">' +
            '<div class="account-avatar" style="background:' + color + '">' + _initials(a.provider) + '</div>' +
            '<div class="account-info">' +
            '<div class="account-name">' + esc(label) + '</div>' +
            meta +
            '</div>' +
            '</div>' +
            '<div class="account-card-right">' + statusBadge + '<div class="account-actions">' + actions + '</div></div>' +
            '</div>';
    }).join('');

    root.querySelectorAll('.account-link-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { _openAccountModal(btn.dataset.provider); });
    });
    root.querySelectorAll('.account-sync-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { _syncAccount(btn.dataset.provider, btn); });
    });
    root.querySelectorAll('.account-unlink-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { _unlinkAccount(btn.dataset.provider); });
    });
}

async function loadAccounts() {
    try {
        var accounts = await api.get('/api/accounts');
        _renderAccounts(accounts);
    } catch (e) {
        var root = document.getElementById('accounts-list');
        if (root) root.innerHTML = '';
    }
}

// ── Init ─────────────────────────────────────────────────────────────────────

(function _initModal() {
    var overlay = document.getElementById('account-modal');
    if (!overlay) return;

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeAccountModal();
    });
    document.getElementById('account-modal-close').addEventListener('click', _closeAccountModal);
    document.getElementById('account-modal-cancel').addEventListener('click', _closeAccountModal);
    document.getElementById('account-modal-test').addEventListener('click', _testAccount);
    document.getElementById('account-modal-save').addEventListener('click', _saveAccount);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.style.display !== 'none') _closeAccountModal();
    });
})();

if (window.i18n) {
    window.i18n.ready(loadAccounts);
} else {
    loadAccounts();
}
