// Simple per-page PV display with +50 offset (static site)
// Depends on Busuanzi writing into the hidden span we provide.
// Usage:
//   <div class="site-visit" data-counter-key="home">
//     ... <span class="site-visit-value">加载中...</span>
//     <span class="busuanzi_value_page_pv" style="display:none"></span>
//   </div>
//   <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
//   <script src=".../visit-counter.js"></script>
(function () {
    function toInt(v) {
        var n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10);
        return isNaN(n) ? null : n;
    }

    function safeGetLS(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function safeSetLS(key, val) {
        try { localStorage.setItem(key, val); } catch (e) { }
    }

    function bumpLocalCount(counterKey) {
        var lsKey = 'siteVisit.count.' + counterKey;
        var cur = toInt(safeGetLS(lsKey));
        if (cur === null) cur = 0;
        cur += 1;
        safeSetLS(lsKey, String(cur));
        return cur;
    }

    function getLocalCount(counterKey) {
        var lsKey = 'siteVisit.count.' + counterKey;
        var cur = toInt(safeGetLS(lsKey));
        return cur === null ? 0 : cur;
    }

    function updateAll() {
        var blocks = document.querySelectorAll('.site-visit[data-counter-key]');
        if (!blocks || blocks.length === 0) return false;

        var anyUpdated = false;

        for (var i = 0; i < blocks.length; i++) {
            var el = blocks[i];
            var key = el.getAttribute('data-counter-key') || '';
            var rawEl = el.querySelector('.site-visit-raw');
            var outEl = el.querySelector('.site-visit-value');
            if (!rawEl || !outEl) continue;

            // busuanzi will eventually write number into rawEl
            var raw = toInt(rawEl.textContent);
            if (raw === null) continue;

            // Basic separation:
            // - We rely on the fact that each page only has ONE block.
            // - So raw PV is per-page PV from busuanzi.
            // If you later render multiple counters on one page, you'd need different busuanzi selectors.
            var shown = raw + 50;
            outEl.textContent = String(shown);
            anyUpdated = true;

            // Optional: keep raw visible in DOM for debugging
            // outEl.title = 'raw=' + raw + ' key=' + key;
        }

        return anyUpdated;
    }

    function start() {
        // First: ensure local counter increments once per page load (for fallback mode).
        // We mark a session flag to avoid double-counting when this script is evaluated twice.
        var blocks = document.querySelectorAll('.site-visit[data-counter-key]');
        for (var i = 0; i < blocks.length; i++) {
            var k = blocks[i].getAttribute('data-counter-key') || '';
            if (!k) continue;
            var sessionKey = 'siteVisit.session.' + k;
            try {
                if (!sessionStorage.getItem(sessionKey)) {
                    bumpLocalCount(k);
                    sessionStorage.setItem(sessionKey, '1');
                }
            } catch (e) {
                // If sessionStorage is blocked, fall back to counting anyway.
                bumpLocalCount(k);
            }
        }

        // Try a bunch of times because busuanzi is async and sometimes slow.
        var tries = 0;
        var maxTries = 40; // ~10s if 250ms
        var timer = setInterval(function () {
            tries++;
            var ok = false;
            try { ok = updateAll(); } catch (e) { }
            if (ok) {
                clearInterval(timer);
                return;
            }

            // If busuanzi still didn't populate, switch to local fallback after timeout.
            if (tries >= maxTries) {
                clearInterval(timer);
                for (var i = 0; i < blocks.length; i++) {
                    var el = blocks[i];
                    var key = el.getAttribute('data-counter-key') || '';
                    var outEl = el.querySelector('.site-visit-value');
                    if (!outEl || !key) continue;
                    var local = getLocalCount(key);
                    outEl.textContent = String(local + 50);
                    outEl.title = 'local-counter';
                }
            }
        }, 250);

        // also try once on load
        try { updateAll(); } catch (e) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
