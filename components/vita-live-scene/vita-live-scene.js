'use strict';

(() => {
  const initialize = () => {
    const container = document.getElementById('vita-live-scene');

    if (!container) {
      return;
    }

    console.debug('vita-live-scene: módulo preparado.');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
