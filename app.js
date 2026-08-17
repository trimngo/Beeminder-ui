const sampleGoals = [
  { slug: 'morning-pages', title: 'Morning pages', fineprint: 'Write 3 pages\n#morning #writing', safebuf: 0, doneToday: false, updated: 6 },
  { slug: 'inbox-zero', title: 'Inbox zero', fineprint: 'Reply to work messages\n#admin #quick', safebuf: 1, doneToday: false, updated: 42 },
  { slug: 'german', title: 'Practice German', fineprint: '20 sentences from a book\n#learning #deep', safebuf: 1, doneToday: true, updated: 20 },
  { slug: 'strength', title: 'Strength training', fineprint: 'Complete today’s workout\n#health #gym', safebuf: 2, doneToday: false, updated: 180 },
  { slug: 'connection', title: 'Reach out', fineprint: 'Make one request to connect\n#social #quick', safebuf: 4, doneToday: false, updated: 320 },
  { slug: 'read', title: 'Read a book', fineprint: 'Read 20 focused pages\n#learning #deep', safebuf: 6, doneToday: false, updated: 90 }
];
const APP_VERSION = '1.0.6';
const $ = selector => document.querySelector(selector);
const state = {
  goals: [], query: '', hideDone: true, sort: 'urgency', activeView: 'all', editingSlug: null,
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
  return { ...goal, title: cleanText(goal.title || goal.slug), fineprint: cleanText(goal.fineprint ?? goal.description ?? '') };
}
function loadLocalGoals() {
  const stored = localStorage.getItem('bee-goals');
  state.goals = (stored ? JSON.parse(stored) : sampleGoals.map(goal => ({ ...goal }))).map(normalizeGoal);
  render();
}
function persistGoals() { localStorage.setItem('bee-goals', JSON.stringify(state.goals)); }
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
  els.empty.hidden = goals.length > 0; els.doneFilter.setAttribute('aria-pressed', state.hideDone);
  els.search.value = state.query; els.clear.hidden = !state.query; renderViews();
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
$('#save-view-button').onclick = () => els.saveDialog.showModal();
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => addFilter(button.dataset.filter));
$('#save-view-form').onsubmit = event => { if (event.submitter.value === 'cancel') return; const name = $('#view-name').value.trim(); if (!name) return; event.preventDefault(); const view = { id: Date.now().toString(), name, query: state.query, hideDone: state.hideDone }; state.views.push(view); state.activeView = view.id; localStorage.setItem('bee-views', JSON.stringify(state.views)); els.saveDialog.close(); $('#view-name').value = ''; render(); toast('View saved'); };
$('#edit-goal-form').onsubmit = async event => { if (event.submitter.value === 'cancel') return; event.preventDefault(); const button = $('#save-goal-button'); button.disabled = true; button.textContent = 'Saving…'; try { await saveGoalTitle(); els.editDialog.close(); toast('Description saved to Beeminder'); } catch (error) { toast(error.message); } finally { button.disabled = false; button.textContent = 'Save description to Beeminder'; } };
$('#settings-form').onsubmit = async event => {
  if (event.submitter.value === 'cancel') return; event.preventDefault(); const user = $('#username').value.trim(), token = $('#auth-token').value.trim();
  if (!user || !token) { toast('Enter username and token'); return; }
  localStorage.setItem('bee-user', user); localStorage.setItem('bee-token', token); $('#connect-button').textContent = 'Connecting…';
  try {
    const url = `https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}/goals.json?auth_token=${encodeURIComponent(token)}&datapoints_count=1`;
    const response = await fetch(url); if (!response.ok) throw new Error('Could not connect'); const data = await response.json();
    state.goals = data.map(goal => normalizeGoal({ slug: goal.slug, title: goal.title || goal.slug, fineprint: goal.fineprint || '', safebuf: Number.isFinite(goal.safebuf) ? goal.safebuf : 99, doneToday: Array.isArray(goal.datapoints) && goal.datapoints.some(point => new Date(point.timestamp * 1000).toDateString() === new Date().toDateString()), updated: Date.now() / 60000 - (goal.updated_at || 0) / 60 }));
    persistGoals(); $('#updated-label').textContent = 'Updated just now'; els.settingsDialog.close(); render(); toast('Goals refreshed');
  } catch (error) { toast(error.message); } finally { $('#connect-button').textContent = 'Connect & refresh'; }
};
$('#sample-button').onclick = () => { localStorage.removeItem('bee-user'); localStorage.removeItem('bee-token'); state.goals = sampleGoals.map(goal => ({ ...goal })); persistGoals(); $('#updated-label').textContent = 'Sample data'; els.settingsDialog.close(); render(); toast('Showing sample goals'); };
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
$('#version-label').textContent = `Version ${APP_VERSION}`; $('#update-button').onclick = checkForUpdates; window.addEventListener('load', checkForUpdates); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdates(); });
loadLocalGoals();
