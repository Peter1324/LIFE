/* ============================================
   app.js — Navigation + globale Hilfsfunktionen
   ============================================ */

// ===== NAVIGATION =====
function navigate(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const screen = document.getElementById('screen-' + screenId);
  if (screen) {
    screen.classList.add('active');
    screen.querySelector('.screen-content')?.classList.add('animate-up');
  }
  const btn = document.querySelector(`[data-screen="${screenId}"]`);
  if (btn) btn.classList.add('active');
  if (screenId === 'dashboard') initDashboard?.();
  if (screenId === 'zeit') initZeittracker?.();
  if (screenId === 'gtd') initGTD?.();
  if (screenId === 'gym') initGym?.();
  if (screenId === 'stats') initStats?.();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.screen));
});

// ===== OVERLAY SYSTEM =====
// Nav-Bar hat z-index:50, alle Overlays haben z-index:9999+
// Overlays liegen IMMER über der Nav — kein show/hide nötig

function openOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function zShowOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function zHideOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// Schließen wenn neben Sheet getippt
document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay-bg')) closeOverlay(e.target.id);
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

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  if (document.getElementById('dashDate')) document.getElementById('dashDate').textContent = formatDate(now);
  if (document.getElementById('zeitDate')) document.getElementById('zeitDate').textContent = formatDate(now);
  navigate('dashboard');
});
