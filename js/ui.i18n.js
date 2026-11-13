/* Shared interface texts added during the audit (EN / RU / KK). Merged into the main dictionary; load after i18n.js. */
(function () {
  "use strict";
  var D = window.I18N && window.I18N.dict; if (!D) return;
  var X = {
    en: { "nav.menu": "Menu" },
    ru: { "nav.menu": "Меню" },
    kk: { "nav.menu": "Мәзір" }
  };
  Object.keys(X).forEach(function (l) { D[l] = D[l] || {}; Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
