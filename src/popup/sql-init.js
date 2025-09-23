// Initialize SQL.js for genanki-js in extension popup context
// Expects sql-wasm.js to be loaded before this script.
(function initSql() {
  try {
    // Provide locateFile so sql-wasm.js can find the wasm within the extension package
    const locate = (filename) => {
      return chrome?.runtime?.getURL ? chrome.runtime.getURL('vendor/sql/sql-wasm.wasm') : '../../vendor/sql/sql-wasm.wasm';
    };

    // Make config visible if other code expects it
    window.config = window.config || { locateFile: locate };

    if (typeof initSqlJs === 'function') {
      initSqlJs(window.config).then((sql) => {
        window.SQL = sql;
        console.log('[sql-init] SQL.js initialized');
      }).catch((err) => {
        console.error('[sql-init] Failed to initialize SQL.js', err);
      });
    } else {
      console.warn('[sql-init] initSqlJs not found; ensure sql-wasm.js is loaded before this script');
    }
  } catch (e) {
    console.error('[sql-init] Error during SQL.js init', e);
  }
})();
