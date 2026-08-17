const sampleGoals = [
  { slug: 'morning-pages', title: 'Morning pages', fineprint: 'Write 3 pages\n#morning #writing', safebuf: 0, doneToday: false, updated: 6 },
  { slug: 'inbox-zero', title: 'Inbox zero', fineprint: 'Reply to work messages\n#admin #quick', safebuf: 1, doneToday: false, updated: 42 },
  { slug: 'german', title: 'Practice German', fineprint: '20 sentences from a book\n#learning #deep', safebuf: 1, doneToday: true, updated: 20 },
  { slug: 'strength', title: 'Strength training', fineprint: 'Complete today’s workout\n#health #gym', safebuf: 2, doneToday: false, updated: 180 },
  { slug: 'connection', title: 'Reach out', fineprint: 'Make one request to connect\n#social #quick', safebuf: 4, doneToday: false, updated: 320 },
  { slug: 'read', title: 'Read a book', fineprint: 'Read 20 focused pages\n#learning #deep', safebuf: 6, doneToday: false, updated: 90 }
];
const APP_VERSION = '1.0.9';
const IS_LOCAL_TEST = ['localhost', '127.0.0.1'].includes(location.hostname);
const TEST_PARAMS = new URLSearchParams(location.search);
const $ = selector => document.querySelector(selector);
const state = {
  goals: [], query: '', hideDone: true, sort: 'urgency', activeView: 'all', editingSlug: null, usingSample: false,
  mode: IS_LOCAL_TEST && TEST_PARAMS.get('mode') === 'timeline' ? 'timeline' : localStorage.getItem('bee-mode') || 'list', timeZone: localStorage.getItem('bee-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
  views: JSON.parse(localStorage.getItem('bee-views') || '[]')
};
const els = {
  list: $('#goal-list'), empty: $('#empty-state'), search: $('#search-input'), clear: $('#clear-search'),
  doneFilter: $('#done-filter'), sort: $('#sort-select'), chips: $('#view-chips'), saveDialog: $('#save-dialog'),
  settingsDialog: $('#settings-dialog'), editDialog: $('#edit-dialog'), toast: $('#toast')
};

function cleanText(text = '') { return String(text).replace(/\s(?:\d{10})$/, '').trim(); }
function normalizeGoal(goal) {
  // Migrate goals cached by older releases, where fine print was stored as `description`.
  return { ...goal, title: cleanText(goal.title || goal.slug), fineprint: cleanText(goal.fineprint ?? goal.description ?? ''), datapoints: Array.isArray(goal.datapoints) ? goal.datapoints : [] };
}
function loadLocalGoals() {
  if (IS_LOCAL_TEST && TEST_PARAMS.get('sample') === '1') {
    state.usingSample = true; state.goals = createSampleGoals(); $('#updated-label').textContent = 'Local test data'; render(); return;
  }
  if (!localStorage.getItem('bee-user') || !localStorage.getItem('bee-token')) {
    state.goals = [];
    render();
    return;
  }
  const stored = localStorage.getItem('bee-goals');
  state.goals = (stored ? JSON.parse(stored) : []).map(normalizeGoal);
  $('#updated-label').textContent = stored ? 'Saved on this device' : 'Connected';
  render(); renderTimeline();
}
function persistGoals() { localStorage.setItem('bee-goals', JSON.stringify(state.goals)); }
function todayDaystamp(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}`;
}
function hasDataToday(datapoints, timeZone) {
  const today = todayDaystamp(timeZone);
  return Array.isArray(datapoints) && datapoints.some(point => point.daystamp === today);
}
function createSampleGoals() {
  const today = todayDaystamp(state.timeZone);
  return sampleGoals.map((goal, goalIndex) => normalizeGoal({ ...goal, datapoints: Array.from({ length: 14 }, (_, index) => index).filter(index => (index + goalIndex) % (goalIndex % 3 + 2) === 0).map(index => ({ daystamp: shiftDaystamp(today, -index) })) }));
}
function shiftDaystamp(daystamp, days) {
  const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8)) + days));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}
function dayLabel(daystamp, offset) {
  if (offset === 0) return 'Today';
  const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8))));
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(date);
}
function urgency(goal) {
  if (goal.safebuf <= 0) return { color: '#ef5b4c', label: 'Due today' };
  if (goal.safebuf <= 1) return { color: '#ec8f2d', label: `Safe for ${goal.safebuf} day` };
  if (goal.safebuf <= 3) return { color: '#d6a000', label: `Safe for ${goal.safebuf} days` };
  return { color: '#2eaa68', label: `Safe for ${goal.safebuf} days` };
}
function tags(text) { return [...text.matchAll(/#[\w-]+/g)].map(match => match[0]); }
function queryTokens(query) { return query.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(token => token.replace(/^"|"$/g, '').toLowerCase()) || []; }
function matchesQuery(goal) {
  const haystack = `${goal.slug} ${goal.title} ${goal.fineprint}`.toLowerCase();
  return queryTokens(state.query).every(token => {
    const excluded = token.startsWith('-');
    const term = excluded ? token.slice(1) : token;
    const matched = term === 'done:today' || term === 'done' ? goal.doneToday : haystack.includes(term);
    return excluded ? !matched : matched;
  });
}
function filteredGoals() {
  return state.goals
    .filter(goal => !state.hideDone || !goal.doneToday)
    .filter(matchesQuery)
    .sort((a, b) => state.sort === 'name' ? a.slug.localeCompare(b.slug) : state.sort === 'recent' ? a.updated - b.updated : a.safebuf - b.safebuf);
}
function addFilter(term) {
  const tokens = queryTokens(state.query);
  if (!tokens.includes(term.toLowerCase())) tokens.push(term);
  state.query = tokens.join(' '); state.activeView = 'custom'; render(); els.search.focus();
}
function render() {
  const goals = filteredGoals(); els.list.innerHTML = '';
  goals.forEach(goal => {
    const node = $('#goal-template').content.firstElementChild.cloneNode(true), safety = urgency(goal);
    node.style.setProperty('--urgency', safety.color); node.classList.toggle('done', goal.doneToday);
    node.querySelector('.goal-slug').textContent = goal.slug;
    node.querySelector('.description').textContent = goal.title;
    const fineprint = node.querySelector('.fineprint');
    fineprint.textContent = goal.fineprint; fineprint.hidden = !goal.fineprint;
    node.querySelector('.safety-pill').textContent = safety.label;
    const status = node.querySelector('.today-status');
    status.textContent = goal.doneToday ? 'Done today' : 'No data today'; status.classList.toggle('complete', goal.doneToday);
    node.querySelector('.edit-goal-button').onclick = () => openGoalEditor(goal.slug);
    const tagWrap = node.querySelector('.tags');
    tags(goal.fineprint).slice(0, 3).forEach(tag => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'tag'; button.textContent = tag;
      button.setAttribute('aria-label', `Filter by ${tag}`); button.onclick = () => addFilter(tag); tagWrap.append(button);
    });
    els.list.append(node);
  });
  const connected = state.usingSample || Boolean(localStorage.getItem('bee-user') && localStorage.getItem('bee-token'));
  els.empty.hidden = goals.length > 0;
  $('#empty-title').textContent = connected ? 'All clear' : 'Sign in to get started';
  $('#empty-copy').textContent = connected ? 'No commitments match this view.' : 'Connect your Beeminder account to load your commitments.';
  $('#empty-icon').textContent = connected ? '✓' : '→';
  $('#reset-filters').hidden = !connected; $('#empty-connect').hidden = connected;
  els.doneFilter.setAttribute('aria-pressed', state.hideDone);
  els.search.value = state.query; els.clear.hidden = !state.query; renderViews(); renderTimeline();
}
function setMode(mode) {
  state.mode = mode; localStorage.setItem('bee-mode', mode);
  $('#list-view').hidden = mode !== 'list'; $('#timeline-view').hidden = mode !== 'timeline';
  $('#list-tab').classList.toggle('active', mode === 'list'); $('#timeline-tab').classList.toggle('active', mode === 'timeline');
  $('#list-tab').setAttribute('aria-selected', mode === 'list'); $('#timeline-tab').setAttribute('aria-selected', mode === 'timeline');
  if (mode === 'timeline') renderTimeline();
}
function renderTimeline() {
  const host = $('#timeline-scroll'); if (!host) return; host.innerHTML = '';
  const connected = state.usingSample || Boolean(localStorage.getItem('bee-user') && localStorage.getItem('bee-token'));
  if (!connected) {
    const prompt = document.createElement('div'); prompt.className = 'timeline-prompt'; prompt.innerHTML = '<strong>Sign in to see your timeline</strong><span>Commitment history comes from your Beeminder datapoints.</span>';
    const button = document.createElement('button'); button.className = 'primary-button'; button.textContent = 'Sign in to Beeminder'; button.onclick = () => els.settingsDialog.showModal(); prompt.append(button); host.append(prompt); return;
  }
  const goals = state.goals, today = todayDaystamp(state.timeZone), offsets = Array.from({ length: 22 }, (_, index) => 7 - index);
  const grid = document.createElement('div'); grid.className = 'history-grid'; grid.style.setProperty('--goal-count', Math.max(goals.length, 1));
  const corner = document.createElement('div'); corner.className = 'history-corner'; corner.textContent = 'Day'; grid.append(corner);
  goals.forEach(goal => { const cell = document.createElement('div'); cell.className = 'history-goal'; cell.title = goal.slug; const label = document.createElement('span'); label.textContent = goal.slug; cell.append(label); grid.append(cell); });
  offsets.forEach(offset => {
    const daystamp = shiftDaystamp(today, offset), label = document.createElement('div'); label.className = `history-day${offset === 0 ? ' today' : ''}`; label.textContent = dayLabel(daystamp, offset); grid.append(label);
    goals.forEach(goal => {
      const cell = document.createElement('div'); cell.className = `history-cell${offset === 0 ? ' today' : ''}`;
      const hasData = goal.datapoints.some(point => point.daystamp === daystamp);
      const dueOffset = Math.max(0, Math.floor(goal.safebuf));
      if (hasData) { const mark = document.createElement('span'); mark.className = 'cell-mark history'; mark.title = `${goal.slug}: data entered`; cell.append(mark); }
      else if (offset >= 0 && offset === dueOffset) { const mark = document.createElement('span'); mark.className = `cell-mark due${dueOffset <= 1 ? ' urgent' : ''}`; mark.title = `${goal.slug}: deadline`; cell.append(mark); }
      grid.append(cell);
    });
  });
  host.append(grid);
}
function renderViews() {
  els.chips.innerHTML = '';
  [{ name: 'All', query: '', hideDone: true, id: 'all' }, ...state.views].forEach(view => {
    const button = document.createElement('button'); button.className = `view-chip${view.id === state.activeView ? ' active' : ''}`; button.textContent = view.name;
    button.onclick = () => { state.activeView = view.id; state.query = view.query; state.hideDone = view.hideDone; render(); };
    if (view.id !== 'all') button.ondblclick = () => removeView(view.id); els.chips.append(button);
  });
}
function removeView(id) { state.views = state.views.filter(view => view.id !== id); localStorage.setItem('bee-views', JSON.stringify(state.views)); state.activeView = 'all'; render(); toast('View removed'); }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); setTimeout(() => els.toast.classList.remove('show'), 1800); }
function openGoalEditor(slug) {
  const goal = state.goals.find(item => item.slug === slug); if (!goal) return;
  state.editingSlug = slug; $('#edit-goal-slug').textContent = slug; $('#edit-goal-title').value = goal.title; $('#edit-goal-fineprint').value = goal.fineprint;
  els.editDialog.showModal();
}
async function saveGoalTitle() {
  const goal = state.goals.find(item => item.slug === state.editingSlug), user = localStorage.getItem('bee-user'), token = localStorage.getItem('bee-token');
  if (!goal || !user || !token) throw new Error('Connect to Beeminder before editing');
  const title = $('#edit-goal-title').value.trim();
  const body = new URLSearchParams({ auth_token: token, title });
  const response = await fetch(`https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}/goals/${encodeURIComponent(goal.slug)}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
  if (!response.ok) throw new Error(`Beeminder could not save this description (${response.status})`);
  const updated = await response.json(); goal.title = cleanText(updated.title || title); goal.fineprint = cleanText(updated.fineprint ?? goal.fineprint); persistGoals(); render();
}
async function checkForUpdates() {
  const button = $('#update-button'), label = $('#update-label'); button.classList.remove('available', 'offline'); label.textContent = 'Checking for updates…';
  try {
    const registration = await navigator.serviceWorker?.getRegistration(); await registration?.update();
    const response = await fetch(`./version.json?check=${Date.now()}`, { cache: 'no-store' }); if (!response.ok) throw new Error('Version check failed');
    const { version } = await response.json();
    if (version !== APP_VERSION) { button.classList.add('available'); label.textContent = `Version ${version} available`; button.onclick = () => location.reload(); }
    else { label.textContent = 'Up to date'; button.onclick = checkForUpdates; }
  } catch { button.classList.add('offline'); label.textContent = 'Offline · tap to retry'; button.onclick = checkForUpdates; }
}

els.search.oninput = event => { state.query = event.target.value; state.activeView = 'custom'; render(); };
els.clear.onclick = () => { state.query = ''; state.activeView = 'all'; render(); };
els.doneFilter.onclick = () => { state.hideDone = !state.hideDone; state.activeView = 'custom'; render(); };
els.sort.onchange = event => { state.sort = event.target.value; render(); };
$('#reset-filters').onclick = () => { state.query = ''; state.hideDone = false; render(); };
$('#settings-button').onclick = () => { $('#username').value = localStorage.getItem('bee-user') || ''; $('#auth-token').value = localStorage.getItem('bee-token') || ''; els.settingsDialog.showModal(); };
$('#timeline-settings').onclick = $('#settings-button').onclick;
$('#list-tab').onclick = () => setMode('list');
$('#timeline-tab').onclick = () => setMode('timeline');
$('#empty-connect').onclick = () => els.settingsDialog.showModal();
$('#save-view-button').onclick = () => els.saveDialog.showModal();
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => addFilter(button.dataset.filter));
$('#save-view-form').onsubmit = event => { if (event.submitter.value === 'cancel') return; const name = $('#view-name').value.trim(); if (!name) return; event.preventDefault(); const view = { id: Date.now().toString(), name, query: state.query, hideDone: state.hideDone }; state.views.push(view); state.activeView = view.id; localStorage.setItem('bee-views', JSON.stringify(state.views)); els.saveDialog.close(); $('#view-name').value = ''; render(); toast('View saved'); };
$('#edit-goal-form').onsubmit = async event => { if (event.submitter.value === 'cancel') return; event.preventDefault(); const button = $('#save-goal-button'); button.disabled = true; button.textContent = 'Saving…'; try { await saveGoalTitle(); els.editDialog.close(); toast('Description saved to Beeminder'); } catch (error) { toast(error.message); } finally { button.disabled = false; button.textContent = 'Save description to Beeminder'; } };
$('#settings-form').onsubmit = async event => {
  if (event.submitter.value === 'cancel') return; event.preventDefault(); const user = $('#username').value.trim(), token = $('#auth-token').value.trim();
  if (!user || !token) { toast('Enter username and token'); return; }
  localStorage.setItem('bee-user', user); localStorage.setItem('bee-token', token); $('#connect-button').textContent = 'Connecting…';
  try {
    const url = `https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}.json?auth_token=${encodeURIComponent(token)}&associations=true&emaciated=true&datapoints_count=100`;
    const response = await fetch(url); if (!response.ok) throw new Error('Could not connect'); const data = await response.json();
    const timeZone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    state.timeZone = timeZone; localStorage.setItem('bee-timezone', timeZone);
    state.usingSample = false;
    state.goals = data.goals.map(goal => normalizeGoal({ slug: goal.slug, title: goal.title || goal.slug, fineprint: goal.fineprint || '', safebuf: Number.isFinite(goal.safebuf) ? goal.safebuf : 99, datapoints: goal.datapoints || [], doneToday: hasDataToday(goal.datapoints, timeZone), updated: Date.now() / 60000 - (goal.updated_at || 0) / 60 }));
    persistGoals(); $('#updated-label').textContent = 'Updated just now'; els.settingsDialog.close(); render(); toast('Goals refreshed');
  } catch (error) { toast(error.message); } finally { $('#connect-button').textContent = 'Connect & refresh'; }
};
$('#disconnect-button').onclick = () => { localStorage.removeItem('bee-user'); localStorage.removeItem('bee-token'); localStorage.removeItem('bee-goals'); state.goals = []; state.usingSample = false; $('#updated-label').textContent = 'Not connected'; els.settingsDialog.close(); render(); toast('Signed out on this device'); };
if (IS_LOCAL_TEST) $('#sample-button').hidden = false;
$('#sample-button').onclick = () => { if (!IS_LOCAL_TEST) return; state.usingSample = true; state.goals = createSampleGoals(); $('#updated-label').textContent = 'Local test data'; els.settingsDialog.close(); render(); toast('Showing local test data'); };
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
$('#version-label').textContent = `Version ${APP_VERSION}`; $('#update-button').onclick = checkForUpdates; window.addEventListener('load', checkForUpdates); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdates(); });
loadLocalGoals();
setMode(state.mode);
