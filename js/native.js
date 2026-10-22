// Native Android bridge. Loaded on the web too, but does nothing there.
(() => {
  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

  const { App, StatusBar } = cap.Plugins || {};
  const overlay = document.getElementById('overlay');
  const overlayVisible = () => !!overlay && !overlay.classList.contains('is-hidden');

  if (StatusBar && StatusBar.hide) {
    Promise.resolve(StatusBar.hide()).catch(() => {});
  }

  if (App) {
    App.addListener('backButton', () => {
      const api = window.TankBattle;

      if (api && api.isPlaying()) {
        api.pause();
        return;
      }

      if (overlayVisible()) {
        const menuButton = overlay.querySelector('[data-action="menu"]');
        if (menuButton) {
          menuButton.click();
          return;
        }
      }

      if (api && api.goMenu) api.goMenu();
      if (App.minimizeApp) App.minimizeApp();
    });

    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        if (window.TankBattle && window.TankBattle.isPlaying()) {
          window.TankBattle.pause();
        }
      } else if (window.TankBattle && window.TankBattle.resumeAudio) {
        window.TankBattle.resumeAudio();
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.TankBattle && window.TankBattle.resumeAudio) {
      window.TankBattle.resumeAudio();
    }
  });
})();
