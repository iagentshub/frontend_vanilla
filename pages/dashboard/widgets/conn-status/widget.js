(function () {
    'use strict';

    var _PREVIEW = (function () {
        var cards = [
            ['#22c55e', '124ms'],
            ['#22c55e', '310ms'],
            ['#ef4444', 'Error'],
            ['#f59e0b', '890ms'],
            ['#22c55e', '58ms'],
            ['#22c55e', '201ms'],
        ];
        var cw = 46, gap = 6, cols = 3;
        return '<svg viewBox="0 0 160 76" fill="none">' +
            cards.map(function (c, i) {
                var col = i % cols, row = Math.floor(i / cols);
                var x = col * (cw + gap), y = row * 34;
                return '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="28" rx="4" fill="var(--surface-2)" stroke="var(--line)" stroke-width="1"/>'+
                       '<circle cx="'+(x+8)+'" cy="'+(y+10)+'" r="4" fill="'+c[0]+'"/>'+
                       '<rect x="'+(x+16)+'" y="'+(y+7)+'" width="'+(cw-20)+'" height="4" rx="2" fill="var(--ink)" opacity="0.5"/>'+
                       '<rect x="'+(x+8)+'" y="'+(y+18)+'" width="'+(cw-16)+'" height="3" rx="1.5" fill="'+c[0]+'" opacity="0.55"/>';
            }).join('') + '</svg>';
    }());

    var _cache = {};
    var _instanceId = 0;

    function _buildCards(conns, results) {
        var byId = {};
        (results || []).forEach(function (r) { byId[r.id] = r; });

        return conns.map(function (c) {
            var r       = byId[c.id];
            var pending = !r;
            var ok      = r && r.ok;
            var dot     = pending ? 'w-cs-dot--pending' : (ok ? 'w-cs-dot--ok' : 'w-cs-dot--error');
            var msg     = pending ? 'Comprobando...' : (ok ? r.message : (r.message || 'Error'));

            return '<div class="w-cs-card">' +
                '<div class="w-cs-card-head">' +
                '<span class="w-cs-dot '+dot+'"></span>' +
                '<span class="w-cs-name">'+esc(c.name || c.type || c.id)+'</span>' +
                '</div>' +
                '<span class="w-cs-msg">'+esc(msg)+'</span>' +
                '</div>';
        }).join('');
    }

    function _render(data, cfg, el) {
        var conns = cfg.scope === 'personal'
            ? data.connections.filter(function (c) { return c._personal_key || c.scope === 'personal'; })
            : data.connections;

        if (!conns.length) {
            el.innerHTML = '<div class="dash-empty">Sin conexiones</div>';
            return;
        }

        if (!el._csId) { el._csId = ++_instanceId; }
        el._csPage = 0;
        var key      = el._csId;
        var size     = cfg.size || 'large';
        var pageSize = parseInt(cfg.pageSize, 10) || 4;
        var totalPages = Math.max(1, Math.ceil(conns.length / pageSize));

        function _heroHtml(results) {
            var nOk = results ? results.filter(function(r){ return r.ok; }).length : null;
            var total = conns.length;
            var dotCls = results
                ? (nOk === total ? 'w-cs-dot--ok' : nOk === 0 ? 'w-cs-dot--error' : 'w-cs-dot--pending')
                : 'w-cs-dot--pending';
            var valHtml = results !== null
                ? '<span class="w-cs-hero-val">'+nOk+' <span class="w-cs-hero-sep">/ '+total+'</span></span>'
                : '<span class="w-cs-hero-val w-cs-hero-val--checking">...</span>';
            return '<div class="w-cs-hero">'+
                '<span class="w-cs-dot '+dotCls+'"></span>'+
                valHtml+
                '<span class="w-cs-hero-lbl">conexiones OK</span>'+
                '</div>';
        }

        function _compactRowsHtml(list, results) {
            var byId = {};
            (results || []).forEach(function(r){ byId[r.id] = r; });
            return list.map(function(c){
                var r = byId[c.id];
                var pending = !r;
                var ok = r && r.ok;
                var dot = pending ? 'w-cs-dot--pending' : (ok ? 'w-cs-dot--ok' : 'w-cs-dot--error');
                var status = pending ? 'Comprobando' : (ok ? r.message : (r.message || 'Error'));
                return '<div class="w-cs-compact-row">'+
                    '<span class="w-cs-dot '+dot+'"></span>'+
                    '<span class="w-cs-compact-name">'+esc(c.name||c.type||c.id)+'</span>'+
                    '<span class="w-cs-compact-status">'+esc(status)+'</span>'+
                    '</div>';
            }).join('');
        }

        function _draw(results) {
            var nOk  = results ? results.filter(function(r){ return r.ok; }).length : null;
            var total = conns.length;
            var refreshBtn = '<button class="w-cs-refresh" data-refresh>Actualizar</button>';

            if (size === 'small') {
                el.innerHTML = _heroHtml(results) +
                    '<div class="w-widget-footer"><span class="w-cs-summary">'+(results ? nOk+' / '+total+' OK' : '')+'</span>'+refreshBtn+'</div>';
                el.querySelector('[data-refresh]').addEventListener('click', function(){ delete _cache[key]; _draw(null); _fetchAndDraw(); });
                return;
            }

            if (size === 'medium') {
                var rows = _compactRowsHtml(conns, results);
                el.innerHTML = '<div class="w-cs-compact">'+rows+'</div>'+
                    '<div class="w-widget-footer"><span class="w-cs-summary">'+(results ? nOk+' / '+total+' OK' : 'Comprobando...')+'</span>'+refreshBtn+'</div>';
                el.querySelector('[data-refresh]').addEventListener('click', function(){ delete _cache[key]; _draw(null); _fetchAndDraw(); });
                return;
            }

            // large: paginated card grid
            var page = el._csPage;
            var pageConns = conns.slice(page * pageSize, (page + 1) * pageSize);
            var cards = _buildCards(pageConns, results);
            var summary = results ? nOk + ' / ' + total + ' OK' : 'Comprobando ' + total + ' conexiones...';
            var pagerHtml = totalPages > 1
                ? '<div class="w-pager">'+
                  '<button class="w-pager-btn" data-prev'+(page===0?' disabled':'')+'>&#8592;</button>'+
                  '<span class="w-pager-label">'+(page+1)+' / '+totalPages+'</span>'+
                  '<button class="w-pager-btn" data-next'+(page>=totalPages-1?' disabled':'')+'>&#8594;</button>'+
                  '</div>'
                : '';

            el.innerHTML =
                '<div class="w-cs-grid">' + cards + '</div>' +
                '<div class="w-widget-footer"><span class="w-cs-summary">'+esc(summary)+'</span>'+pagerHtml+refreshBtn+'</div>';

            var prev = el.querySelector('[data-prev]');
            var next = el.querySelector('[data-next]');
            if (prev) prev.addEventListener('click', function(){ el._csPage--; _draw(_cache[key]||null); });
            if (next) next.addEventListener('click', function(){ el._csPage++; _draw(_cache[key]||null); });
            el.querySelector('[data-refresh]').addEventListener('click', function(){ delete _cache[key]; el._csPage=0; _draw(null); _fetchAndDraw(); });
        }

        function _fetchAndDraw() {
            var ids = conns.map(function (c) { return c.id; });
            api.post('/api/connections/test-all', { ids: ids })
                .then(function (res) {
                    var list = Array.isArray(res) ? res : [];
                    _cache[key] = list.filter(function (r) { return ids.indexOf(r.id) !== -1; });
                    _draw(_cache[key]);
                })
                .catch(function () { _draw([]); });
        }

        if (_cache[key]) {
            _draw(_cache[key]);
        } else {
            _draw(null);
            _fetchAndDraw();
        }
    }

    window._WIDGET_REGISTRY = window._WIDGET_REGISTRY || {};
    window._WIDGET_REGISTRY['conn-status'] = {
        title: 'Estado de conexiones',
        cols: 4,
        preview: _PREVIEW,
        defaultConfig: { size: 'large', scope: 'all', pageSize: 4 },
        render: _render,
    };
}());
