(function () {
    'use strict';

    var _PREVIEW = (function(){
        var cards = [[0,0],[82,0],[0,44],[82,44]].map(function(p){
            return '<rect x="'+p[0]+'" y="'+p[1]+'" width="74" height="36" rx="5" fill="var(--surface-2)" stroke="var(--line)" stroke-width="1"/>'+
                   '<rect x="'+(p[0]+8)+'" y="'+(p[1]+8)+'" width="40" height="5" rx="2" fill="var(--ink)" opacity="0.5"/>'+
                   '<rect x="'+(p[0]+8)+'" y="'+(p[1]+18)+'" width="28" height="4" rx="2" fill="var(--ink-3)" opacity="0.35"/>';
        }).join('');
        return '<svg viewBox="0 0 160 84" fill="none">'+cards+'</svg>';
    }());

    function _render(data, cfg, el) {
        var all = (data.agents || []).slice().reverse();
        if (!all.length) {
            el.innerHTML = '<div class="dash-empty">Sin agentes</div>';
            return;
        }

        var size     = cfg.size || 'large';
        var pageSize = parseInt(cfg.pageSize, 10) || 4;
        if (el._recentPage === undefined) el._recentPage = 0;
        var totalPages = Math.max(1, Math.ceil(all.length / pageSize));
        if (el._recentPage >= totalPages) el._recentPage = 0;

        function _pager(page) {
            if (totalPages <= 1) return '';
            return '<div class="w-widget-footer"><div class="w-pager">'+
                '<button class="w-pager-btn" data-prev'+(page===0?' disabled':'')+'>&#8592;</button>'+
                '<span class="w-pager-label">'+(page+1)+' / '+totalPages+'</span>'+
                '<button class="w-pager-btn" data-next'+(page>=totalPages-1?' disabled':'')+'>&#8594;</button>'+
                '</div></div>';
        }

        function _bindPager() {
            var prev = el.querySelector('[data-prev]');
            var next = el.querySelector('[data-next]');
            if (prev) prev.addEventListener('click', function(){ el._recentPage--; _draw(); });
            if (next) next.addEventListener('click', function(){ el._recentPage++; _draw(); });
        }

        function _draw() {
            var page  = el._recentPage;
            var items = all.slice(page * pageSize, (page + 1) * pageSize);

            if (size === 'small') {
                // Simple list: name + model in a tight row
                el.innerHTML = '<div class="w-recent-list">' +
                    items.map(function(a){
                        return '<a href="/agent/'+encodeURIComponent(a.id)+'" class="w-recent-item">'+
                            '<span class="w-recent-item-name">'+esc(a.name||'Agente')+'</span>'+
                            (a.model ? '<span class="w-recent-item-model">'+esc(a.model)+'</span>' : '')+
                            '</a>';
                    }).join('') + '</div>' + _pager(page);
                _bindPager();
                return;
            }

            if (size === 'medium') {
                // 2-column compact cards
                el.innerHTML = '<div class="w-recent-grid w-recent-grid--2col">' +
                    items.map(function(a){
                        return '<a href="/agent/'+encodeURIComponent(a.id)+'" class="w-recent-card w-recent-card--compact">'+
                            '<span class="w-recent-name">'+esc(a.name||'Agente')+'</span>'+
                            (a.model ? '<span class="w-recent-model">'+esc(a.model)+'</span>' : '')+
                            '</a>';
                    }).join('') + '</div>' + _pager(page);
                _bindPager();
                return;
            }

            // large: full card grid
            el.innerHTML = '<div class="w-recent-grid">' +
                items.map(function(a){
                    return '<a href="/agent/'+encodeURIComponent(a.id)+'" class="w-recent-card">'+
                        '<span class="w-recent-name">'+esc(a.name||'Agente')+'</span>'+
                        (a.model ? '<span class="w-recent-model">'+esc(a.model)+'</span>' : '')+
                        '</a>';
                }).join('') + '</div>' + _pager(page);
            _bindPager();
        }

        _draw();
    }

    window._WIDGET_REGISTRY = window._WIDGET_REGISTRY || {};
    window._WIDGET_REGISTRY['recent'] = {
        title: 'Agentes recientes',
        cols: 4,
        preview: _PREVIEW,
        defaultConfig: { size: 'large', pageSize: 4 },
        render: _render,
    };
}());
