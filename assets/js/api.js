// api.js — helper para llamadas a la API REST
'use strict';

function _apiError(status, detail) {
    var msg;
    if (!detail) {
        msg = 'Error ' + status;
    } else if (typeof detail === 'string') {
        msg = detail;
    } else if (Array.isArray(detail)) {
        // FastAPI validation errors: [{loc, msg, type}, ...]
        msg = detail.map(function (e) { return e.msg || JSON.stringify(e); }).join('; ');
    } else {
        msg = JSON.stringify(detail);
    }
    var e = new Error(msg);
    e.status = status;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        e.data = detail;
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
