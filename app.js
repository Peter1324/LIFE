/* ============================================
   app.js — Navigation + globale Hilfsfunktionen
   ============================================ */

// ===== NAVIGATION =====
function navigate(screenId) {
  // Alle Screens ausblenden
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Gewünschten Screen anzeigen
  const screen = document.getElementById('screen-' + screenId);
  if (screen) {
    screen.classList.add('active');
    screen.querySelector('.screen-content')?.classList.add('animate-up');
  }

  // Nav-Button aktivieren
  const btn = document.querySelector(`[data-screen="${screenId}"]`);
  if (btn) btn.classList.add('active');

  // Screen-spezifische Initialisierung
  if (screenId === 'dashboard') initDashboard?.();
  if (screenId === 'zeit') initZeittracker?.();
  if (screenId === 'gtd') initGTD?.();
  if (screenId === 'gym') initGym?.();
  if (screenId === 'stats') initStats?.();
}

// Nav-Buttons mit Klick belegen
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    navigate(btn.dataset.screen);
  });
});

// ===== TOAST =====
let toastTimeout;
function showToast(msg) {
  let t = document.getElementById('globalToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'globalToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== DATUM FORMATIERUNG =====
function formatDate(date) {
  return date.toLocaleDateString('de', { weekday:'long', day:'numeric', month:'long' });
}

function formatTime(date) {
  return date.toLocaleTimeString('de', { hour:'2-digit', minute:'2-digit' });
}

function formatDateShort(date) {
  return date.toLocaleDateString('de', { day:'numeric', month:'short' });
}

// ===== OVERLAY HELPER =====
function openOverlay(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeOverlay(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Overlay schließen wenn man daneben tippt
document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay-bg')) {
    e.target.classList.remove('open');
  }
});

// ===== DATUM AUF STARTSCREEN =====
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const dateStr = formatDate(now);
  document.getElementById('dashDate')?.setAttribute('textContent', dateStr);
  if (document.getElementById('dashDate')) document.getElementById('dashDate').textContent = dateStr;
  if (document.getElementById('zeitDate')) document.getElementById('zeitDate').textContent = dateStr;

  // Startscreen laden
  navigate('dashboard');
});
