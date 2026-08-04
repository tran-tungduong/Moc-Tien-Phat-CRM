import { DB } from './db.js';
import { UI } from './ui.js?v=20260804_v55';

// ─── Application Bootstrap ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  const savedTheme = localStorage.getItem('mtp_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Load local DB
  DB.load();

  // Route based on session
  checkSessionAndRoute();

  // Sync with server in background
  DB.syncWithServer((syncedDb) => {
    const user = DB.getCurrentUser();
    if (user) UI.refreshDashboard(user);
  });

  // Enable Realtime WebSockets auto-update across all devices
  DB.initRealtimeSubscription(() => {
    const user = DB.getCurrentUser();
    if (user) UI.refreshDashboard(user);
  });

  // GitHub Pages can temporarily lose connectivity on mobile devices.
  // Retry the durable local mutation queue as soon as the connection returns.
  window.addEventListener('online', () => DB.syncWithServer());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      DB.syncWithServer();
    }
  });
});

function checkSessionAndRoute() {
  const user = DB.getCurrentUser();
  if (user) {
    UI.renderShell(user, () => {
      UI.renderLogin(checkSessionAndRoute);
    });
    UI.renderDashboard(user);
  } else {
    UI.renderLogin(checkSessionAndRoute);
  }
}
