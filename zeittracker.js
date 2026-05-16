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
function zGetColor(n) { return ZEIT_COLORS[n] || '#707070'; }

let zActiveEntry = null;
let zTimerInterval = null;
let zViewDate = new Date();
let zCurrentView = 'home';
let zSelectedActivity = null;
let zSelectedMood = null;
let zSheetEntryId = null;

// ===== INIT =====
function initZeittracker() {
  const content = document.getElementById('screen-zeit')?.querySelector('.screen-content');
  if (!content) return;

  const saved = localStorage.getItem('los_zeit_active');
  if (saved) zActiveEntry = JSON.parse(saved);

  content.innerHTML = `
    <div id="zHome"></div>
    <div id="zDay" style="display:none"></div>

    <!-- ===== STOP SHEET ===== -->
    <div id="zStopOverlay" style="
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,0.8);
      z-index:9999;
      align-items:flex-end;
    ">
      <div id="zStopSheet" style="
        width:100%;
        background:#181818;
        border-radius:20px 20px 0 0;
        border-top:1px solid #282828;
        max-height:90dvh;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
        touch-action:pan-y;
        padding:20px 16px 50px;
        box-sizing:border-box;
      ">
        <div style="width:36px;height:4px;background:#282828;border-radius:2px;margin:0 auto 18px"></div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:16px">Was hast du gemacht?</div>

        <!-- Aktivität -->
        <div style="font-size:10px;color:#505050;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Aktivität</div>
        <div id="zActGrid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
          ${Object.keys(ZEIT_COLORS).map(name => `
            <button onclick="zSelectAct('${name}')" id="zA_${name.replace(/\//g,'_')}"
              style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:20px;border:1px solid #282828;background:#202020;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;white-space:nowrap">
              <span style="width:7px;height:7px;border-radius:50%;background:${zGetColor(name)};display:inline-block;flex-shrink:0"></span>${name}
            </button>`).join('')}
          <button onclick="zOpenCustom()"
            style="padding:8px 12px;border-radius:20px;border:1px dashed #282828;background:#202020;color:#505050;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">
            ✏️ Eigene…
          </button>
        </div>

        <!-- Mit wem -->
        <div style="font-size:10px;color:#505050;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Mit wem?</div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button id="zW_alleine" onclick="zSetWith('alleine')"
            style="flex:1;padding:12px 0;border-radius:10px;border:1px solid #282828;background:#202020;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:13px;cursor:pointer">
            Alleine
          </button>
          <button id="zW_joshua" onclick="zSetWith('joshua')"
            style="flex:1;padding:12px 0;border-radius:10px;border:1px solid #282828;background:#202020;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:13px;cursor:pointer">
            Joshua
          </button>
          <button id="zW_andere" onclick="zSetWith('andere')"
            style="flex:1;padding:12px 0;border-radius:10px;border:1px solid #282828;background:#202020;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:13px;cursor:pointer">
            Andere…
          </button>
        </div>
        <input type="text" id="zWithWho" placeholder="Name eingeben…"
          style="display:none;width:100%;background:#202020;border:1px solid #282828;border-radius:10px;padding:12px;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:14px;outline:none;margin-bottom:16px;box-sizing:border-box">

        <!-- Stimmung -->
        <div style="font-size:10px;color:#505050;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">
          Stimmung &nbsp;<span style="font-style:italic;text-transform:none">7 = Erwartung erfüllt</span>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:16px">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `
            <button id="zM_${n}" onclick="zSelectMood(${n})"
              style="flex:1;padding:10px 0;border-radius:8px;border:1px solid #282828;background:#202020;color:#505050;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer">
              ${n}
            </button>`).join('')}
        </div>

        <!-- Notiz -->
        <div style="font-size:10px;color:#505050;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Notiz (optional)</div>
        <textarea id="zNote" placeholder="Erkenntnisse?"
          style="width:100%;background:#202020;border:1px solid #282828;border-radius:10px;padding:12px;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:13px;resize:none;outline:none;margin-bottom:20px;box-sizing:border-box"
          rows="2"></textarea>

        <!-- Buttons — untereinander, volle Breite -->
        <button id="zSaveBtn" onclick="zSaveEntry()" disabled
          style="width:100%;padding:18px;border-radius:12px;border:none;background:#a8c060;color:#0f0f0f;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;cursor:pointer;margin-bottom:10px;box-sizing:border-box;opacity:0.3">
          Speichern ✓
        </button>
        <button onclick="zCloseStop()"
          style="width:100%;padding:16px;border-radius:12px;border:1px solid #282828;background:transparent;color:#505050;font-family:'DM Mono',monospace;font-size:14px;cursor:pointer;box-sizing:border-box">
          Abbrechen
        </button>
      </div>
    </div>

    <!-- ===== START SHEET ===== -->
    <div id="zStartOverlay" style="
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,0.8);
      z-index:9999;
      align-items:flex-end;
    ">
      <div style="
        width:100%;background:#181818;
        border-radius:20px 20px 0 0;
        border-top:1px solid #282828;
        max-height:80dvh;overflow-y:auto;overflow-x:hidden;
        -webkit-overflow-scrolling:touch;touch-action:pan-y;
        padding:20px 16px 40px;box-sizing:border-box;
      ">
        <div style="width:36px;height:4px;background:#282828;border-radius:2px;margin:0 auto 18px"></div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:16px">Was machst du jetzt?</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
          ${Object.keys(ZEIT_COLORS).map(name => `
            <button onclick="zConfirmStart('${name}')"
              style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:20px;border:1px solid #282828;background:#202020;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;white-space:nowrap">
              <span style="width:7px;height:7px;border-radius:50%;background:${zGetColor(name)};display:inline-block;flex-shrink:0"></span>${name}
            </button>`).join('')}
          <button onclick="zStartCustom()"
            style="padding:8px 12px;border-radius:20px;border:1px dashed #282828;background:#202020;color:#505050;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">
            ✏️ Eigene…
          </button>
        </div>
        <button onclick="zCloseStart()"
          style="width:100%;padding:14px;border-radius:12px;border:1px solid #282828;background:transparent;color:#505050;font-family:'DM Mono',monospace;font-size:14px;cursor:pointer;box-sizing:border-box">
          Abbrechen
        </button>
      </div>
    </div>

    <!-- ===== CUSTOM INPUT ===== -->
    <div id="zCustomOverlay" style="
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,0.8);z-index:9999;align-items:flex-end;
    ">
      <div style="width:100%;background:#181818;border-radius:20px 20px 0 0;border-top:1px solid #282828;padding:20px 16px 40px;box-sizing:border-box">
        <div style="width:36px;height:4px;background:#282828;border-radius:2px;margin:0 auto 16px"></div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:14px">Eigene Aktivität</div>
        <input type="text" id="zCustomInput" placeholder="Was hast du gemacht?" maxlength="60"
          style="width:100%;background:#202020;border:1px solid #282828;border-radius:10px;padding:13px;color:#e8e4dc;font-family:'DM Mono',monospace;font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box">
        <button onclick="zConfirmCustom()"
          style="width:100%;padding:16px;border-radius:12px;border:none;background:#a8c060;color:#0f0f0f;font-family:'Syne',sans-serif;font-size:15px;font-weight:800;cursor:pointer;box-sizing:border-box">
          Übernehmen
        </button>
      </div>
    </div>

    <!-- ===== ENTRY DETAIL ===== -->
    <div id="zEntryOverlay" style="
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,0.8);z-index:9999;align-items:flex-end;
    ">
      <div style="width:100%;background:#181818;border-radius:20px 20px 0 0;border-top:1px solid #282828;padding:20px 16px 40px;box-sizing:border-box">
        <div style="width:36px;height:4px;background:#282828;border-radius:2px;margin:0 auto 16px"></div>
        <div style="font-size:11px;color:#505050;margin-bottom:4px" id="zEntryTime"></div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px" id="zEntryTitle"></div>
        <button onclick="zDeleteEntry()"
          style="width:100%;padding:15px;border-radius:12px;border:1px solid rgba(192,64,64,0.3);background:rgba(192,64,64,0.08);color:#c04040;font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;margin-bottom:8px;box-sizing:border-box">
          🗑 Löschen
        </button>
        <button onclick="zCloseEntry()"
          style="width:100%;padding:14px;border-radius:12px;border:1px solid #282828;background:transparent;color:#505050;font-family:'DM Mono',monospace;font-size:14px;cursor:pointer;box-sizing:border-box">
          Schließen
        </button>
      </div>
    </div>
  `;

  zRenderHome();
  if (zActiveEntry) zStartLiveTimer();
}

// ===== OVERLAY HELPERS =====
function zShowOverlay(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; }
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.display = 'none';
}

function zHideOverlay(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; }
  // Only show nav if no other overlay open
  const anyOpen = ['zStopOverlay','zStartOverlay','zCustomOverlay','zEntryOverlay']
    .some(oid => document.getElementById(oid)?.style.display === 'flex');
  if (!anyOpen) {
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = '';
  }
}

function zCloseStop() { zHideOverlay('zStopOverlay'); }
function zCloseStart() { zHideOverlay('zStartOverlay'); }
function zCloseEntry() { zHideOverlay('zEntryOverlay'); }

// ===== SELECT ACTIVITY =====
function zSelectAct(name) {
  zSelectedActivity = name;
  document.querySelectorAll('#zActGrid button').forEach(b => {
    b.style.borderColor = '#282828';
    b.style.background = '#202020';
    b.style.color = '#e8e4dc';
  });
  const btn = document.getElementById('zA_' + name.replace(/\//g,'_'));
  if (btn) {
    btn.style.borderColor = '#a8c060';
    btn.style.background = 'rgba(168,192,96,0.12)';
    btn.style.color = '#a8c060';
  }
  zCheckReady();
}

// ===== SELECT MOOD =====
function zSelectMood(n) {
  zSelectedMood = n;
  for (let i=1; i<=10; i++) {
    const btn = document.getElementById('zM_'+i);
    if (!btn) continue;
    if (i === n) {
      btn.style.background = zMoodColor(n);
      btn.style.color = '#0f0f0f';
      btn.style.borderColor = zMoodColor(n);
    } else {
      btn.style.background = '#202020';
      btn.style.color = '#505050';
      btn.style.borderColor = '#282828';
    }
  }
  zCheckReady();
}

function zMoodColor(n) {
  if (n <= 3) return '#c04040';
  if (n <= 5) return '#ae7a5a';
  if (n <= 7) return '#ae9a5a';
  return '#7a9e5a';
}

// ===== SET WITH WHO =====
function zSetWith(val) {
  ['alleine','joshua','andere'].forEach(k => {
    const btn = document.getElementById('zW_'+k);
    if (!btn) return;
    if (k === val) {
      btn.style.borderColor = '#a8c060';
      btn.style.color = '#a8c060';
      btn.style.background = 'rgba(168,192,96,0.12)';
    } else {
      btn.style.borderColor = '#282828';
      btn.style.color = '#e8e4dc';
      btn.style.background = '#202020';
    }
  });
  const input = document.getElementById('zWithWho');
  if (val === 'andere') {
    if (input) { input.style.display = 'block'; input.value = ''; setTimeout(() => input.focus(), 100); }
  } else {
    if (input) { input.style.display = 'none'; input.value = val === 'alleine' ? 'Alleine' : 'Joshua'; }
  }
}

// ===== CHECK SAVE READY =====
function zCheckReady() {
  const btn = document.getElementById('zSaveBtn');
  if (!btn) return;
  const ready = zSelectedActivity && zSelectedMood;
  btn.disabled = !ready;
  btn.style.opacity = ready ? '1' : '0.3';
  btn.style.cursor = ready ? 'pointer' : 'default';
}

// ===== CUSTOM ACTIVITY =====
let zCustomMode = 'stop'; // 'stop' or 'start'

function zOpenCustom() {
  zCustomMode = 'stop';
  document.getElementById('zCustomInput').value = '';
  zShowOverlay('zCustomOverlay');
  setTimeout(() => document.getElementById('zCustomInput')?.focus(), 100);
}

function zStartCustom() {
  zCustomMode = 'start';
  zHideOverlay('zStartOverlay');
  document.getElementById('zCustomInput').value = '';
  zShowOverlay('zCustomOverlay');
  setTimeout(() => document.getElementById('zCustomInput')?.focus(), 100);
}

function zConfirmCustom() {
  const val = document.getElementById('zCustomInput')?.value.trim();
  if (!val) return;
  document.getElementById('zCustomInput').value = '';
  zHideOverlay('zCustomOverlay');
  if (zCustomMode === 'start') {
    zConfirmStart(val);
  } else {
    zShowOverlay('zStopOverlay');
    zSelectedActivity = val;
    // Show as selected
    document.querySelectorAll('#zActGrid button').forEach(b => {
      b.style.borderColor = '#282828';
      b.style.background = '#202020';
      b.style.color = '#e8e4dc';
    });
    zCheckReady();
  }
}

// ===== START =====
function zOpenStart() { zShowOverlay('zStartOverlay'); }

function zConfirmStart(activity) {
  zHideOverlay('zStartOverlay');
  zActiveEntry = { activity, startTs: Date.now() };
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
    el.textContent = zFmtElapsed(Date.now() - zActiveEntry.startTs);
  }, 1000);
}

function zFmtElapsed(ms) {
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ===== STOP =====
function zOpenStop() {
  // Reset
  zSelectedActivity = null;
  zSelectedMood = null;

  document.querySelectorAll('#zActGrid button').forEach(b => {
    b.style.borderColor = '#282828';
    b.style.background = '#202020';
    b.style.color = '#e8e4dc';
  });
  for (let i=1; i<=10; i++) {
    const btn = document.getElementById('zM_'+i);
    if (btn) { btn.style.background='#202020'; btn.style.color='#505050'; btn.style.borderColor='#282828'; }
  }
  ['alleine','joshua','andere'].forEach(k => {
    const btn = document.getElementById('zW_'+k);
    if (btn) { btn.style.borderColor='#282828'; btn.style.color='#e8e4dc'; btn.style.background='#202020'; }
  });
  const input = document.getElementById('zWithWho');
  if (input) { input.style.display='none'; input.value=''; }
  const note = document.getElementById('zNote');
  if (note) note.value = '';

  // Pre-select current activity
  if (zActiveEntry?.activity) {
    setTimeout(() => zSelectAct(zActiveEntry.activity), 50);
  }

  zCheckReady();
  zShowOverlay('zStopOverlay');

  // Scroll sheet to top
  setTimeout(() => {
    document.getElementById('zStopSheet')?.scrollTo(0,0);
  }, 50);
}

// ===== SAVE =====
function zSaveEntry() {
  if (!zActiveEntry || !zSelectedActivity || !zSelectedMood) return;

  const withWhoInput = document.getElementById('zWithWho');
  const withWho = withWhoInput?.style.display === 'block'
    ? (withWhoInput.value.trim() || '')
    : (withWhoInput?.value || '');

  const endTs = Date.now();
  const entry = {
    id: Math.random().toString(36).slice(2),
    activity: zSelectedActivity,
    startTs: zActiveEntry.startTs,
    endTs,
    durationMs: endTs - zActiveEntry.startTs,
    withWho,
    mood: zSelectedMood,
    note: document.getElementById('zNote')?.value.trim() || '',
  };

  const entries = zGetEntries();
  entries.unshift(entry);
  localStorage.setItem('los_mario_entries', JSON.stringify(entries));

  zActiveEntry = null;
  localStorage.removeItem('los_zeit_active');
  clearInterval(zTimerInterval);
  zTimerInterval = null;

  zHideOverlay('zStopOverlay');
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
  if (!homeEl) return;
  homeEl.style.display = 'block';
  if (dayEl) dayEl.style.display = 'none';

  const now = new Date();
  const entries = zGetEntries();
  const todayEntries = entries.filter(e => new Date(e.startTs).toDateString() === now.toDateString());
  const todayMs = todayEntries.reduce((s,e) => s+e.durationMs, 0);
  const avgMood = todayEntries.length
    ? Math.round(todayEntries.reduce((s,e)=>s+e.mood,0)/todayEntries.length*10)/10
    : null;

  homeEl.innerHTML = `
    ${zActiveEntry ? `
      <div style="background:#181818;border:1px solid #a8c060;border-radius:18px;padding:24px;text-align:center;margin-bottom:14px">
        <div style="font-size:11px;color:#a8c060;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Läuft gerade</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${zGetColor(zActiveEntry.activity)}"></div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">${zActiveEntry.activity}</div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:52px;font-weight:800;color:#a8c060;letter-spacing:-3px;line-height:1" id="zLiveTimer">
          ${zFmtElapsed(Date.now() - zActiveEntry.startTs)}
        </div>
        <div style="font-size:11px;color:#505050;margin-top:6px">
          gestartet um ${new Date(zActiveEntry.startTs).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
        </div>
        <button onclick="zOpenStop()"
          style="width:100%;margin-top:16px;padding:18px;border-radius:12px;border:none;background:#c04040;color:#fff;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;cursor:pointer">
          ⏹ Stoppen
        </button>
      </div>` : `
      <button onclick="zOpenStart()"
        style="width:100%;padding:20px;border-radius:12px;border:none;background:#a8c060;color:#0f0f0f;font-family:'Syne',sans-serif;font-size:18px;font-weight:800;cursor:pointer;margin-bottom:14px">
        ▶ Aktivität starten
      </button>`
    }

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="stat-cell"><div class="stat-num">${zFmtHours(todayMs)}</div><div class="stat-lbl">Heute</div></div>
      <div class="stat-cell"><div class="stat-num">${todayEntries.length}</div><div class="stat-lbl">Blöcke</div></div>
      <div class="stat-cell"><div class="stat-num">${avgMood || '—'}</div><div class="stat-lbl">Ø Stimmung</div></div>
    </div>

    <div style="background:#181818;border:1px solid #282828;border-radius:14px;padding:14px 16px;cursor:pointer;margin-bottom:14px" onclick="zShowDay()">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;color:#505050;text-transform:uppercase;letter-spacing:0.1em">Heute im Überblick</div>
        <div style="font-size:11px;color:#a8c060">Details →</div>
      </div>
      ${zMiniTimeline(todayEntries)}
    </div>

    <div style="font-size:10px;color:#505050;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Letzte Einträge</div>
    ${todayEntries.length === 0 ? `
      <div style="text-align:center;padding:40px 0;color:#505050">
        <div style="font-size:36px;margin-bottom:10px">⏱</div>
        <div>Noch nichts heute</div>
      </div>` : `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${todayEntries.slice(0,10).map(e => zEntryRow(e)).join('')}
      </div>`
    }

    <div style="margin-top:14px">
      <button onclick="zExportCSV()"
        style="width:100%;padding:13px;border-radius:12px;border:1px solid #282828;background:transparent;color:#505050;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">
        ↓ CSV exportieren
      </button>
    </div>
  `;

  if (zActiveEntry) zStartLiveTimer();
}

function zFmtHours(ms) {
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function zMiniTimeline(entries) {
  if (!entries.length) return `<div style="height:16px;background:#1e1e1e;border-radius:5px"></div>`;
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const dayMs = 86400000;
  const sorted = [...entries].sort((a,b) => a.startTs-b.startTs);
  let segs = '', lastEnd = dayStart.getTime();
  sorted.forEach(e => {
    const gap = e.startTs - lastEnd;
    if (gap > 0) segs += `<div style="flex:${gap};background:#1a1a1a;min-width:1px"></div>`;
    segs += `<div style="flex:${e.durationMs};background:${zGetColor(e.activity)};min-width:2px;border-radius:2px"></div>`;
    lastEnd = e.endTs;
  });
  const rem = now.getTime() - lastEnd;
  if (rem > 0) segs += `<div style="flex:${rem};background:#1a1a1a"></div>`;
  return `<div style="display:flex;height:16px;border-radius:5px;overflow:hidden;gap:1px;background:#0f0f0f">${segs}</div>`;
}

function zEntryRow(e) {
  const start = new Date(e.startTs), end = new Date(e.endTs);
  const fmt = d => d.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'});
  return `
    <div onclick="zOpenEntryDetail('${e.id}')"
      style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#181818;border:1px solid #282828;border-radius:11px;cursor:pointer">
      <div style="width:9px;height:9px;border-radius:50%;background:${zGetColor(e.activity)};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.activity}</div>
        <div style="font-size:10px;color:#505050;margin-top:2px">${fmt(start)} – ${fmt(end)}${e.withWho ? ' · '+e.withWho : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">
        <div style="font-size:11px;color:#505050">${zFmtHours(e.durationMs)}</div>
        <div style="font-size:10px;padding:2px 6px;border-radius:8px;background:${zMoodColor(e.mood)}22;color:${zMoodColor(e.mood)};border:1px solid ${zMoodColor(e.mood)}44">${e.mood}/10</div>
      </div>
    </div>`;
}

// ===== ENTRY DETAIL =====
function zOpenEntryDetail(id) {
  zSheetEntryId = id;
  const entries = zGetEntries();
  const e = entries.find(e => e.id === id);
  if (!e) return;
  const start = new Date(e.startTs), end = new Date(e.endTs);
  const fmt = d => d.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('zEntryTime').textContent = `${fmt(start)} – ${fmt(end)} · ${zFmtHours(e.durationMs)}`;
  document.getElementById('zEntryTitle').innerHTML = `
    <div style="width:9px;height:9px;border-radius:50%;background:${zGetColor(e.activity)};flex-shrink:0"></div>
    ${e.activity}
    ${e.withWho ? `<span style="font-size:13px;color:#505050;font-weight:400">· ${e.withWho}</span>` : ''}
    <span style="margin-left:auto;font-size:13px;padding:3px 8px;border-radius:8px;background:${zMoodColor(e.mood)}22;color:${zMoodColor(e.mood)}">${e.mood}/10</span>
  `;
  zShowOverlay('zEntryOverlay');
}

function zDeleteEntry() {
  if (!zSheetEntryId) return;
  const entries = zGetEntries().filter(e => e.id !== zSheetEntryId);
  localStorage.setItem('los_mario_entries', JSON.stringify(entries));
  zHideOverlay('zEntryOverlay');
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
  const entries = zGetEntries().filter(e => new Date(e.startTs).toDateString() === zViewDate.toDateString());
  const dayStart = new Date(zViewDate); dayStart.setHours(0,0,0,0);
  const HOUR_PX = 60;
  const totalPx = 24 * HOUR_PX;
  const dayMs = entries.reduce((s,e)=>s+e.durationMs,0);
  const avgMood = entries.length ? Math.round(entries.reduce((s,e)=>s+e.mood,0)/entries.length*10)/10 : null;

  let tlHtml = '';
  for (let h=0; h<=24; h++) {
    const top = h*HOUR_PX;
    tlHtml += `<div style="position:absolute;left:40px;right:0;height:1px;background:#282828;top:${top}px;pointer-events:none"></div>`;
    if (h<24) tlHtml += `<div style="position:absolute;left:0;font-size:10px;color:#505050;width:36px;text-align:right;top:${top}px;transform:translateY(-50%);pointer-events:none">${String(h).padStart(2,'0')}:00</div>`;
  }
  [...entries].sort((a,b)=>a.startTs-b.startTs).forEach(e => {
    const startMin = (e.startTs-dayStart.getTime())/60000;
    const durMin = e.durationMs/60000;
    const top = (startMin/60)*HOUR_PX;
    const height = Math.max((durMin/60)*HOUR_PX, 20);
    tlHtml += `
      <div onclick="zOpenEntryDetail('${e.id}')"
        style="position:absolute;left:48px;right:0;top:${top}px;height:${height}px;border-radius:8px;overflow:hidden;cursor:pointer">
        <div style="height:100%;background:${zGetColor(e.activity)};padding:5px 8px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:11px;font-weight:500;color:#f0ede6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.activity}</div>
          ${height>32?`<div style="font-size:9px;color:rgba(240,237,230,0.7);margin-top:1px">${zFmtHours(e.durationMs)}${e.withWho?' · '+e.withWho:''} · ${e.mood}/10</div>`:''}
        </div>
      </div>`;
  });
  if (isToday) {
    const nowMin = (now.getTime()-dayStart.getTime())/60000;
    const top = (nowMin/60)*HOUR_PX;
    tlHtml += `<div style="position:absolute;left:40px;right:0;height:2px;background:#c04040;top:${top}px;z-index:10;pointer-events:none"></div>`;
    tlHtml += `<div style="position:absolute;left:34px;width:10px;height:10px;border-radius:50%;background:#c04040;top:${top}px;transform:translateY(-50%);z-index:10;pointer-events:none"></div>`;
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <button onclick="zRenderHome()"
        style="width:36px;height:36px;border-radius:10px;border:1px solid #282828;background:#181818;color:#e8e4dc;font-size:16px;cursor:pointer;flex-shrink:0">←</button>
      <button onclick="zChangeDay(-1)"
        style="width:36px;height:36px;border-radius:10px;border:1px solid #282828;background:#181818;color:#e8e4dc;font-size:18px;cursor:pointer;flex-shrink:0">‹</button>
      <div style="flex:1;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;letter-spacing:-0.5px">
          ${isToday?'Heute':zViewDate.toLocaleDateString('de',{weekday:'short',day:'numeric',month:'short'})}
        </div>
      </div>
      <button onclick="zChangeDay(1)"
        style="width:36px;height:36px;border-radius:10px;border:1px solid #282828;background:#181818;color:#e8e4dc;font-size:18px;cursor:pointer;flex-shrink:0">›</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="stat-cell"><div class="stat-num">${zFmtHours(dayMs)}</div><div class="stat-lbl">Getrackt</div></div>
      <div class="stat-cell"><div class="stat-num">${entries.length}</div><div class="stat-lbl">Blöcke</div></div>
      <div class="stat-cell"><div class="stat-num">${avgMood||'—'}</div><div class="stat-lbl">Ø Stimmung</div></div>
    </div>
    <div style="overflow-y:auto;-webkit-overflow-scrolling:touch">
      <div style="position:relative;padding-left:48px;height:${totalPx}px;margin-bottom:20px">${tlHtml}</div>
    </div>
  `;

  setTimeout(() => {
    const scr = el.querySelector('div[style*="overflow-y:auto"]');
    if (scr && isToday) {
      const nowMin = (now.getTime()-dayStart.getTime())/60000;
      scr.scrollTop = Math.max(0,(nowMin/60)*HOUR_PX-150);
    }
  }, 50);
}

function zRenderHome() {
  zCurrentView = 'home';
  const homeEl = document.getElementById('zHome');
  const dayEl = document.getElementById('zDay');
  if (!homeEl) return;
  homeEl.style.display = 'block';
  if (dayEl) dayEl.style.display = 'none';

  const now = new Date();
  const entries = zGetEntries();
  const todayEntries = entries.filter(e => new Date(e.startTs).toDateString() === now.toDateString());
  const todayMs = todayEntries.reduce((s,e)=>s+e.durationMs,0);
  const avgMood = todayEntries.length ? Math.round(todayEntries.reduce((s,e)=>s+e.mood,0)/todayEntries.length*10)/10 : null;

  homeEl.innerHTML = `
    ${zActiveEntry ? `
      <div style="background:#181818;border:1px solid #a8c060;border-radius:18px;padding:24px;text-align:center;margin-bottom:14px">
        <div style="font-size:11px;color:#a8c060;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Läuft gerade</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">
          <div style="width:10px;height:10px;border-radius:50%;background:${zGetColor(zActiveEntry.activity)}"></div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">${zActiveEntry.activity}</div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:52px;font-weight:800;color:#a8c060;letter-spacing:-3px;line-height:1" id="zLiveTimer">
          ${zFmtElapsed(Date.now()-zActiveEntry.startTs)}
        </div>
        <div style="font-size:11px;color:#505050;margin-top:6px">
          gestartet um ${new Date(zActiveEntry.startTs).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
        </div>
        <button onclick="zOpenStop()"
          style="width:100%;margin-top:16px;padding:18px;border-radius:12px;border:none;background:#c04040;color:#fff;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;cursor:pointer">
          ⏹ Stoppen
        </button>
      </div>` : `
      <button onclick="zOpenStart()"
        style="width:100%;padding:20px;border-radius:12px;border:none;background:#a8c060;color:#0f0f0f;font-family:'Syne',sans-serif;font-size:18px;font-weight:800;cursor:pointer;margin-bottom:14px">
        ▶ Aktivität starten
      </button>`
    }
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="stat-cell"><div class="stat-num">${zFmtHours(todayMs)}</div><div class="stat-lbl">Heute</div></div>
      <div class="stat-cell"><div class="stat-num">${todayEntries.length}</div><div class="stat-lbl">Blöcke</div></div>
      <div class="stat-cell"><div class="stat-num">${avgMood||'—'}</div><div class="stat-lbl">Ø Stimmung</div></div>
    </div>
    <div style="background:#181818;border:1px solid #282828;border-radius:14px;padding:14px 16px;cursor:pointer;margin-bottom:14px" onclick="zShowDay()">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;color:#505050;text-transform:uppercase;letter-spacing:0.1em">Heute im Überblick</div>
        <div style="font-size:11px;color:#a8c060">Details →</div>
      </div>
      ${zMiniTimeline(todayEntries)}
    </div>
    <div style="font-size:10px;color:#505050;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Letzte Einträge</div>
    ${todayEntries.length===0 ? `
      <div style="text-align:center;padding:40px 0;color:#505050">
        <div style="font-size:36px;margin-bottom:10px">⏱</div>
        <div>Noch nichts heute</div>
      </div>` : `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${todayEntries.slice(0,10).map(e=>zEntryRow(e)).join('')}
      </div>`
    }
    <div style="margin-top:14px">
      <button onclick="zExportCSV()"
        style="width:100%;padding:13px;border-radius:12px;border:1px solid #282828;background:transparent;color:#505050;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">
        ↓ CSV exportieren
      </button>
    </div>
  `;
  if (zActiveEntry) zStartLiveTimer();
}

// ===== EXPORT =====
function zExportCSV() {
  const entries = zGetEntries();
  if (!entries.length) { showToast('Keine Daten'); return; }
  const header = ['Datum','Start','Ende','Dauer (min)','Aktivität','Mit wem','Stimmung','Notiz'];
  const rows = entries.map(e => {
    const s = new Date(e.startTs), end = new Date(e.endTs);
    const fmt = d => d.toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'});
    return [s.toLocaleDateString('de'),fmt(s),fmt(end),Math.round(e.durationMs/60000),e.activity,e.withWho||'',e.mood,e.note||'']
      .map(v=>`"${v}"`).join(',');
  });
  const csv = [header.join(','),...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`zeittracker_${new Date().toLocaleDateString('de',{month:'long',year:'numeric'})}.csv`;
  a.click(); URL.revokeObjectURL(url); showToast('CSV exportiert ✓');
}
