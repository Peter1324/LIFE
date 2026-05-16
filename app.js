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

// ===== GLOBALES OVERLAY SYSTEM =====
// Jedes Overlay egal ob .overlay-bg oder eigene div läuft hier durch
// Nav-Bar wird immer ausgeblendet wenn irgendwas offen ist

function navHide() {
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.setProperty('display', 'none', 'important');
}

function navShow() {
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.removeProperty('display');
}

function anyOverlayOpen() {
  // Prüft sowohl .overlay-bg.open als auch custom z-index Overlays im Zeittracker
  const classOpen = document.querySelector('.overlay-bg.open');
  const styleOpen = ['zStopOverlay','zStartOverlay','zCustomOverlay','zEntryOverlay']
    .some(id => {
      const el = document.getElementById(id);
      return el && el.style.display === 'flex';
    });
  const gtdOpen = ['gNewItemOverlay','gNewProjectOverlay','gItemSheet','gMoveSheet']
    .some(id => document.getElementById(id)?.classList.contains('open'));
  const gymOpen = ['gymExercisePicker','gymSetSheet']
    .some(id => document.getElementById(id)?.classList.contains('open'));
  return classOpen || styleOpen || gtdOpen || gymOpen;
}

// Für .overlay-bg Klassen (GTD, Gym etc.)
function openOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  navHide();
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  setTimeout(() => { if (!anyOverlayOpen()) navShow(); }, 50);
}

// Für Zeittracker custom Overlays (display:flex)
function zShowOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  navHide();
}

function zHideOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  setTimeout(() => { if (!anyOverlayOpen()) navShow(); }, 50);
}

// Schließen wenn daneben getippt
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
  const dateStr = formatDate(now);
  if (document.getElementById('dashDate')) document.getElementById('dashDate').textContent = dateStr;
  if (document.getElementById('zeitDate')) document.getElementById('zeitDate').textContent = dateStr;
  navigate('dashboard');
});
