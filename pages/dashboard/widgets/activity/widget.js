(function () {
    'use strict';

    var _PREVIEW = (function(){
        var vals=[20,48,32,72,52,88,58,100,42,68,82,46,92,62];
        var n=vals.length, w=160, h=56, bw=w/n-2;
        var bars = vals.map(function(v,i){
            var bh=Math.round((v/100)*(h-8)), x=i*(bw+2), y=h-bh;
            return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2" fill="var(--accent)" opacity="0.8"/>';
        }).join('');
        return '<svg viewBox="0 0 '+w+' '+h+'" fill="none">'+bars+'</svg>';
    }());

    function _fmt(n) {
        if (!n) return '0';
        if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
        if (n >= 1000)    return (n/1000).toFixed(1)+'k';
        return String(n);
    }

    function _render(data, cfg, el) {
        var size  = cfg.size || 'large';
        var daysMap = { small: 7, medium: 14, large: parseInt(cfg.days, 10) || 14 };
        var days  = daysMap[size] || 14;
        var daily = (data.tokenDaily || []).slice(-days);

        if (!daily.length) {
            el.innerHTML = '<div class="dash-empty">Sin datos de actividad</div>';
            return;
        }

        var total = daily.reduce(function(s, d){ return s + (d.tokens||0); }, 0);
        var mx    = Math.max.apply(null, daily.map(function(d){ return d.tokens||0; }));

        if (size === 'small') {
            // Hero total + tiny sparkline bars
            var miniBars = '<div class="w-activity-histo w-activity-histo--mini">' +
                daily.map(function(d){
                    var pct = mx ? Math.max(4, Math.round(((d.tokens||0)/mx)*100)) : 4;
                    return '<div class="w-activity-bar" style="height:'+pct+'%"></div>';
                }).join('') + '</div>';
            el.innerHTML =
                '<div class="w-activity-hero">'+
                '<span class="w-activity-hero-val">'+_fmt(total)+'</span>'+
                '<span class="w-activity-hero-lbl">tokens / '+days+' dias</span>'+
                '</div>' + (mx ? miniBars : '');
            return;
        }

        if (!mx) {
            el.innerHTML = '<div class="dash-empty">Sin actividad en '+days+' dias</div>';
            return;
        }

        var histoCls = 'w-activity-histo' + (size === 'medium' ? ' w-activity-histo--md' : '');
        var bars = '<div class="'+histoCls+'">' +
            daily.map(function(d){
                var pct = Math.max(2, Math.round(((d.tokens||0)/mx)*100));
                return '<div class="w-activity-bar" style="height:'+pct+'%" title="'+(d.date||'')+': '+(d.tokens||0)+' tokens"></div>';
            }).join('') + '</div>';
        var label1 = daily[0] ? daily[0].date : '';
        var label2 = daily[daily.length-1] ? daily[daily.length-1].date : '';
        el.innerHTML = bars +
            '<div class="w-activity-foot">'+
            '<span class="w-activity-foot-label">'+label1+'</span>'+
            '<span class="w-activity-foot-label">'+label2+'</span>'+
            '</div>';
    }

    window._WIDGET_REGISTRY = window._WIDGET_REGISTRY || {};
    window._WIDGET_REGISTRY['activity'] = {
        title: 'Actividad',
        cols: 4,
        preview: _PREVIEW,
        defaultConfig: { size: 'large', days: 14 },
        render: _render,
    };
}());
