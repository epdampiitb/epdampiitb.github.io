/* ==========================================================================
   DAMP — course-filter.js
   Client-side search + facet filtering for the course review catalogue.
   Progressive enhancement: with JS off every card is simply visible.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('course-filter');
  var grid = document.getElementById('course-grid');
  if (!form || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.course-card'));
  var q = document.getElementById('cf-q');
  var reset = document.getElementById('cf-reset');
  var count = document.getElementById('cf-count');
  var empty = document.getElementById('cf-empty');
  var selects = Array.prototype.slice.call(form.querySelectorAll('select[data-facet]'));

  // Precompute the haystack once rather than per keystroke.
  cards.forEach(function (c) {
    c._hay = [c.getAttribute('data-code'),
              c.getAttribute('data-name'),
              c.getAttribute('data-prof')].join(' ').toLowerCase();
  });

  function apply() {
    var term = (q && q.value || '').trim().toLowerCase();
    var facets = selects.filter(function (s) { return s.value !== ''; });
    var shown = 0;

    cards.forEach(function (c) {
      var ok = true;

      if (term && c._hay.indexOf(term) === -1) ok = false;

      if (ok) {
        for (var i = 0; i < facets.length; i++) {
          var f = facets[i];
          if (c.getAttribute('data-' + f.getAttribute('data-facet')) !== f.value) {
            ok = false;
            break;
          }
        }
      }

      c.hidden = !ok;
      if (ok) shown++;
    });

    if (count) {
      count.textContent = shown === cards.length
        ? cards.length + ' reviews'
        : shown + ' of ' + cards.length + ' reviews';
    }
    if (empty) empty.hidden = shown !== 0;

    syncUrl(term);
  }

  // Keep filters in the URL so a filtered view can be linked or reloaded.
  function syncUrl(term) {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams();
    if (term) params.set('q', term);
    selects.forEach(function (s) {
      if (s.value) params.set(s.getAttribute('data-facet'), s.value);
    });
    var qs = params.toString();
    window.history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
  }

  function restore() {
    if (!window.URLSearchParams) return;
    var params = new URLSearchParams(window.location.search);
    if (q && params.get('q')) q.value = params.get('q');
    selects.forEach(function (s) {
      var v = params.get(s.getAttribute('data-facet'));
      if (v) s.value = v;
    });
  }

  if (q) q.addEventListener('input', apply);
  selects.forEach(function (s) { s.addEventListener('change', apply); });

  if (reset) {
    reset.addEventListener('click', function () {
      if (q) q.value = '';
      selects.forEach(function (s) { s.value = ''; });
      apply();
      if (q) q.focus();
    });
  }

  // Never let Enter reload the page — there is no server-side search.
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  restore();
  apply();
})();
