/* ============================================
   zeittracker.js — Mario Schlöer Methode
   Start/Stop Timer, minutengenau
   Stimmung 1-10, Mit wem, Aktivität
   ============================================ */

const ZEIT_COLORS = {
  'Tiefarbeit':   '#7a9e5a',
  'E-Mails':      '#5a8aae',
  'Meeting':      '#ae9a5a',
  'Handy/Social': '#ae5a5a',
  'Admin/Orga':   '#7a5aae',
  'Pause':        '#ae7a5a',
  'Lernen':       '#5aae8a',
  'Gespräch':     '#ae6a5a',
  'Schlafen':     '#5a6aae',
  'Sport':        '#ae5a8a',
};
function zGetColor(name) { return ZEIT_COLORS[name] || '#707070'; }

// State
let zActiveEntry = null;      // laufender Eintrag { activity, startTs, withWho }
let zTimerInterval = null;
let zViewDate = new Date();
let zCurrentView = 'home';    // 'home' | 'day'

// ===== INIT =====
function initZeittracker() {
  const content = document.getElementById('screen-zeit')?.querySelector('.screen-content');
  if (!content) return;

  // Laufenden Eintrag aus localStorage laden
  const saved = localStorage.getItem('los_zeit_active');
  if (saved) zActiveEntry = JSON.parse(saved);

  content.innerHTML = `
    <!-- HOME -->
    <div id="zHome"></div>

    <!-- DAY VIEW -->
    <div id="zDay" style="display:none"></div>

    <!-- STOP SHEET — Eintrag abschließen -->
    <div class="overlay-bg" id="zStopSheet" style="overflow:hidden">
      <div class="sheet" style="max-height:80vh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y">
        <div class="sheet-handle"></div>
        <div class="sheet-title" style="margin-bottom:12px">Was hast du gemacht?</div>

        <!-- Aktivität — horizontal scrollbar -->
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Aktivität</div>
        <div id="zActivityGrid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${Object.keys(ZEIT_COLORS).map(name => `
            <button class="chip" id="zAct_${name.replace('/','_')}" onclick="zSelectActivity('${name}')"
              style="gap:6px;padding:7px 10px;white-space:nowrap">
              <span style="width:7px;height:7px;border-radius:50%;background:${zGetColor(name)};flex-shrink:0;display:inline-block"></span>
              ${name}
            </button>`).join('')}
          <button class="chip" onclick="zOpenCustomActivity()" style="padding:7px 10px">
            ✏️ Eigene…
          </button>
        </div>

        <!-- Mit wem -->
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Mit wem?</div>
        <div style="display:flex;gap:6px;margin-bottom:12px">
          <button id="zWithBtn_alleine" onclick="zSetWith('alleine')" class="chip" style="flex:1;justify-content:center;padding:10px">Alleine</button>
          <button id="zWithBtn_joshua" onclick="zSetWith('Joshua')" class="chip" style="flex:1;justify-content:center;padding:10px">Joshua</button>
          <button id="zWithBtn_andere" onclick="zSetWith('andere')" class="chip" style="flex:1;justify-content:center;padding:10px">Andere…</button>
        </div>
        <input type="text" class="input" id="zWithWho" placeholder="Name eingeben…" style="margin-bottom:12px;display:none">

        <!-- Stimmung 1-10 -->
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">
          Stimmung · <span style="font-style:italic">7 = Erwartung erfüllt</span>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:12px" id="zMoodBtns">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `
            <button id="zMood${n}" onclick="zSelectMood(${n})"
              style="flex:1;padding:8px 0;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-family:'Syne',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.12s">
              ${n}
            </button>`).join('')}
        </div>

        <!-- Notiz -->
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Notiz (optional)</div>
        <textarea class="input" id="zNote" placeholder="Erkenntnisse?" rows="2" style="resize:none;margin-bottom:14px"></textarea>

        <!-- Spacer damit Buttons immer sichtbar -->
        <div style="display:flex;gap:8px;margin-top:8px;padding-bottom:20px">
          <button class="btn btn-ghost" onclick="closeOverlay('zStopSheet')" style="flex:0 0 auto;padding:16px 18px;font-size:15px">Abbrechen</button>
          <button class="btn btn-primary" id="zSaveBtn" onclick="zSaveEntry()" disabled style="font-size:16px;padding:16px">Speichern ✓</button>
        </div>
      </div>
    </div>

    <!-- CUSTOM ACTIVITY -->
    <div class="overlay-bg" id="zCustomSheet" style="overflow:hidden">
      <div class="sheet" style="overflow-x:hidden;touch-action:pan-y">
        <div class="sheet-handle"></div>
        <div class="sheet-title">Eigene Aktivität</div>
        <input type="text" class="input" id="zCustomInput" placeholder="Was hast du gemacht?" maxlength="60" style="margin-bottom:12px">
        <button class="btn btn-primary" onclick="zConfirmCustom()">Übernehmen</button>
      </div>
    </div>

    <!-- START SHEET — Aktivität wählen beim Start -->
    <div class="overlay-bg" id="zStartSheet" style="overflow:hidden">
      <div class="sheet" style="overflow-x:hidden;touch-action:pan-y">
        <div class="sheet-handle"></div>
        <div class="sheet-title">Was machst du jetzt?</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px" id="zStartGrid">
          ${Object.keys(ZEIT_COLORS).map(name => `
            <button class="chip" onclick="zConfirmStart('${name}')"
              style="gap:6px;padding:7px 10px;white-space:nowrap">
              <span style="width:8px;height:8px;border-radius:50%;background:${zGetColor(name)};flex-shrink:0;display:inline-block"></span>
              ${name}
            </button>`).join('')}
          <button class="chip" onclick="zOpenCustomStart()" style="grid-column:1/-1;justify-content:center">
            ✏️ Eigene Eingabe…
          </button>
        </div>
        <button class="btn btn-ghost" onclick="closeOverlay('zStartSheet')">Abbrechen</button>
      </div>
    </div>

    <!-- ENTRY DETAIL SHEET -->
    <div class="overlay-bg" id="zEntrySheet" style="overflow:hidden">
      <div class="sheet" style="overflow-x:hidden;touch-action:pan-y">
        <div class="sheet-handle"></div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px" id="zEntrySheetTime"></div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px" id="zEntrySheetTitle"></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-danger" onclick="zDeleteEntry()">🗑 Löschen</button>
          <button class="btn btn-ghost" onclick="closeOverlay('zEntrySheet')" style="color:var(--muted)">Schließen</button>
        </div>
      </div>
    </div>
  `;

  zRenderHome();
  if (zActiveEntry) zStartLiveTimer();
}

// ===== SELECTED STATE =====
let zSelectedActivity = null;
let zSelectedMood = null;

function zSelectActivity(name) {
  zSelectedActivity = name;
  document.querySelectorAll('#zActivityGrid .chip').forEach(b => b.classList.remove('sel'));
  const btn = document.getElementById('zAct_' + name.replace('/', '_'));
  if (btn) btn.classList.add('sel');
  zCheckSaveReady();
}

function zSelectMood(n) {
  zSelectedMood = n;
  for (let i=1; i<=10; i++) {
    const btn = document.getElementById('zMood'+i);
    if (!btn) continue;
    if (i === n) {
      btn.style.background = zMoodColor(n);
      btn.style.color = '#0f0f0f';
      btn.style.borderColor = zMoodColor(n);
    } else {
      btn.style.background = 'var(--surface2)';
      btn.style.color = 'var(--muted)';
      btn.style.borderColor = 'var(--border)';
    }
  }
  zCheckSaveReady();
}

function zMoodColor(n) {
  if (n <= 3) return '#c04040';
  if (n <= 5) return '#ae7a5a';
  if (n <= 7) return '#ae9a5a';
  return '#7a9e5a';
}

function zCheckSaveReady() {
  const btn = document.getElementById('zSaveBtn');
  if (btn) btn.disabled = !(zSelectedActivity && zSelectedMood);
}

function zSetWith(val) {
  const input = document.getElementById("zWithWho");
  ["alleine","joshua","andere"].forEach(k => {
    const btn = document.getElementById("zWithBtn_" + k);
    if (btn) btn.classList.toggle("sel", k === val);
  });
  if (val === "andere") {
    if (input) { input.style.display = "block"; input.focus(); }
  } else {
    if (input) { input.style.display = "none"; input.value = val === "alleine" ? "Alleine" : "Joshua"; }
  }
}

function zOpenCustomActivity() {
  closeOverlay('zStopSheet');
  openOverlay('zCustomSheet');
  setTimeout(() => document.getElementById('zCustomInput')?.focus(), 100);
}

function zConfirmCustom() {
  const val = document.getElementById('zCustomInput')?.value.trim();
  if (!val) return;
  document.getElementById('zCustomInput').value = '';
  closeOverlay('zCustomSheet');
  openOverlay('zStopSheet');
  zSelectedActivity = val;
  zCheckSaveReady();
  // Show as selected text
  const grid = document.getElementById('zActivityGrid');
  if (grid) {
    document.querySelectorAll('#zActivityGrid .chip').forEach(b => b.classList.remove('sel'));
    // Add temp chip
    const existing = document.getElementById('zCustomActBtn');
    if (existing) existing.remove();
    const btn = document.createElement('button');
    btn.id = 'zCustomActBtn';
    btn.className = 'chip sel';
    btn.style.cssText = 'justify-content:flex-start;gap:8px;padding:10px 12px';
    btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#707070;flex-shrink:0;display:inline-block"></span>${val}`;
    btn.onclick = () => {};
    grid.insertBefore(btn, grid.firstChild);
  }
}

// ===== START =====
function zOpenStart() {
  openOverlay('zStartSheet');
}

function zOpenCustomStart() {
  closeOverlay('zStartSheet');
  const overlay = document.createElement('div');
  // Reuse custom sheet with different confirm
  document.getElementById('zCustomInput').value = '';
  openOverlay('zCustomSheet');
  // Override confirm to start
  window._zCustomConfirmMode = 'start';
  setTimeout(() => document.getElementById('zCustomInput')?.focus(), 100);
}

// Override confirmCustom based on mode
const _zOrigConfirm = zConfirmCustom;

function zConfirmCustom() {
  if (window._zCustomConfirmMode === 'start') {
    const val = document.getElementById('zCustomInput')?.value.trim();
    if (!val) return;
    document.getElementById('zCustomInput').value = '';
    closeOverlay('zCustomSheet');
    window._zCustomConfirmMode = null;
    zConfirmStart(val);
    return;
  }
  _zOrigConfirm();
}

function zConfirmStart(activity) {
  closeOverlay('zStartSheet');
  zActiveEntry = {
    activity,
    startTs: Date.now(),
    withWho: '',
  };
  localStorage.setItem('los_zeit_active', JSON.stringify(zActiveEntry));
  zStartLiveTimer();
  zRenderHome();
  showToast(`${activity} gestartet`);
}

// ===== LIVE TIMER =====
function zStartLiveTimer() {
  if (zTimerInterval) clearInterval(zTimerInterval);
  zTimerInterval = setInterval(() => {
    const el = document.getElementById('zLiveTimer');
    if (!el || !zActiveEntry) return;
    const elapsed = Date.now() - zActiveEntry.startTs;
    el.textContent = zFormatElapsed(elapsed);
  }, 1000);
}

function zFormatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// ===== STOP =====
function zOpenStop() {
  // Reset selections
  zSelectedActivity = null;
  zSelectedMood = null;
  document.querySelectorAll('#zActivityGrid .chip').forEach(b => b.classList.remove('sel'));
  for (let i=1; i<=10; i++) {
    const btn = document.getElementById('zMood'+i);
    if (btn) {
      btn.style.background = 'var(--surface2)';
      btn.style.color = 'var(--muted)';
      btn.style.borderColor = 'var(--border)';
    }
  }
  document.getElementById('zWithWho').value = '';
  document.getElementById('zWithWho').style.display = 'none';
  ['alleine','joshua','andere'].forEach(k => {
    const b = document.getElementById('zWithBtn_' + k);
    if (b) b.classList.remove('sel');
  });
  document.getElementById('zNote').value = '';

  // Pre-select activity if known from start
  if (zActiveEntry?.activity) {
    zSelectActivity(zActiveEntry.activity);
  }

  const btn = document.getElementById('zSaveBtn');
  if (btn) btn.disabled = true;

  openOverlay('zStopSheet');
}

function zSaveEntry() {
  if (!zActiveEntry || !zSelectedActivity || !zSelectedMood) return;

  const endTs = Date.now();
  const entry = {
    id: Math.random().toString(36).slice(2),
    activity: zSelectedActivity,
    startTs: zActiveEntry.startTs,
    endTs,
    durationMs: endTs - zActiveEntry.startTs,
    withWho: document.getElementById('zWithWho')?.value.trim() || '',
    mood: zSelectedMood,
    note: document.getElementById('zNote')?.value.trim() || '',
  };

  // Save
  const entries = zGetEntries();
  entries.unshift(entry);
  localStorage.setItem('los_mario_entries', JSON.stringify(entries));

  // Clear active
  zActiveEntry = null;
  localStorage.removeItem('los_zeit_active');
  clearInterval(zTimerInterval);
  zTimerInterval = null;

  closeOverlay('zStopSheet');
  zRenderHome();
  showToast('Eingetragen ✓');
}

// ===== DATA =====
function zGetEntries() {
  const raw = localStorage.getItem('los_mario_entries');
  return raw ? JSON.parse(raw) : [];
}

// ===== HOME =====
function zRenderHome() {
  zCurrentView = 'home';
  const homeEl = document.getElementById('zHome');
  const dayEl = document.getElementById('zDay');
  if (homeEl) homeEl.style.display = 'block';
  if (dayEl) dayEl.style.display = 'none';

  const now = new Date();
  const entries = zGetEntries();
  const todayEntries = entries.filter(e => new Date(e.startTs).toDateString() === now.toDateString());
  const todayMs = todayEntries.reduce((s,e) => s+e.durationMs, 0);

  homeEl.innerHTML = `
    <!-- AKTIVER TIMER -->
    ${zActiveEntry ? `
      <div style="background:var(--surface);border:1px solid var(--accent);border-radius:18px;padding:24px;text-align:center;margin-bottom:14px">
        <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Läuft gerade</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${zGetColor(zActiveEntry.activity)}"></div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">${zActiveEntry.activity}</div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:var(--accent);letter-spacing:-3px;line-height:1" id="zLiveTimer">
          ${zFormatElapsed(Date.now() - zActiveEntry.startTs)}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">
          gestartet um ${new Date(zActiveEntry.startTs).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
        </div>
        <button class="btn btn-primary" onclick="zOpenStop()" style="margin-top:16px;background:var(--danger);border-color:var(--danger)">
          ⏹ Stoppen
        </button>
      </div>` : `
      <button class="btn btn-primary" onclick="zOpenStart()" style="margin-bottom:14px;font-size:18px;padding:20px">
        ▶ Aktivität starten
      </button>`
    }

    <!-- HEUTE STATS -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="stat-cell">
        <div class="stat-num">${zFormatHours(todayMs)}</div>
        <div class="stat-lbl">Heute</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${todayEntries.length}</div>
        <div class="stat-lbl">Blöcke</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${todayEntries.length ? Math.round(todayEntries.reduce((s,e)=>s+e.mood,0)/todayEntries.length*10)/10 : '—'}</div>
        <div class="stat-lbl">Ø Stimmung</div>
      </div>
    </div>

    <!-- TAGES-VORSCHAU -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;cursor:pointer;margin-bottom:14px" onclick="zShowDay()">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Heute im Überblick</div>
        <div style="font-size:11px;color:var(--accent)">Details →</div>
      </div>
      ${zRenderMiniTimeline(todayEntries)}
    </div>

    <!-- LETZTE EINTRÄGE -->
    <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Letzte Einträge</div>
    ${todayEntries.length === 0 ? `
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-icon">⏱</div>
        <div class="empty-title">Noch nichts heute</div>
        <div class="empty-sub">Starte deine erste Aktivität</div>
      </div>` : `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${todayEntries.slice(0,8).map(e => zRenderEntryRow(e)).join('')}
      </div>`
    }

    <!-- EXPORT -->
    <div style="margin-top:16px">
      <button class="btn btn-ghost" onclick="zExportCSV()">↓ CSV exportieren</button>
    </div>
  `;

  if (zActiveEntry) zStartLiveTimer();
}

function zFormatHours(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function zRenderMiniTimeline(entries) {
  if (!entries.length) return `<div style="height:16px;background:var(--surface2);border-radius:5px"></div>`;

  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const dayMs = 24 * 60 * 60 * 1000;
  const totalNowMs = now.getTime() - dayStart.getTime();

  let segments = '';
  let lastEnd = dayStart.getTime();

  const sorted = [...entries].sort((a,b) => a.startTs - b.startTs);

  sorted.forEach(e => {
    const gap = e.startTs - lastEnd;
    if (gap > 0) {
      const pct = (gap / dayMs) * 100;
      segments += `<div style="flex:${pct};background:#1a1a1a;min-width:1px"></div>`;
    }
    const dur = e.durationMs;
    const pct = (dur / dayMs) * 100;
    segments += `<div style="flex:${pct};background:${zGetColor(e.activity)};min-width:2px;border-radius:2px" title="${e.activity}"></div>`;
    lastEnd = e.endTs;
  });

  // Rest bis jetzt
  const remaining = now.getTime() - lastEnd;
  if (remaining > 0) {
    const pct = (remaining / dayMs) * 100;
    segments += `<div style="flex:${pct};background:#1a1a1a"></div>`;
  }

  return `<div style="display:flex;height:16px;border-radius:5px;overflow:hidden;gap:1px;background:var(--bg)">${segments}</div>`;
}

function zRenderEntryRow(e) {
  const start = new Date(e.startTs);
  const end = new Date(e.endTs);
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--surface);border:1px solid var(--border);border-radius:11px;cursor:pointer"
      onclick="zOpenEntrySheet('${e.id}')">
      <div style="width:10px;height:10px;border-radius:50%;background:${zGetColor(e.activity)};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.activity}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">
          ${start.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})} – ${end.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
          ${e.withWho ? ` · ${e.withWho}` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <div style="font-size:11px;color:var(--muted)">${zFormatHours(e.durationMs)}</div>
        <div style="font-size:11px;padding:2px 7px;border-radius:10px;background:${zMoodColor(e.mood)}20;color:${zMoodColor(e.mood)};border:1px solid ${zMoodColor(e.mood)}40">
          ${e.mood}/10
        </div>
      </div>
    </div>`;
}

// ===== ENTRY SHEET =====
let zSheetEntryId = null;

function zOpenEntrySheet(id) {
  zSheetEntryId = id;
  const entries = zGetEntries();
  const e = entries.find(e => e.id === id);
  if (!e) return;

  const start = new Date(e.startTs);
  const end = new Date(e.endTs);
  const timeStr = `${start.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})} – ${end.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})} · ${zFormatHours(e.durationMs)}`;

  document.getElementById('zEntrySheetTime').textContent = timeStr;
  document.getElementById('zEntrySheetTitle').innerHTML = `
    <div style="width:10px;height:10px;border-radius:50%;background:${zGetColor(e.activity)};flex-shrink:0"></div>
    ${e.activity}
    ${e.withWho ? `<span style="font-size:13px;color:var(--muted);font-weight:400">mit ${e.withWho}</span>` : ''}
    <span style="margin-left:auto;font-size:14px;padding:3px 8px;border-radius:10px;background:${zMoodColor(e.mood)}20;color:${zMoodColor(e.mood)}">${e.mood}/10</span>
  `;

  openOverlay('zEntrySheet');
}

function zDeleteEntry() {
  if (!zSheetEntryId) return;
  const entries = zGetEntries().filter(e => e.id !== zSheetEntryId);
  localStorage.setItem('los_mario_entries', JSON.stringify(entries));
  closeOverlay('zEntrySheet');
  if (zCurrentView === 'day') zRenderDayView();
  else zRenderHome();
  showToast('Gelöscht');
}

// ===== DAY VIEW =====
function zShowDay() {
  zCurrentView = 'day';
  document.getElementById('zHome').style.display = 'none';
  document.getElementById('zDay').style.display = 'block';
  zViewDate = new Date();
  zRenderDayView();
}

function zChangeDay(dir) {
  zViewDate = new Date(zViewDate);
  zViewDate.setDate(zViewDate.getDate() + dir);
  zRenderDayView();
}

function zRenderDayView() {
  const el = document.getElementById('zDay');
  if (!el) return;

  const now = new Date();
  const isToday = zViewDate.toDateString() === now.toDateString();
  const entries = zGetEntries().filter(e =>
    new Date(e.startTs).toDateString() === zViewDate.toDateString()
  );

  const dayMs = entries.reduce((s,e) => s+e.durationMs, 0);
  const avgMood = entries.length ? Math.round(entries.reduce((s,e)=>s+e.mood,0)/entries.length*10)/10 : null;

  // Zeitlinie aufbauen — 24h von 0 bis 24
  const dayStart = new Date(zViewDate); dayStart.setHours(0,0,0,0);
  const HOUR_PX = 60;
  const totalPx = 24 * HOUR_PX;

  let timelineHtml = '';

  // Stundenlinien
  for (let h=0; h<=24; h++) {
    const top = h * HOUR_PX;
    timelineHtml += `<div style="position:absolute;left:40px;right:0;height:1px;background:var(--border);top:${top}px;pointer-events:none"></div>`;
    if (h < 24) timelineHtml += `<div style="position:absolute;left:0;font-size:10px;color:var(--muted);width:36px;text-align:right;top:${top}px;transform:translateY(-50%);pointer-events:none">${h.toString().padStart(2,'0')}:00</div>`;
  }

  // Einträge
  const sorted = [...entries].sort((a,b) => a.startTs-b.startTs);
  sorted.forEach(e => {
    const startMin = (e.startTs - dayStart.getTime()) / 60000;
    const durMin = e.durationMs / 60000;
    const top = (startMin / 60) * HOUR_PX;
    const height = Math.max((durMin / 60) * HOUR_PX, 20);

    timelineHtml += `
      <div style="position:absolute;left:48px;right:0;top:${top}px;height:${height}px;border-radius:8px;overflow:hidden;cursor:pointer" onclick="zOpenEntrySheet('${e.id}')">
        <div style="height:100%;background:${zGetColor(e.activity)};padding:5px 8px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:11px;font-weight:500;color:#f0ede6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.activity}</div>
          ${height > 32 ? `<div style="font-size:9px;color:rgba(240,237,230,0.7);margin-top:1px">${zFormatHours(e.durationMs)}${e.withWho?' · '+e.withWho:''} · ${e.mood}/10</div>` : ''}
        </div>
      </div>`;
  });

  // Jetzt-Linie
  if (isToday) {
    const nowMin = (now.getTime() - dayStart.getTime()) / 60000;
    const top = (nowMin / 60) * HOUR_PX;
    timelineHtml += `<div style="position:absolute;left:40px;right:0;height:2px;background:var(--danger);top:${top}px;z-index:10;pointer-events:none"></div>`;
    timelineHtml += `<div style="position:absolute;left:34px;width:10px;height:10px;border-radius:50%;background:var(--danger);top:${top}px;transform:translateY(-50%);z-index:10;pointer-events:none"></div>`;
  }

  el.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <button class="btn btn-icon" onclick="zRenderHome()">←</button>
      <button class="btn btn-icon" onclick="zChangeDay(-1)">‹</button>
      <div style="flex:1;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;letter-spacing:-0.5px">
          ${isToday ? 'Heute' : zViewDate.toLocaleDateString('de',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <div style="font-size:10px;color:var(--muted)">
          ${zViewDate.toLocaleDateString('de',{day:'numeric',month:'long',year:'numeric'})}
        </div>
      </div>
      <button class="btn btn-icon" onclick="zChangeDay(1)">›</button>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="stat-cell"><div class="stat-num">${zFormatHours(dayMs)}</div><div class="stat-lbl">Getrackt</div></div>
      <div class="stat-cell"><div class="stat-num">${entries.length}</div><div class="stat-lbl">Blöcke</div></div>
      <div class="stat-cell"><div class="stat-num">${avgMood || '—'}</div><div class="stat-lbl">Ø Stimmung</div></div>
    </div>

    <!-- Aktivitäts-Legende -->
    ${zRenderDayLegend(entries)}

    <!-- Zeitlinie -->
    <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
      <div style="position:relative;padding-left:48px;height:${totalPx}px;margin-bottom:20px">
        ${timelineHtml}
      </div>
    </div>
  `;

  // Scroll zu aktueller Zeit oder frühem Morgen
  setTimeout(() => {
    const scr = el.querySelector('div[style*="overflow-y:auto"]');
    if (scr) {
      if (isToday) {
        const nowMin = (now.getTime() - dayStart.getTime()) / 60000;
        scr.scrollTop = Math.max(0, (nowMin/60)*HOUR_PX - 150);
      } else if (entries.length) {
        const firstMin = (sorted[0].startTs - dayStart.getTime()) / 60000;
        scr.scrollTop = Math.max(0, (firstMin/60)*HOUR_PX - 60);
      } else {
        scr.scrollTop = 8 * HOUR_PX; // 8 Uhr
      }
    }
  }, 50);
}

function zRenderDayLegend(entries) {
  const used = {};
  entries.forEach(e => { used[e.activity] = true; });
  if (!Object.keys(used).length) return '';
  return `
    <div style="display:flex;flex-wrap:wrap;gap:6px 12px;margin-bottom:10px">
      ${Object.keys(used).map(a => `
        <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)">
          <div style="width:7px;height:7px;border-radius:50%;background:${zGetColor(a)}"></div>${a}
        </div>`).join('')}
    </div>`;
}

// ===== EXPORT =====
function zExportCSV() {
  const entries = zGetEntries();
  if (!entries.length) { showToast('Keine Daten'); return; }
  const header = ['Datum','Start','Ende','Dauer (min)','Aktivität','Mit wem','Stimmung','Notiz'];
  const rows = entries.map(e => {
    const start = new Date(e.startTs);
    const end = new Date(e.endTs);
    return [
      start.toLocaleDateString('de'),
      start.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'}),
      end.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'}),
      Math.round(e.durationMs/60000),
      e.activity,
      e.withWho||'',
      e.mood,
      e.note||''
    ].map(v => `"${v}"`).join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zeittracker_${new Date().toLocaleDateString('de',{month:'long',year:'numeric'})}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportiert ✓');
}
