/* ============================================
   gtd.js — GTD System
   Ordner: Inbox, Next Actions, Projekte,
           Someday/Maybe, Waiting For, Kalender
   + ABCD Prioritäten
   + Tagesplanung
   ============================================ */

// ===== KONSTANTEN =====
const GTD_FOLDERS = [
  { id: 'inbox',      label: 'Inbox',          icon: '📥', desc: 'Alles erstmal rein' },
  { id: 'next',       label: 'Next Actions',   icon: '⚡', desc: 'Konkrete nächste Schritte' },
  { id: 'projects',   label: 'Projekte',       icon: '📁', desc: 'Mehrstufige Aufgaben' },
  { id: 'someday',    label: 'Someday/Maybe',  icon: '💭', desc: 'Irgendwann vielleicht' },
  { id: 'waiting',    label: 'Waiting For',    icon: '⏳', desc: 'Warte auf jemanden' },
  { id: 'calendar',   label: 'Kalender',       icon: '📅', desc: 'Termingebunden' },
];

const GTD_PRIORITY = {
  A: { label: 'A — Muss heute',     color: '#c04040' },
  B: { label: 'B — Sollte heute',   color: '#ae9a5a' },
  C: { label: 'C — Delegieren',     color: '#5a8aae' },
  D: { label: 'D — Irgendwann',     color: '#505050' },
};

// Aktuell geöffneter Ordner / View
let gCurrentFolder = 'inbox';
let gCurrentView = 'folders'; // 'folders' | 'list' | 'item-form' | 'project-detail' | 'today'
let gEditingItem = null;       // Item das gerade bearbeitet wird
let gEditingProject = null;    // Projekt das gerade offen ist

// ===== INIT =====
function initGTD() {
  const content = document.getElementById('screen-gtd').querySelector('.screen-content');
  if (!content) return;

  content.innerHTML = `
    <!-- HAUPT-VIEWS -->
    <div id="gFolders"></div>
    <div id="gList" style="display:none"></div>
    <div id="gItemForm" style="display:none"></div>
    <div id="gProjectDetail" style="display:none"></div>
    <div id="gToday" style="display:none"></div>

    <!-- OVERLAYS -->

    <!-- Neues Item -->
    <div class="overlay-bg" id="gNewItemOverlay">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title" id="gNewItemTitle">Neuer Eintrag</div>

        <input type="text" class="input" id="gItemText" placeholder="Was muss getan werden?" style="margin-bottom:10px">

        <div id="gProjectSelect" style="display:none;margin-bottom:10px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Projekt</div>
          <select class="input" id="gItemProject" style="appearance:none">
            <option value="">Kein Projekt</option>
          </select>
        </div>

        <div id="gPrioritySelect" style="display:none;margin-bottom:10px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Priorität (ABCD)</div>
          <div style="display:flex;gap:6px">
            ${Object.entries(GTD_PRIORITY).map(([k,v])=>
              `<button class="chip" id="gPrio${k}" onclick="gSetPriority('${k}')" style="flex:1;justify-content:center">${k}</button>`
            ).join('')}
          </div>
        </div>

        <div id="gDateSelect" style="display:none;margin-bottom:10px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Datum</div>
          <input type="date" class="input" id="gItemDate">
        </div>

        <div id="gWaitingSelect" style="display:none;margin-bottom:10px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Warte auf</div>
          <input type="text" class="input" id="gItemWaiting" placeholder="Person oder Firma">
        </div>

        <div style="margin-bottom:14px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Notiz (optional)</div>
          <textarea class="input" id="gItemNote" placeholder="Weitere Details…" rows="2" style="resize:none"></textarea>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="closeOverlay('gNewItemOverlay')" style="flex:0 0 auto;padding:14px 16px">Abbrechen</button>
          <button class="btn btn-primary" onclick="gSaveItem()">Speichern ✓</button>
        </div>
      </div>
    </div>

    <!-- Neues Projekt -->
    <div class="overlay-bg" id="gNewProjectOverlay">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">Neues Projekt</div>
        <input type="text" class="input" id="gProjectName" placeholder="Projektname" style="margin-bottom:10px">
        <textarea class="input" id="gProjectNote" placeholder="Ziel des Projekts (optional)" rows="2" style="resize:none;margin-bottom:14px"></textarea>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="closeOverlay('gNewProjectOverlay')" style="flex:0 0 auto;padding:14px 16px">Abbrechen</button>
          <button class="btn btn-primary" onclick="gSaveProject()">Erstellen ✓</button>
        </div>
      </div>
    </div>

    <!-- Item Action Sheet -->
    <div class="overlay-bg" id="gItemSheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;margin-bottom:4px" id="gSheetItemTitle"></div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:16px" id="gSheetItemMeta"></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" onclick="gMoveItem()" style="flex:1">↪ Verschieben</button>
            <button class="btn btn-ghost" onclick="gEditItem()" style="flex:1">✏️ Bearbeiten</button>
          </div>
          <button class="btn btn-danger" onclick="gDeleteItem()">🗑 Löschen</button>
          <button class="btn btn-ghost" onclick="closeOverlay('gItemSheet')" style="color:var(--muted)">Abbrechen</button>
        </div>
      </div>
    </div>

    <!-- Move Folder Sheet -->
    <div class="overlay-bg" id="gMoveSheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">In Ordner verschieben</div>
        <div style="display:flex;flex-direction:column;gap:8px" id="gMoveFolderList"></div>
      </div>
    </div>
  `;

  gRenderFolders();
}

// ===== ORDNER ÜBERSICHT =====
function gRenderFolders() {
  gCurrentView = 'folders';
  const el = document.getElementById('gFolders');
  if (!el) return;

  // Views ausblenden
  ['gList','gItemForm','gProjectDetail','gToday'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });
  el.style.display = 'block';

  const items = DB.gtd.getItems();
  const projects = DB.gtd.getProjects();

  // Tagesplanung Card
  const todayItems = items.filter(i => i.today && !i.done);
  const todayDone = items.filter(i => i.today && i.done).length;

  el.innerHTML = `
    <!-- Tagesplanung -->
    <div class="card" onclick="gShowToday()" style="cursor:pointer;margin-bottom:12px;border-color:${todayItems.length>0?'var(--accent)':'var(--border)'}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700">📋 Tagesplan</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">
            ${todayItems.length > 0
              ? `${todayItems.length} offen · ${todayDone} erledigt`
              : 'Noch nicht geplant'}
          </div>
        </div>
        <div style="font-size:20px;color:var(--accent)">→</div>
      </div>
    </div>

    <!-- Ordner -->
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${GTD_FOLDERS.map(f => {
        const count = f.id === 'projects'
          ? projects.filter(p => !p.done).length
          : items.filter(i => i.folder === f.id && !i.done).length;
        return `
          <div class="card" onclick="gOpenFolder('${f.id}')" style="cursor:pointer;display:flex;align-items:center;gap:14px;padding:14px 16px">
            <div style="font-size:22px;width:36px;text-align:center">${f.icon}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500">${f.label}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${f.desc}</div>
            </div>
            ${count > 0 ? `<div style="background:var(--accent);color:#0f0f0f;font-family:'Syne',sans-serif;font-size:12px;font-weight:800;min-width:24px;height:24px;border-radius:12px;display:flex;align-items:center;justify-content:center;padding:0 6px">${count}</div>` : ''}
            <div style="color:var(--muted);font-size:16px">›</div>
          </div>`;
      }).join('')}
    </div>

    <!-- Erledigte heute -->
    <div style="font-size:11px;color:var(--muted);text-align:center">
      ${items.filter(i=>i.done&&isToday(i.doneAt)).length} Aufgaben heute erledigt
    </div>
  `;
}

// ===== ORDNER ÖFFNEN =====
function gOpenFolder(folderId) {
  gCurrentFolder = folderId;
  gCurrentView = 'list';

  ['gFolders','gItemForm','gProjectDetail','gToday'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });
  document.getElementById('gList').style.display = 'block';

  if (folderId === 'projects') { gRenderProjectList(); return; }
  gRenderItemList();
}

// ===== ITEM LISTE =====
function gRenderItemList() {
  const el = document.getElementById('gList');
  if (!el) return;

  const folder = GTD_FOLDERS.find(f => f.id === gCurrentFolder);
  const items = DB.gtd.getItems().filter(i => i.folder === gCurrentFolder && !i.done);
  const doneItems = DB.gtd.getItems().filter(i => i.folder === gCurrentFolder && i.done);

  const showPriority = gCurrentFolder === 'next';
  const showDate = gCurrentFolder === 'calendar';
  const showWaiting = gCurrentFolder === 'waiting';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gRenderFolders()">←</button>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px">${folder?.icon} ${folder?.label}</div>
        <div style="font-size:11px;color:var(--muted)">${items.length} offen</div>
      </div>
      <button class="btn btn-icon" onclick="gOpenNewItem('${gCurrentFolder}')" style="background:var(--accent);color:#0f0f0f;border-color:var(--accent)">+</button>
    </div>

    ${items.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">${folder?.icon}</div>
        <div class="empty-title">Leer</div>
        <div class="empty-sub">Drücke + um etwas hinzuzufügen</div>
      </div>` : ''
    }

    <div style="display:flex;flex-direction:column;gap:6px">
      ${items.map(item => gRenderItem(item, showPriority, showDate, showWaiting)).join('')}
    </div>

    ${doneItems.length > 0 ? `
      <div style="margin-top:20px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Erledigt</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${doneItems.slice(0,5).map(item=>`
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;opacity:0.5">
              <div style="font-size:14px">✓</div>
              <div style="font-size:13px;text-decoration:line-through;color:var(--muted)">${item.text}</div>
            </div>`).join('')}
        </div>
      </div>` : ''
    }
  `;
}

function gRenderItem(item, showPriority, showDate, showWaiting) {
  const prio = item.priority ? GTD_PRIORITY[item.priority] : null;
  const projects = DB.gtd.getProjects();
  const proj = item.projectId ? projects.find(p=>p.id===item.projectId) : null;

  return `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;cursor:pointer" onclick="gOpenItemSheet('${item.id}')">
      <button onclick="event.stopPropagation();gToggleDone('${item.id}')"
        style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);background:none;cursor:pointer;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:12px">
        ${item.done ? '✓' : ''}
      </button>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;line-height:1.4">${item.text}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px">
          ${prio ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:${prio.color}20;color:${prio.color};border:1px solid ${prio.color}40">${item.priority}</span>` : ''}
          ${proj ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--surface2);color:var(--muted);border:1px solid var(--border)">📁 ${proj.name}</span>` : ''}
          ${item.dueDate ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--surface2);color:var(--muted);border:1px solid var(--border)">📅 ${new Date(item.dueDate).toLocaleDateString('de',{day:'numeric',month:'short'})}</span>` : ''}
          ${item.waitingFor ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--surface2);color:var(--muted);border:1px solid var(--border)">⏳ ${item.waitingFor}</span>` : ''}
          ${item.today ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(168,192,96,0.15);color:var(--accent);border:1px solid rgba(168,192,96,0.3)">Heute</span>` : ''}
        </div>
        ${item.note ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.note}</div>` : ''}
      </div>
    </div>`;
}

// ===== PROJEKT LISTE =====
function gRenderProjectList() {
  const el = document.getElementById('gList');
  if (!el) return;
  const projects = DB.gtd.getProjects().filter(p => !p.done);
  const items = DB.gtd.getItems();

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gRenderFolders()">←</button>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px">📁 Projekte</div>
        <div style="font-size:11px;color:var(--muted)">${projects.length} aktiv</div>
      </div>
      <button class="btn btn-icon" onclick="openOverlay('gNewProjectOverlay')" style="background:var(--accent);color:#0f0f0f;border-color:var(--accent)">+</button>
    </div>

    ${projects.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <div class="empty-title">Keine Projekte</div>
        <div class="empty-sub">Projekte sind Aufgaben die mehr als einen Schritt brauchen</div>
      </div>` : ''
    }

    <div style="display:flex;flex-direction:column;gap:8px">
      ${projects.map(proj => {
        const projItems = items.filter(i => i.projectId === proj.id && !i.done);
        const nextAction = projItems.find(i => i.folder === 'next');
        return `
          <div class="card" onclick="gOpenProject('${proj.id}')" style="cursor:pointer">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
              <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700">${proj.name}</div>
              <div style="font-size:11px;color:var(--muted);white-space:nowrap;margin-left:10px">${projItems.length} Schritte</div>
            </div>
            ${proj.note ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px">${proj.note}</div>` : ''}
            ${nextAction ? `
              <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--surface2);border-radius:8px">
                <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Nächste Aktion:</span>
                <span style="font-size:12px;color:var(--text)">${nextAction.text}</span>
              </div>` : `
              <div style="font-size:11px;color:var(--muted);font-style:italic">Keine Next Action definiert</div>`
            }
          </div>`;
      }).join('')}
    </div>
  `;
}

// ===== PROJEKT DETAIL =====
function gOpenProject(projectId) {
  gEditingProject = projectId;
  gCurrentView = 'project-detail';
  ['gFolders','gList','gItemForm','gToday'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.style.display='none';
  });
  document.getElementById('gProjectDetail').style.display = 'block';
  gRenderProjectDetail();
}

function gRenderProjectDetail() {
  const el = document.getElementById('gProjectDetail');
  if (!el) return;
  const proj = DB.gtd.getProjects().find(p=>p.id===gEditingProject);
  if (!proj) return;
  const items = DB.gtd.getItems().filter(i=>i.projectId===gEditingProject);
  const open = items.filter(i=>!i.done);
  const done = items.filter(i=>i.done);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gOpenFolder('projects')">←</button>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px">${proj.name}</div>
        ${proj.note?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${proj.note}</div>`:''}
      </div>
      <button class="btn btn-icon" onclick="gOpenNewItem('next',true)" style="background:var(--accent);color:#0f0f0f;border-color:var(--accent)">+</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
      ${open.length===0?`<div class="empty-state" style="padding:24px"><div class="empty-sub">Keine Schritte — drücke + um Next Actions hinzuzufügen</div></div>`:''}
      ${open.map(item=>`
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
          <button onclick="gToggleDone('${item.id}');gRenderProjectDetail()"
            style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);background:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:12px">
          </button>
          <div style="flex:1;font-size:13px">${item.text}</div>
          <div style="font-size:10px;color:var(--muted);padding:2px 7px;border-radius:10px;background:var(--surface2)">${item.folder==='next'?'⚡ Next':'📥 Inbox'}</div>
        </div>`).join('')}
    </div>

    ${done.length>0?`
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Erledigt (${done.length})</div>
      ${done.map(item=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;opacity:0.4;margin-bottom:4px">
          <div style="color:var(--accent)">✓</div>
          <div style="font-size:12px;text-decoration:line-through;color:var(--muted)">${item.text}</div>
        </div>`).join('')}
    `:''}

    <div style="margin-top:16px">
      <button class="btn btn-danger" onclick="gDeleteProject('${proj.id}')">🗑 Projekt löschen</button>
    </div>
  `;
}

// ===== TAGESPLAN =====
function gShowToday() {
  gCurrentView = 'today';
  ['gFolders','gList','gItemForm','gProjectDetail'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.style.display='none';
  });
  document.getElementById('gToday').style.display = 'block';
  gRenderToday();
}

function gRenderToday() {
  const el = document.getElementById('gToday');
  if (!el) return;

  const allItems = DB.gtd.getItems();
  const todayItems = allItems.filter(i => i.today && !i.done);
  const todayDone = allItems.filter(i => i.today && i.done && isToday(i.doneAt));

  // Gruppiert nach Priorität
  const byPriority = { A:[], B:[], C:[], D:[], none:[] };
  todayItems.forEach(i => byPriority[i.priority||'none'].push(i));

  // Items aus Next Actions die noch nicht im Tagesplan sind
  const nextItems = allItems.filter(i => i.folder==='next' && !i.done && !i.today);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-icon" onclick="gRenderFolders()">←</button>
      <div style="flex:1">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px">📋 Heute</div>
        <div style="font-size:11px;color:var(--muted)">${new Date().toLocaleDateString('de',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>
    </div>

    ${todayItems.length===0&&todayDone.length===0?`
      <div class="card" style="text-align:center;padding:24px 16px;margin-bottom:12px">
        <div style="font-size:32px;margin-bottom:8px">📋</div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:4px">Tag noch nicht geplant</div>
        <div style="font-size:12px;color:var(--muted)">Füge Aufgaben aus deinen Next Actions hinzu</div>
      </div>` : ''
    }

    ${['A','B','C','D','none'].map(prio => {
      const items = byPriority[prio];
      if (!items.length) return '';
      const prioInfo = GTD_PRIORITY[prio];
      return `
        <div style="margin-bottom:14px">
          ${prio!=='none'?`<div style="font-size:10px;font-weight:500;color:${prioInfo.color};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">${prioInfo.label}</div>`:''}
          <div style="display:flex;flex-direction:column;gap:6px">
            ${items.map(item=>`
              <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--surface);border:1px solid ${prio!=='none'?prioInfo.color+'40':'var(--border)'};border-radius:12px">
                <button onclick="gToggleDone('${item.id}');gRenderToday()"
                  style="width:22px;height:22px;border-radius:50%;border:2px solid ${prio!=='none'?prioInfo.color:'var(--border)'};background:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:12px">
                </button>
                <div style="flex:1;font-size:13px">${item.text}</div>
                <button onclick="gRemoveFromToday('${item.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:4px">✕</button>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('')}

    ${todayDone.length>0?`
      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Erledigt ✓</div>
        ${todayDone.map(item=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;opacity:0.5;margin-bottom:4px">
            <div style="color:var(--accent);font-size:14px">✓</div>
            <div style="font-size:12px;text-decoration:line-through;color:var(--muted)">${item.text}</div>
          </div>`).join('')}
      </div>` : ''
    }

    ${nextItems.length>0?`
      <div style="margin-top:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Aus Next Actions hinzufügen</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${nextItems.slice(0,8).map(item=>`
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;cursor:pointer" onclick="gAddToToday('${item.id}')">
              <div style="font-size:13px;flex:1">${item.text}</div>
              <div style="color:var(--accent);font-size:16px">+</div>
            </div>`).join('')}
        </div>
      </div>` : ''
    }
  `;
}

// ===== NEUES ITEM =====
let gNewItemFolder = 'inbox';
let gNewItemForProject = false;
let gSelectedPriority = null;

function gOpenNewItem(folder, forProject=false) {
  gNewItemFolder = folder;
  gNewItemForProject = forProject;
  gSelectedPriority = null;

  // Titel
  const f = GTD_FOLDERS.find(f=>f.id===folder);
  const titleEl = document.getElementById('gNewItemTitle');
  if (titleEl) titleEl.textContent = forProject ? `Schritt für ${DB.gtd.getProjects().find(p=>p.id===gEditingProject)?.name||'Projekt'}` : `Neu in ${f?.label||folder}`;

  // Felder zeigen/verstecken
  document.getElementById('gProjectSelect').style.display = (folder==='next'&&!forProject) ? 'block' : 'none';
  document.getElementById('gPrioritySelect').style.display = (folder==='next') ? 'block' : 'none';
  document.getElementById('gDateSelect').style.display = (folder==='calendar') ? 'block' : 'none';
  document.getElementById('gWaitingSelect').style.display = (folder==='waiting') ? 'block' : 'none';

  // Projekte für Dropdown laden
  if (folder==='next'&&!forProject) {
    const sel = document.getElementById('gItemProject');
    const projects = DB.gtd.getProjects().filter(p=>!p.done);
    sel.innerHTML = '<option value="">Kein Projekt</option>' +
      projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  }

  // Felder leeren
  ['gItemText','gItemNote','gItemWaiting'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('gItemDate').value = '';
  ['A','B','C','D'].forEach(k=>{
    const b=document.getElementById('gPrio'+k); if(b) b.classList.remove('sel');
  });

  openOverlay('gNewItemOverlay');
  setTimeout(()=>document.getElementById('gItemText')?.focus(),100);
}

function gSetPriority(prio) {
  gSelectedPriority = prio;
  ['A','B','C','D'].forEach(k=>{
    const b=document.getElementById('gPrio'+k);
    if(b) b.classList.toggle('sel', k===prio);
  });
}

function gSaveItem() {
  const text = document.getElementById('gItemText')?.value.trim();
  if (!text) { showToast('Bitte Text eingeben'); return; }

  const item = {
    text,
    folder: gNewItemFolder,
    note: document.getElementById('gItemNote')?.value.trim() || '',
    priority: gSelectedPriority || null,
    projectId: gNewItemForProject ? gEditingProject : (document.getElementById('gItemProject')?.value || null),
    dueDate: document.getElementById('gItemDate')?.value || null,
    waitingFor: document.getElementById('gItemWaiting')?.value.trim() || null,
    done: false,
    today: false,
    doneAt: null,
  };

  DB.gtd.addItem(item);
  closeOverlay('gNewItemOverlay');

  if (gCurrentView==='project-detail') gRenderProjectDetail();
  else if (gCurrentView==='list') gRenderItemList();
  else if (gCurrentView==='today') gRenderToday();
  else gRenderFolders();

  showToast('Gespeichert ✓');
}

// ===== ITEM ACTIONS =====
let gSheetItemId = null;

function gOpenItemSheet(itemId) {
  gSheetItemId = itemId;
  const item = DB.gtd.getItems().find(i=>i.id===itemId);
  if (!item) return;
  document.getElementById('gSheetItemTitle').textContent = item.text;
  document.getElementById('gSheetItemMeta').textContent = GTD_FOLDERS.find(f=>f.id===item.folder)?.label || item.folder;
  openOverlay('gItemSheet');
}

function gToggleDone(itemId) {
  const item = DB.gtd.getItems().find(i=>i.id===itemId);
  if (!item) return;
  DB.gtd.updateItem(itemId, { done: !item.done, doneAt: !item.done ? Date.now() : null });
  if (gCurrentView==='list') gRenderItemList();
  else if (gCurrentView==='folders') gRenderFolders();
  showToast(item.done ? 'Wieder geöffnet' : 'Erledigt ✓');
}

function gEditItem() {
  closeOverlay('gItemSheet');
  const item = DB.gtd.getItems().find(i=>i.id===gSheetItemId);
  if (!item) return;
  gOpenNewItem(item.folder);
  setTimeout(()=>{
    document.getElementById('gItemText').value = item.text;
    document.getElementById('gItemNote').value = item.note||'';
    if (item.priority) gSetPriority(item.priority);
  },100);
}

function gDeleteItem() {
  if (!gSheetItemId) return;
  DB.gtd.deleteItem(gSheetItemId);
  closeOverlay('gItemSheet');
  if (gCurrentView==='list') gRenderItemList();
  else if (gCurrentView==='folders') gRenderFolders();
  else if (gCurrentView==='today') gRenderToday();
  showToast('Gelöscht');
}

function gMoveItem() {
  closeOverlay('gItemSheet');
  const el = document.getElementById('gMoveFolderList');
  if (el) {
    el.innerHTML = GTD_FOLDERS.map(f=>
      `<button class="btn btn-ghost" onclick="gDoMove('${f.id}')" style="text-align:left">${f.icon} ${f.label}</button>`
    ).join('');
  }
  openOverlay('gMoveSheet');
}

function gDoMove(folderId) {
  DB.gtd.updateItem(gSheetItemId, { folder: folderId });
  closeOverlay('gMoveSheet');
  if (gCurrentView==='list') gRenderItemList();
  else gRenderFolders();
  showToast('Verschoben ✓');
}

function gAddToToday(itemId) {
  DB.gtd.updateItem(itemId, { today: true });
  gRenderToday();
  showToast('Zum Tagesplan hinzugefügt ✓');
}

function gRemoveFromToday(itemId) {
  DB.gtd.updateItem(itemId, { today: false });
  gRenderToday();
}

// ===== PROJEKT ACTIONS =====
function gSaveProject() {
  const name = document.getElementById('gProjectName')?.value.trim();
  if (!name) { showToast('Bitte Namen eingeben'); return; }
  DB.gtd.addProject({
    name,
    note: document.getElementById('gProjectNote')?.value.trim()||'',
    done: false
  });
  closeOverlay('gNewProjectOverlay');
  document.getElementById('gProjectName').value='';
  document.getElementById('gProjectNote').value='';
  gRenderProjectList();
  showToast('Projekt erstellt ✓');
}

function gDeleteProject(projectId) {
  if (!confirm('Projekt und alle Aufgaben löschen?')) return;
  DB.gtd.saveProjects(DB.gtd.getProjects().filter(p=>p.id!==projectId));
  DB.gtd.saveItems(DB.gtd.getItems().filter(i=>i.projectId!==projectId));
  gOpenFolder('projects');
  showToast('Projekt gelöscht');
}

// ===== HILFSFUNKTIONEN =====
function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts), now = new Date();
  return d.toDateString() === now.toDateString();
}
