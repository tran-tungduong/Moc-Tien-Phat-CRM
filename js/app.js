import { DB } from './db.js?v=20260726_v9';
import { UI } from './ui.js?v=20260726_v9';

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
