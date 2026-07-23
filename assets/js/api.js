// api.js — helper para llamadas a la API REST
'use strict';

function _translateApiErrorCode(detail) {
    // detail = { code, message, ...extra } — code se traduce con el namespace
    // 'errors' del i18n; extra (resource/field) se traduce primero por su cuenta
    // e se interpola en la plantilla del code. Fallback al message del backend
    // si el code no tiene traducción (cliente desactualizado).
    var extra = {};
    for (var k in detail) {
        if (k !== 'code' && k !== 'message') extra[k] = detail[k];
    }
    if (extra.resource) {
        extra.resource = (window.t && window.t('errors.resources.' + extra.resource)) || extra.resource;
    }
    if (extra.field) {
        extra.field = (window.t && window.t('errors.fields.' + extra.field)) || extra.field;
    }
    var key = 'errors.' + detail.code;
    var translated = window.t ? window.t(key, extra) : key;
    return (translated && translated !== key) ? translated : (detail.message || key);
}

function _apiError(status, detail) {
    var msg;
    if (!detail) {
        msg = 'Error ' + status;
    } else if (typeof detail === 'string') {
        msg = detail;
    } else if (Array.isArray(detail)) {
        // FastAPI validation errors: [{loc, msg, type}, ...]
        msg = detail.map(function (e) { return e.msg || JSON.stringify(e); }).join('; ');
    } else if (detail && typeof detail === 'object' && detail.code) {
        msg = _translateApiErrorCode(detail);
    } else {
        msg = JSON.stringify(detail);
    }
    var e = new Error(msg);
    e.status = status;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        e.data = detail;
        if (detail.code) e.code = detail.code;
    }
    return e;
}

window.api = {
    _langHeader() {
        var lang = (window.i18n && window.i18n.getLang && window.i18n.getLang()) || localStorage.getItem('ga-lang') || 'es';
        return { 'Accept-Language': lang };
    },
    async get(url) {
        var r = await fetch((window.API_BASE || '') + url, {
            headers: this._langHeader(),
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.json();
    },
    async post(url, body) {
        var r = await fetch((window.API_BASE || '') + url, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, this._langHeader()),
            body: JSON.stringify(body),
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.json();
    },
    async put(url, body) {
        var r = await fetch((window.API_BASE || '') + url, {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, this._langHeader()),
            body: JSON.stringify(body),
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.json();
    },
    async patch(url, body) {
        var r = await fetch((window.API_BASE || '') + url, {
            method: 'PATCH',
            headers: Object.assign({ 'Content-Type': 'application/json' }, this._langHeader()),
            body: JSON.stringify(body),
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.json();
    },
    async getText(url) {
        var r = await fetch((window.API_BASE || '') + url, {
            headers: this._langHeader(),
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.text();
    },
    async del(url) {
        var r = await fetch((window.API_BASE || '') + url, {
            method: 'DELETE',
            headers: this._langHeader(),
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.json();
    },
    async upload(url, formData) {
        var r = await fetch((window.API_BASE || '') + url, {
            method: 'POST',
            headers: this._langHeader(),
            body: formData,
        });
        if (r.status === 401) { window.location.replace('/login/'); throw _apiError(401); }
        if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw _apiError(r.status, d.detail); }
        return r.json();
    },
};
