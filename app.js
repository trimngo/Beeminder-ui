const sampleGoals = [
  { slug: 'morning-pages', title: '{"m":30,"t":["morning","writing"]} Morning pages\n- [ ] Write three pages\n- [ ] Record the total', fineprint: 'Write 3 pages', safebuf: 0, rate: 5, runits: 'w', quantum: 1, pledge: 0, doneToday: false, updated: 6 },
  { slug: 'inbox-zero', title: '{"m":10,"t":["admin","quick"]} Inbox zero', fineprint: 'Reply to work messages', safebuf: 1, rate: 5, runits: 'w', quantum: 1, pledge: 5, actionValue: 1, doneToday: false, updated: 42 },
  { slug: 'german', title: 'Practice German', fineprint: '20 sentences from a book\n#learning #deep', safebuf: 1, rate: 3, runits: 'w', quantum: 1, pledge: 0, doneToday: true, updated: 20 },
  { slug: 'strength', title: '{"m":45,"t":["health","gym"]} Strength training', fineprint: 'Complete today’s workout', safebuf: 2, rate: 3, runits: 'w', quantum: 1, pledge: 0, doneToday: false, updated: 180 },
  { slug: 'connection', title: '{"m":15,"t":["social","quick"]} Reach out', fineprint: 'Make one request to connect', safebuf: 4, rate: 1, runits: 'w', quantum: 1, pledge: 0, doneToday: false, updated: 320 },
  { slug: 'read', title: '{"m":20,"t":["learning","deep"]} Read a book', fineprint: 'Read 20 focused pages', safebuf: 6, rate: 2, runits: 'w', quantum: 1, pledge: 0, doneToday: false, updated: 90 }
];
const APP_VERSION = '1.0.60';
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const IS_LOCAL_TEST = ['localhost', '127.0.0.1'].includes(location.hostname);
const TEST_PARAMS = new URLSearchParams(location.search);
const $ = selector => document.querySelector(selector);
const state = {
  goals: [], query: '', tagFilters: {}, maxSafeDays: '', forecastOffsets: [], sort: 'urgency', editingSlug: null, dataEntrySlug: null, calendarSlug: null, refreshingSafetySlug: null, usingSample: false,
  mode: IS_LOCAL_TEST && TEST_PARAMS.get('mode') === 'timeline' ? 'timeline' : localStorage.getItem('bee-mode') || 'list', timeZone: localStorage.getItem('bee-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
  futureDays: IS_LOCAL_TEST && TEST_PARAMS.get('future') ? Number(TEST_PARAMS.get('future')) : Number(localStorage.getItem('bee-future-days')) || 7
};
const els = {
  list: $('#goal-list'), empty: $('#empty-state'), search: $('#search-input'), clear: $('#clear-search'),
  safeDays: $('#safe-days-filter'), sort: $('#sort-select'),
  settingsDialog: $('#settings-dialog'), editDialog: $('#edit-dialog'), dataDialog: $('#data-dialog'), calendarDialog: $('#calendar-dialog'), accountabilityDialog: $('#accountability-dialog'), historyDialog: $('#goal-history-dialog'), summaryChartsDialog: $('#summary-charts-dialog'), toast: $('#toast')
};

function cleanText(text = '') { return String(text).replace(/\s(?:\d{10})$/, '').trim(); }
function normalizeGoal(goal) {
  // Migrate goals cached by older releases, where fine print was stored as `description`.
  const parsed = BeeGoalMetadata.parse(cleanText(goal.rawTitle || goal.title || goal.slug));
  return { ...goal, rawTitle: parsed.rawTitle, title: parsed.title, minutesPerUnit: parsed.minutes, metadataTags: parsed.tags, hasMetadata: parsed.hasMetadata, fineprint: cleanText(goal.fineprint ?? goal.description ?? ''), kyoom: goal.kyoom !== false, aggday: goal.aggday || 'sum', fullroad: Array.isArray(goal.fullroad) ? goal.fullroad : [], datapoints: Array.isArray(goal.datapoints) ? goal.datapoints : [] };
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
function isConnected() { return state.usingSample || Boolean(localStorage.getItem('bee-user') && localStorage.getItem('bee-token')); }
function checklistUsername() { return state.usingSample ? 'sample' : localStorage.getItem('bee-user') || 'local'; }
function updateAuthUI() {
  const connected = isConnected();
  $('#auth-gate').hidden = connected; $('#test-data-banner').hidden = !state.usingSample;
  $('#list-view').hidden = !connected || state.mode !== 'list';
  $('#timeline-view').hidden = !connected || state.mode !== 'timeline';
  $('#stats-view').hidden = !connected || state.mode !== 'stats';
}
function todayDaystamp(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}`;
}
function hasDataToday(datapoints, timeZone) {
  const today = todayDaystamp(timeZone);
  return Array.isArray(datapoints) && datapoints.some(point => point.daystamp === today);
}
function todayAccountabilityMessage() {
  return BeeAccountability.todayWinsMessage(state.goals, todayDaystamp(state.timeZone));
}
async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text; textarea.setAttribute('readonly', ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0';
  document.body.append(textarea); textarea.select();
  const copied = document.execCommand('copy'); textarea.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}
function createSampleGoals() {
  const today = todayDaystamp(state.timeZone);
  return sampleGoals.map((goal, goalIndex) => normalizeGoal({ ...goal, datapoints: Array.from({ length: 14 }, (_, index) => index).filter(index => (index + goalIndex) % (goalIndex % 3 + 2) === 0).map(index => ({ daystamp: shiftDaystamp(today, -index), value: goal.actionValue || goalIndex + 1, comment: (goalIndex === 1 || goalIndex === 3) && index === 5 ? '#DERAIL' : index === 0 ? 'Completed today’s commitment' : `Test note from ${index} day${index === 1 ? '' : 's'} ago` })) }));
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
function isDerailDatapoint(point) {
  return Boolean(point.is_derail || point.derail || /\bderail(?:ed|ment)?\b/i.test(point.comment || ''));
}
function goalDerailStats(goal) {
  const derails = BeeGoalStats.countDerails(goal.datapoints);
  return { derails, paid: BeeGoalStats.totalPaid(derails) };
}
function ratePerDay(goal) {
  const unitDays = { h: 1 / 24, d: 1, w: 7, m: 30.4375, y: 365.25 };
  const days = unitDays[goal.runits] || 1, rate = Math.abs(Number(goal.rate));
  return Number.isFinite(rate) && rate > 0 ? rate / days : 0;
}
function targetRatePerDay(goal) {
  const unitDays = { h: 1 / 24, d: 1, w: 7, m: 30.4375, y: 365.25 };
  const rate = Number(goal.rate), days = unitDays[goal.runits] || 1;
  return Number.isFinite(rate) ? rate / days : null;
}
function fourteenDayPerformance(goal) {
  const target = targetRatePerDay(goal);
  // A sum of datapoint values represents progress only for cumulative goals.
  // Non-cumulative readings (for example weight) need road-aware deltas, so do
  // not present a deceptively precise comparison for them.
  if (!goal.kyoom || !Number.isFinite(target) || target === 0) return { actual: null, target, miss: null };
  const today = todayDaystamp(state.timeZone), start = shiftDaystamp(today, -13);
  const total = goal.datapoints.reduce((sum, point) => {
    if (point.daystamp < start || point.daystamp > today) return sum;
    const value = Number(point.value);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const actual = total / 14;
  const miss = target > 0 ? (target - actual) / Math.abs(target) : (actual - target) / Math.abs(target);
  return { actual, target, miss, compliance: actual / target };
}
function formatDailyRate(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}
function projectedDeadlineOffsets(goal, horizon) {
  return BeeProjection.projectedWorkloadDeadlineOffsets(goal, horizon, todayDaystamp(state.timeZone));
}
function urgency(goal) {
  if (goal.safebuf <= 0) return { color: '#ef5b4c', label: 'Due today' };
  if (goal.safebuf <= 1) return { color: '#ec8f2d', label: `Safe for ${goal.safebuf} day` };
  if (goal.safebuf <= 3) return { color: '#d6a000', label: `Safe for ${goal.safebuf} days` };
  return { color: '#2eaa68', label: `Safe for ${goal.safebuf} days` };
}
function tags(text) { return [...text.matchAll(/#[\w-]+/g)].map(match => match[0]); }
function goalTagNames(goal) {
  return (goal.hasMetadata ? goal.metadataTags : tags(goal.title).map(tag => tag.slice(1)))
    .map(tag => String(tag).toLowerCase());
}
function matchesTagFilters(goal) {
  return BeeGoalFilters.matchesTagStates(goalTagNames(goal), state.tagFilters);
}
function matchesQuery(goal) { return BeeGoalSearch.matchesGoalQuery(goal, state.query); }
function filteredGoals() {
  const today = todayDaystamp(state.timeZone);
  const selectedDays = Array.isArray(state.forecastOffsets) ? state.forecastOffsets : [];
  return state.goals
    .filter(goal => BeeGoalFilters.safeDaysAtMost(goal, state.maxSafeDays))
    .filter(goal => BeeGoalFilters.projectedOnSelectedDays(goal, selectedDays, today, BeeProjection.projectedWorkloadDeadlineOffsets))
    .filter(matchesTagFilters)
    .filter(matchesQuery)
    .sort((a, b) => {
      if (state.sort === 'time-asc') return BeeGoalFilters.compareMinutesPerUnit(a, b, 'asc');
      if (state.sort === 'time-desc') return BeeGoalFilters.compareMinutesPerUnit(a, b, 'desc');
      if (state.sort === 'name') return a.slug.localeCompare(b.slug);
      if (state.sort === 'recent') return a.updated - b.updated;
      if (['compliance-low', 'compliance-high'].includes(state.sort)) {
        const aCompliance = fourteenDayPerformance(a).compliance, bCompliance = fourteenDayPerformance(b).compliance;
        if (!Number.isFinite(aCompliance) && !Number.isFinite(bCompliance)) return a.slug.localeCompare(b.slug);
        if (!Number.isFinite(aCompliance)) return 1;
        if (!Number.isFinite(bCompliance)) return -1;
        const direction = state.sort === 'compliance-high' ? -1 : 1;
        return direction * (aCompliance - bCompliance) || a.slug.localeCompare(b.slug);
      }
      return a.safebuf - b.safebuf;
    });
}
function render() {
  const goals = filteredGoals(); els.list.innerHTML = '';
  renderDashboardSummary(goals);
  renderTagFilters();
  const activeGoals = goals.filter(goal => !goal.doneToday), doneGoals = goals.filter(goal => goal.doneToday);
  [...activeGoals, ...doneGoals].forEach((goal, goalIndex) => {
    if (goalIndex === activeGoals.length && doneGoals.length) {
      const heading = document.createElement('h3'); heading.className = 'done-today-heading'; heading.textContent = 'Done today'; els.list.append(heading);
    }
    const node = $('#goal-template').content.firstElementChild.cloneNode(true), safety = urgency(goal);
    node.style.setProperty('--urgency', safety.color); node.classList.toggle('done', goal.doneToday);
    node.querySelector('.goal-slug').textContent = goal.slug;
    const checklist = BeeGoalChecklist.parse(goal.title);
    node.querySelector('.description').textContent = checklist.description;
    const checklistWrap = node.querySelector('.goal-checklist');
    if (checklist.items.length) {
      const checked = new Set(BeeGoalChecklist.checkedItems(localStorage, checklistUsername(), goal.slug, checklist.signature));
      checklist.items.forEach((item, index) => {
        const label = document.createElement('label'); label.className = 'checklist-item';
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked.has(index);
        const text = document.createElement('span'); text.textContent = item;
        input.onchange = () => {
          if (input.checked) checked.add(index); else checked.delete(index);
          BeeGoalChecklist.setChecked(localStorage, checklistUsername(), goal.slug, checklist.signature, [...checked]);
          label.classList.toggle('checked', input.checked);
        };
        label.classList.toggle('checked', input.checked); label.append(input, text); checklistWrap.append(label);
      });
    } else checklistWrap.hidden = true;
    const performance = fourteenDayPerformance(goal), rateComparison = node.querySelector('.rate-comparison');
    if (performance.actual === null) {
      rateComparison.querySelector('.rate-label').textContent = performance.target === null || performance.target === 0 ? 'No comparable target' : '14d rate unavailable';
      rateComparison.classList.add('unavailable');
    } else {
      const percent = Math.round(performance.compliance * 100), progress = rateComparison.querySelector('.rate-progress');
      const boundedPercent = Math.max(0, Math.min(100, percent));
      rateComparison.querySelector('.rate-label').textContent = `${percent}% of target`;
      rateComparison.querySelector('.rate-values').textContent = `${formatDailyRate(performance.actual)} / ${formatDailyRate(performance.target)} per day`;
      progress.style.setProperty('--rate-progress', `${boundedPercent}%`);
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', `${goal.slug} 14-day rate as a percentage of target`);
      progress.setAttribute('aria-valuenow', String(boundedPercent));
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      progress.setAttribute('aria-valuetext', `${percent}% of target; actual ${formatDailyRate(performance.actual)} per day, target ${formatDailyRate(performance.target)} per day`);
      rateComparison.classList.add(performance.miss > 0 ? 'behind' : 'meeting');
    }
    const derailStats = goalDerailStats(goal), derailSummary = node.querySelector('.derail-summary');
    derailSummary.textContent = `${derailStats.derails} derail${derailStats.derails === 1 ? '' : 's'} · $${formatDailyRate(derailStats.paid)} paid`;
    derailSummary.title = 'Total paid assumes every derail costs $5.';
    node.querySelector('.safety-pill').textContent = state.refreshingSafetySlug === goal.slug ? 'Updating safety…' : safety.label;
    const timePill = node.querySelector('.time-pill');
    timePill.textContent = goal.minutesPerUnit === null ? '' : `${formatDailyRate(goal.minutesPerUnit)} min/unit ·`;
    timePill.hidden = goal.minutesPerUnit === null;
    const status = node.querySelector('.today-status');
    status.textContent = goal.doneToday ? 'Done today' : 'No data today'; status.classList.toggle('complete', goal.doneToday);
    status.setAttribute('aria-label', `Show all data entries for ${goal.slug}`);
    status.onclick = () => openGoalHistory(goal.slug);
    node.querySelector('.edit-goal-button').onclick = () => openGoalEditor(goal.slug);
    const calendarButton = node.querySelector('.calendar-button');
    calendarButton.disabled = !(Number(goal.minutesPerUnit) > 0);
    calendarButton.title = calendarButton.disabled ? 'Set minutes per unit before scheduling' : 'Schedule in Google Calendar';
    calendarButton.setAttribute('aria-label', `Schedule ${goal.slug} in Google Calendar`);
    calendarButton.onclick = () => openCalendarDialog(goal.slug);
    const addDataButton = node.querySelector('.add-data-button');
    addDataButton.disabled = state.usingSample;
    addDataButton.title = state.usingSample ? 'Data entry is unavailable for local test data' : '';
    addDataButton.onclick = () => openDataEntry(goal.slug);
    const tagWrap = node.querySelector('.tags');
    const visibleTags = goalTagNames(goal).map(tag => `#${tag}`);
    visibleTags.slice(0, 3).forEach(tag => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'tag'; button.textContent = tag;
      button.setAttribute('aria-label', `Include ${tag}`); button.onclick = () => { state.tagFilters[tag.slice(1)] = 'include'; render(); }; tagWrap.append(button);
    });
    els.list.append(node);
  });
  const connected = isConnected();
  els.empty.hidden = goals.length > 0;
  $('#empty-title').textContent = connected ? 'All clear' : 'Sign in to get started';
  $('#empty-copy').textContent = connected ? 'No commitments match this view.' : 'Connect your Beeminder account to load your commitments.';
  $('#empty-icon').textContent = connected ? '✓' : '→';
  $('#reset-filters').hidden = !connected; $('#empty-connect').hidden = connected;
  els.safeDays.value = state.maxSafeDays;
  els.sort.value = state.sort;
  els.search.value = state.query; els.clear.hidden = !state.query; renderTimeline(); renderStats(); updateAuthUI();
}
function renderTagFilters() {
  const host = $('#tag-filters'); host.innerHTML = '';
  const available = [...new Set(state.goals.flatMap(goalTagNames))].sort();
  if (!available.length) { host.hidden = true; return; }
  host.hidden = false;
  available.forEach(tag => {
    const mode = state.tagFilters[tag] || 'neutral', button = document.createElement('button');
    button.type = 'button'; button.className = `tag-filter ${mode}`; button.dataset.mode = mode;
    button.textContent = `${mode === 'include' ? '✓ ' : mode === 'exclude' ? '− ' : ''}#${tag}`;
    button.setAttribute('aria-label', `Tag ${tag}: ${mode}. Tap to ${mode === 'neutral' ? 'include' : mode === 'include' ? 'exclude' : 'clear'} this tag.`);
    button.onclick = () => {
      const next = mode === 'neutral' ? 'include' : mode === 'include' ? 'exclude' : 'neutral';
      if (next === 'neutral') delete state.tagFilters[tag]; else state.tagFilters[tag] = next;
      render();
    };
    host.append(button);
  });
}
function renderDashboardSummary(filtered = filteredGoals()) {
  const minutes = BeeDashboardSummary.estimatedMinutesToSafety(state.goals);
  const missing = BeeDashboardSummary.goalsMissingTimeToSafety(state.goals);
  const filteredMinutes = BeeDashboardSummary.estimatedMinutesForGoals(filtered);
  const filteredMissing = BeeDashboardSummary.goalsMissingTime(filtered);
  const paid = BeeDashboardSummary.totalPenalties(state.goals, BeeGoalStats.countDerails);
  $('#today-time-total').textContent = BeeDashboardSummary.formatDuration(minutes);
  $('#today-time-note').textContent = missing ? `${missing} due commitment${missing === 1 ? '' : 's'} missing a time estimate` : 'Configured commitments due today';
  $('#filtered-time-total').textContent = BeeDashboardSummary.formatDuration(filteredMinutes);
  $('#filtered-time-note').textContent = `${filtered.length} displayed${filteredMissing ? ` · ${filteredMissing} missing time` : ''}`;
  $('#penalty-total').textContent = `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(paid)}`;
  renderWorkdayCountdown();
  renderWorkloadForecast();
}
function renderWorkdayCountdown() {
  const value = $('#workday-countdown'); if (!value) return;
  const seconds = BeeDashboardSummary.remainingWorkdaySeconds(new Date(), state.timeZone, 21);
  const workloadMinutes = BeeDashboardSummary.estimatedMinutesToSafety(state.goals);
  const status = BeeDashboardSummary.workdayCountdownStatus(seconds, workloadMinutes);
  const progress = BeeDashboardSummary.workdayProgress(seconds, workloadMinutes, 8, 21);
  value.textContent = BeeDashboardSummary.formatCountdown(seconds);
  const row = $('#workday-countdown-row'); row.className = `workday-countdown-row ${status}`;
  row.style.setProperty('--remaining-percent', `${progress.remainingPercent}%`);
  row.style.setProperty('--elapsed-percent', `${progress.elapsedPercent}%`);
  row.style.setProperty('--required-percent', `${progress.requiredPercent}%`);
  row.style.setProperty('--danger-percent', `${progress.dangerPercent}%`);
  row.style.setProperty('--warning-percent', `${progress.warningPercent}%`);
  const segments = $('#workday-segments'); segments.innerHTML = '';
  const workload = BeeDashboardSummary.workloadBreakdown(state.goals, true);
  const workloadTotal = workload.reduce((sum, item) => sum + item.value, 0);
  workload.forEach(item => {
    const segment = document.createElement('i'); segment.style.cssText = `--segment-share:${workloadTotal ? item.value / workloadTotal * 100 : 0}%;--segment-hue:${BeeWorkloadHistory.goalHue(item.slug)}`;
    segment.title = `${item.slug}: ${BeeDashboardSummary.formatDuration(item.value)}`; segments.append(segment);
  });
  const slackMinutes = (seconds - workloadMinutes * 60) / 60;
  $('#workday-slack').textContent = seconds === 0 ? 'Workday ended' : slackMinutes >= 0
    ? `${BeeDashboardSummary.formatDuration(slackMinutes)} beyond today’s minimum`
    : `${BeeDashboardSummary.formatDuration(Math.abs(slackMinutes))} short of today’s minimum`;
}
function forecastDayLabel(daystamp, offset) {
  if (offset === 0) return 'Today';
  const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8))));
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(date);
}
function renderWorkloadForecast() {
  const host = $('#workload-forecast-days'), today = todayDaystamp(state.timeZone);
  const totals = BeeDashboardSummary.sevenDayWorkload(state.goals, today, BeeProjection.projectedWorkloadDeadlineOffsets);
  const counts = BeeDashboardSummary.sevenDayCommitmentCounts(state.goals, today, BeeProjection.projectedWorkloadDeadlineOffsets);
  const maximum = Math.max(...totals, 1); host.innerHTML = '';
  totals.forEach((minutes, offset) => {
    const daystamp = shiftDaystamp(today, offset), item = document.createElement('button'); item.type = 'button'; item.className = 'forecast-day';
    item.style.setProperty('--forecast-load', `${Math.max(5, minutes / maximum * 100)}%`);
    const selected = state.forecastOffsets.includes(offset);
    item.classList.toggle('active', selected); item.setAttribute('aria-pressed', String(selected));
    const label = document.createElement('span'); label.textContent = forecastDayLabel(daystamp, offset);
    const value = document.createElement('strong'); value.textContent = BeeDashboardSummary.formatCompactDuration(minutes);
    const count = document.createElement('small'); count.textContent = `${counts[offset]} item${counts[offset] === 1 ? '' : 's'}`;
    item.title = `${forecastDayLabel(daystamp, offset)}: ${BeeDashboardSummary.formatDuration(minutes)} predicted`;
    item.setAttribute('aria-label', `${item.title}; filter commitments for this day`);
    item.onclick = () => {
      state.forecastOffsets = selected ? state.forecastOffsets.filter(day => day !== offset) : [...state.forecastOffsets, offset].sort((a, b) => a - b);
      render();
    };
    item.append(label, value, count); host.append(item);
  });
}
function renderBreakdownChart(host, { id, title, items, formatter }) {
  const section = document.createElement('section'); section.className = 'breakdown-chart'; section.dataset.chart = id;
  const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
  const total = items.reduce((sum, item) => sum + item.value, 0), bar = document.createElement('div'); bar.className = 'segmented-bar';
  const detail = document.createElement('p'); detail.className = 'chart-detail';
  const legend = document.createElement('div'); legend.className = 'chart-legend';
  if (!total) {
    bar.classList.add('empty'); detail.textContent = 'No configured contributions in this total.';
  } else {
    const select = (item, index) => {
      const percent = item.value / total * 100;
      detail.textContent = `${item.slug} · ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(percent)}% · ${formatter(item.value)}`;
      section.querySelectorAll('[aria-pressed]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.index === String(index))));
    };
    items.forEach((item, index) => {
      const color = `hsl(${(index * 67 + 38) % 360} 68% 52%)`, percent = item.value / total * 100;
      const segment = document.createElement('button'); segment.type = 'button'; segment.className = 'bar-segment'; segment.style.cssText = `--segment-color:${color};--segment-width:${percent}%`; segment.dataset.index = String(index); segment.setAttribute('aria-pressed', 'false'); segment.setAttribute('aria-label', `${item.slug}, ${percent.toFixed(1)} percent, ${formatter(item.value)}`); segment.onclick = () => select(item, index); bar.append(segment);
      const key = document.createElement('button'); key.type = 'button'; key.className = 'chart-key'; key.dataset.index = String(index); key.setAttribute('aria-pressed', 'false'); key.innerHTML = `<i style="--segment-color:${color}"></i><span></span>`; key.querySelector('span').textContent = item.slug; key.onclick = () => select(item, index); legend.append(key);
    });
    detail.textContent = `${items.length} contributing commitment${items.length === 1 ? '' : 's'} · ${formatter(total)} total`;
  }
  section.append(bar, detail, legend); host.append(section);
}
function openSummaryCharts(focusChart) {
  const filtered = filteredGoals(), host = $('#summary-charts'); host.innerHTML = '';
  renderBreakdownChart(host, { id: 'today', title: 'Time to stay safe today', items: BeeDashboardSummary.workloadBreakdown(state.goals, true), formatter: BeeDashboardSummary.formatDuration });
  renderBreakdownChart(host, { id: 'filtered', title: 'Filtered workload', items: BeeDashboardSummary.workloadBreakdown(filtered), formatter: BeeDashboardSummary.formatDuration });
  renderBreakdownChart(host, { id: 'penalties', title: 'Penalties paid so far', items: BeeDashboardSummary.penaltyBreakdown(state.goals, BeeGoalStats.countDerails), formatter: value => `$${formatDailyRate(value)}` });
  els.summaryChartsDialog.showModal();
  host.querySelector(`[data-chart="${focusChart}"]`)?.scrollIntoView({ block: 'nearest' });
}
function setMode(mode) {
  state.mode = mode; localStorage.setItem('bee-mode', mode);
  $('#list-tab').classList.toggle('active', mode === 'list'); $('#timeline-tab').classList.toggle('active', mode === 'timeline');
  $('#stats-tab').classList.toggle('active', mode === 'stats');
  $('#list-tab').setAttribute('aria-selected', mode === 'list'); $('#timeline-tab').setAttribute('aria-selected', mode === 'timeline'); $('#stats-tab').setAttribute('aria-selected', mode === 'stats');
  if (mode === 'timeline') renderTimeline(); else closeDatapointTooltip();
  if (mode === 'stats') renderStats(true);
  updateAuthUI();
}
function statsDayLabel(daystamp) {
  const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8))));
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
function statsWeekday(daystamp) {
  const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8))));
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(date);
}
function renderStats(focusToday = false) {
  const host = $('#workload-chart'); if (!host) return;
  const today = todayDaystamp(state.timeZone);
  const series = BeeWorkloadHistory.workloadSeries(state.goals, today, 7, BeeProjection.projectedWorkloadDeadlineOffsets);
  const maximum = Math.max(1, ...series.map(item => Math.max(item.actual, item.predicted, item.upper || 0)));
  host.innerHTML = ''; host.style.setProperty('--history-days', series.length);
  const yAxis = $('#workload-y-axis'); yAxis.innerHTML = '';
  [1, .75, .5, .25, 0].forEach(fraction => { const tick = document.createElement('span'); tick.textContent = BeeDashboardSummary.formatCompactDuration(maximum * fraction); yAxis.append(tick); });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('workload-lines');
  svg.setAttribute('viewBox', `0 0 ${series.length * 22} 220`); svg.setAttribute('preserveAspectRatio', 'none');
  const points = key => series.map((item, index) => item[key] === null ? null : `${index * 22 + 11},${220 - item[key] / maximum * 220}`);
  ['upper', 'lower', 'mean'].forEach(key => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points(key).filter(Boolean).join(' ')); line.classList.add(key); svg.append(line);
  });
  host.append(svg);
  const detail = $('#workload-detail');
  series.forEach(item => {
    const weekday = statsWeekday(item.daystamp), weekend = ['Sat', 'Sun'].includes(weekday);
    const column = document.createElement('div'); column.className = `workload-day${item.today ? ' today' : ''}${weekend ? ' weekend' : ''}`;
    column.dataset.daystamp = item.daystamp;
    const amount = item.actual || item.predicted, bar = document.createElement('button'); bar.type = 'button';
    bar.className = `workload-bar ${item.predicted ? 'predicted' : 'actual'}`;
    bar.style.setProperty('--workload-height', `${amount / maximum * 100}%`);
    bar.title = `${statsDayLabel(item.daystamp)}: ${BeeDashboardSummary.formatDuration(amount)} ${item.predicted ? 'predicted' : 'recorded'}`;
    item.components.forEach(component => {
      const segment = document.createElement('i'); segment.style.cssText = `--segment-share:${amount ? component.minutes / amount * 100 : 0}%;--segment-hue:${BeeWorkloadHistory.goalHue(component.slug)}`; segment.title = `${component.slug}: ${BeeDashboardSummary.formatDuration(component.minutes)}`; bar.append(segment);
    });
    bar.onclick = () => {
      detail.innerHTML = ''; const heading = document.createElement('strong'); heading.textContent = `${weekday}, ${statsDayLabel(item.daystamp)} · ${BeeDashboardSummary.formatDuration(amount)}`; detail.append(heading);
      if (!item.components.length) { const empty = document.createElement('span'); empty.textContent = 'No configured workload.'; detail.append(empty); }
      item.components.slice().sort((a, b) => b.minutes - a.minutes).forEach(component => {
        const row = document.createElement('span'); row.className = 'workload-detail-row';
        const swatch = document.createElement('i'); swatch.style.setProperty('--segment-hue', BeeWorkloadHistory.goalHue(component.slug));
        const name = document.createElement('b'); name.textContent = component.slug;
        const duration = document.createElement('em'); duration.textContent = BeeDashboardSummary.formatDuration(component.minutes);
        row.append(swatch, name, duration); detail.append(row);
      });
    };
    const value = document.createElement('strong'); value.textContent = BeeDashboardSummary.formatCompactDuration(amount);
    const label = document.createElement('span'); label.textContent = `${weekday} ${statsDayLabel(item.daystamp)}`;
    column.append(value, bar, label); host.append(column);
  });
  if (focusToday) requestAnimationFrame(() => host.querySelector('.today')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}
function showDatapointTooltip(goal, daystamp, datapoints) {
  $('#datapoint-tooltip-title').textContent = `${goal.slug} · ${dayLabel(daystamp, daystamp === todayDaystamp(state.timeZone) ? 0 : 1)}`;
  const content = $('#datapoint-tooltip-content'); content.innerHTML = '';
  datapoints.forEach(point => {
    const entry = document.createElement('div'); entry.className = 'datapoint-detail';
    const value = document.createElement('strong'), derailed = isDerailDatapoint(point); entry.classList.toggle('derail', derailed); value.textContent = `${derailed ? 'Derailment' : 'Data entered'}${point.value === undefined || point.value === null ? '' : ` · Value: ${point.value}`}`;
    const note = document.createElement('p'); note.textContent = point.comment?.trim() || 'No note for this entry.';
    entry.append(value, note); content.append(entry);
  });
  $('#datapoint-tooltip').hidden = false;
}
function closeDatapointTooltip() { $('#datapoint-tooltip').hidden = true; }
function renderTimeline() {
  const host = $('#timeline-scroll'); if (!host) return; host.innerHTML = '';
  const connected = isConnected();
  if (!connected) {
    const prompt = document.createElement('div'); prompt.className = 'timeline-prompt'; prompt.innerHTML = '<strong>Sign in to see your timeline</strong><span>Commitment history comes from your Beeminder datapoints.</span>';
    const button = document.createElement('button'); button.className = 'primary-button'; button.textContent = 'Sign in to Beeminder'; button.onclick = () => els.settingsDialog.showModal(); prompt.append(button); host.append(prompt); return;
  }
  $('#future-days').value = String(state.futureDays);
  const goals = state.goals, today = todayDaystamp(state.timeZone), offsets = Array.from({ length: state.futureDays + 15 }, (_, index) => state.futureDays - index);
  const projectedBySlug = new Map(goals.map(goal => [goal.slug, BeeProjection.projectedWorkloadDeadlineOffsets(goal, state.futureDays, today)]));
  const grid = document.createElement('div'); grid.className = 'history-grid'; grid.style.setProperty('--goal-count', Math.max(goals.length, 1));
  const corner = document.createElement('div'); corner.className = 'history-corner'; corner.textContent = 'Day'; grid.append(corner);
  goals.forEach(goal => { const cell = document.createElement('div'); cell.className = 'history-goal'; cell.title = goal.slug; const label = document.createElement('span'); label.textContent = goal.slug; cell.append(label); grid.append(cell); });
  offsets.forEach(offset => {
    const daystamp = shiftDaystamp(today, offset), label = document.createElement('div'); label.className = `history-day${offset === 0 ? ' today' : ''}`; label.textContent = dayLabel(daystamp, offset); grid.append(label);
    goals.forEach(goal => {
      const cell = document.createElement('div'); cell.className = `history-cell${offset === 0 ? ' today' : ''}`;
      const dayData = goal.datapoints.filter(point => point.daystamp === daystamp), hasData = dayData.length > 0;
      const projectedDeadlines = projectedBySlug.get(goal.slug);
      if (hasData) { const derailed = dayData.some(isDerailDatapoint), mark = document.createElement('button'); mark.type = 'button'; mark.className = `cell-mark ${derailed ? 'derail' : 'history'}`; mark.textContent = derailed ? '×' : ''; mark.setAttribute('aria-label', `${goal.slug}: ${derailed ? 'derailment' : `show ${dayData.length} data ${dayData.length === 1 ? 'entry' : 'entries'}`}`); mark.onclick = () => showDatapointTooltip(goal, daystamp, dayData); cell.append(mark); }
      else if (offset >= 0 && projectedDeadlines.has(offset)) { const mark = document.createElement('span'); mark.className = `cell-mark due${offset <= 1 ? ' urgent' : ''}`; mark.title = `${goal.slug}: projected minimum-action deadline`; cell.append(mark); }
      grid.append(cell);
    });
  });
  host.append(grid);
}
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); setTimeout(() => els.toast.classList.remove('show'), 1800); }
function openGoalEditor(slug) {
  const goal = state.goals.find(item => item.slug === slug); if (!goal) return;
  const legacy = BeeGoalMetadata.legacyTitleParts(goal.title);
  state.editingSlug = slug; $('#edit-goal-slug').textContent = slug; $('#edit-goal-title').value = goal.hasMetadata ? goal.title : legacy.title; $('#edit-goal-minutes').value = goal.minutesPerUnit ?? ''; $('#edit-goal-tags').value = (goal.hasMetadata ? goal.metadataTags : legacy.tags).join(', '); $('#edit-goal-fineprint').value = goal.fineprint;
  els.editDialog.showModal();
}
function openCalendarDialog(slug) {
  const goal = state.goals.find(item => item.slug === slug); if (!goal || !(Number(goal.minutesPerUnit) > 0)) return;
  const start = BeeGoogleCalendar.defaultStart(new Date(), state.timeZone), quantum = Math.abs(Number(goal.quantum));
  state.calendarSlug = slug; $('#calendar-goal-title').textContent = goal.slug; $('#calendar-date').value = start.date; $('#calendar-time').value = start.time;
  $('#calendar-duration').value = String(Math.max(1, Math.ceil(goal.minutesPerUnit * (Number.isFinite(quantum) && quantum > 0 ? quantum : 1))));
  els.calendarDialog.showModal();
}
function googleCalendarUrl() {
  const goal = state.goals.find(item => item.slug === state.calendarSlug); if (!goal) throw new Error('Choose a commitment first');
  return BeeGoogleCalendar.eventUrl({
    title: goal.slug,
    date: $('#calendar-date').value, time: $('#calendar-time').value, duration: $('#calendar-duration').value, timeZone: state.timeZone,
    details: `${goal.title}\n\n${urgency(goal).label}\nPrepared by Bee Today`
  });
}
async function saveGoalTitle() {
  const goal = state.goals.find(item => item.slug === state.editingSlug), user = localStorage.getItem('bee-user'), token = localStorage.getItem('bee-token');
  if (!goal || !user || !token) throw new Error('Connect to Beeminder before editing');
  const tags = $('#edit-goal-tags').value.split(',');
  const title = BeeGoalMetadata.serialize($('#edit-goal-title').value, $('#edit-goal-minutes').value, tags);
  if (title.length > 255) throw new Error(`Description and metadata are ${title.length - 255} characters too long`);
  const body = new URLSearchParams({ auth_token: token, title });
  const response = await fetch(`https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}/goals/${encodeURIComponent(goal.slug)}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
  if (!response.ok) throw new Error(`Beeminder could not save this description (${response.status})`);
  const updated = await response.json(), normalized = normalizeGoal({ ...goal, rawTitle: cleanText(updated.title || title), fineprint: updated.fineprint ?? goal.fineprint }); Object.assign(goal, normalized); persistGoals(); render();
}
function openDataEntry(slug) {
  if (state.usingSample) { toast('Connect to Beeminder to enter data'); return; }
  state.dataEntrySlug = slug;
  $('#data-goal-slug').textContent = slug;
  $('#data-value').value = '';
  $('#data-comment').value = '';
  $('#data-error').hidden = true;
  els.dataDialog.showModal();
  $('#data-value').focus();
}
function historyDateLabel(daystamp) {
  if (!/^\d{8}$/.test(daystamp || '')) return daystamp || 'Date unavailable';
  const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8))));
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
function openGoalHistory(slug) {
  const goal = state.goals.find(item => item.slug === slug);
  if (!goal) return;
  const entries = [...goal.datapoints].sort((a, b) =>
    String(b.daystamp || '').localeCompare(String(a.daystamp || '')) || Number(b.timestamp || 0) - Number(a.timestamp || 0)
  );
  $('#goal-history-title').textContent = goal.slug;
  $('#goal-history-summary').textContent = `${entries.length} data entr${entries.length === 1 ? 'y' : 'ies'}`;
  const list = $('#goal-history-list'); list.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('p'); empty.className = 'history-empty'; empty.textContent = 'No data entries yet.'; list.append(empty);
  }
  entries.forEach(point => {
    const entry = document.createElement('article'); entry.className = `history-entry${isDerailDatapoint(point) ? ' derail' : ''}`;
    const heading = document.createElement('div'); heading.className = 'history-entry-heading';
    const date = document.createElement('strong'); date.textContent = historyDateLabel(point.daystamp);
    const value = document.createElement('span'); value.textContent = `Value: ${point.value ?? '—'}`;
    heading.append(date, value); entry.append(heading);
    const comment = document.createElement('p'); comment.textContent = point.comment?.trim() || 'No comment'; comment.classList.toggle('empty-comment', !point.comment?.trim()); entry.append(comment);
    list.append(entry);
  });
  els.historyDialog.showModal();
}
async function createDatapoint() {
  const user = localStorage.getItem('bee-user'), token = localStorage.getItem('bee-token');
  const valueText = $('#data-value').value.trim(), value = Number(valueText);
  if (!user || !token) throw new Error('Connect to Beeminder before entering data');
  if (!state.dataEntrySlug) throw new Error('Choose a commitment first');
  if (!valueText || !Number.isFinite(value)) throw new Error('Enter a valid number');
  const body = new URLSearchParams({ auth_token: token, value: valueText });
  const comment = $('#data-comment').value.trim();
  if (comment) body.set('comment', comment);
  const response = await fetch(`https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}/goals/${encodeURIComponent(state.dataEntrySlug)}/datapoints.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to enter data' : `Beeminder could not add this data (${response.status})`);
  return response.json();
}
async function refreshSubmittedGoal(slug, datapoint) {
  const user = localStorage.getItem('bee-user'), token = localStorage.getItem('bee-token');
  const goal = state.goals.find(item => item.slug === slug);
  if (!user || !token || !goal) throw new Error('Could not refresh the completed commitment');
  const params = new URLSearchParams({ auth_token: token, datapoints: 'true', _: String(Date.now()) });
  const response = await fetch(`https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}/goals/${encodeURIComponent(slug)}.json?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not refresh safety days (${response.status})`);
  const updated = await response.json();
  const datapoints = Array.isArray(updated.datapoints) ? updated.datapoints
    : goal.datapoints.some(point => point.id && point.id === datapoint?.id)
      ? goal.datapoints
      : [datapoint, ...goal.datapoints].filter(Boolean);
  Object.assign(goal, normalizeGoal({
    ...goal,
    rawTitle: updated.title || goal.rawTitle,
    fineprint: updated.fineprint ?? goal.fineprint,
    safebuf: Number.isFinite(updated.safebuf) ? updated.safebuf : goal.safebuf,
    rate: updated.rate ?? goal.rate,
    runits: updated.runits ?? goal.runits,
    quantum: updated.quantum ?? goal.quantum,
    curval: updated.curval ?? goal.curval,
    yaw: updated.yaw ?? goal.yaw,
    fullroad: updated.fullroad ?? goal.fullroad,
    datapoints,
    doneToday: true,
    updated: 0
  }));
  persistGoals();
}
let refreshPromise = null;
async function refreshGoals({ announce = false } = {}) {
  if (state.usingSample) return;
  const user = localStorage.getItem('bee-user'), token = localStorage.getItem('bee-token');
  if (!user || !token) return;
  if (refreshPromise) return refreshPromise;

  const label = $('#updated-label');
  label.textContent = 'Refreshing…';
  refreshPromise = (async () => {
    try {
      const params = new URLSearchParams({
        auth_token: token,
        associations: 'true',
        // Keep fullroad so forecasts follow scheduled road changes. All
        // datapoints are required to count derail markers since the goal began.
        _: String(Date.now())
      });
      const url = `https://www.beeminder.com/api/v1/users/${encodeURIComponent(user)}.json?${params}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to refresh' : `Refresh failed (${response.status})`);
      const data = await response.json();
      const timeZone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      state.timeZone = timeZone;
      localStorage.setItem('bee-timezone', timeZone);
      state.goals = (data.goals || []).map(goal => normalizeGoal({
        slug: goal.slug, title: goal.title || goal.slug, fineprint: goal.fineprint || '',
        safebuf: Number.isFinite(goal.safebuf) ? goal.safebuf : 99,
        rate: goal.rate, runits: goal.runits, quantum: goal.quantum, curval: goal.curval, yaw: goal.yaw, fullroad: goal.fullroad, kyoom: goal.kyoom, aggday: goal.aggday, pledge: goal.pledge,
        datapoints: goal.datapoints || [], doneToday: hasDataToday(goal.datapoints, timeZone),
        updated: Date.now() / 60000 - (goal.updated_at || 0) / 60
      }));
      persistGoals();
      localStorage.setItem('bee-last-refresh', String(Date.now()));
      label.textContent = 'Updated just now';
      render();
      if (announce) toast('Goals refreshed');
    } catch (error) {
      label.textContent = navigator.onLine ? 'Could not refresh · tap gear' : 'Offline · showing saved data';
      if (announce) toast(error.message);
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
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

els.search.oninput = event => { state.query = event.target.value; render(); };
els.clear.onclick = () => { state.query = ''; render(); };
els.safeDays.oninput = event => { state.maxSafeDays = event.target.value; render(); };
els.sort.onchange = event => { state.sort = event.target.value; render(); };
$('#reset-filters').onclick = () => { state.query = ''; state.tagFilters = {}; state.maxSafeDays = ''; state.forecastOffsets = []; state.sort = 'urgency'; render(); };
async function copyAccountabilityExport(button, messageFactory, emptyMessage) {
  const originalText = button.querySelector('strong').textContent;
  button.disabled = true; button.querySelector('strong').textContent = 'Preparing…';
  try {
    await refreshGoals();
    const message = messageFactory();
    if (!message) { toast(emptyMessage); return; }
    await copyText(message);
    els.accountabilityDialog.close();
    toast('Accountability update copied');
  } catch (error) {
    toast(error.message || 'Could not copy update');
  } finally {
    button.disabled = false; button.querySelector('strong').textContent = originalText;
  }
}
$('#accountability-button').onclick = () => els.accountabilityDialog.showModal();
$('#accountability-dialog-close').onclick = () => els.accountabilityDialog.close();
$('#goal-history-close').onclick = () => els.historyDialog.close();
$('#summary-charts-close').onclick = () => els.summaryChartsDialog.close();
document.querySelectorAll('.summary-trigger').forEach(button => button.onclick = () => openSummaryCharts(button.dataset.chart));
$('#edit-goal-close').onclick = () => els.editDialog.close();
$('#copy-today-option').onclick = event => copyAccountabilityExport(
  event.currentTarget, todayAccountabilityMessage, 'No Beeminder entries today'
);
$('#copy-commitments-option').onclick = event => copyAccountabilityExport(
  event.currentTarget, () => BeeAccountability.commitmentsMessage(state.goals), 'No commitments to copy'
);
$('#settings-button').onclick = () => { $('#username').value = localStorage.getItem('bee-user') || ''; $('#auth-token').value = localStorage.getItem('bee-token') || ''; els.settingsDialog.showModal(); };
$('#timeline-settings').onclick = $('#settings-button').onclick;
$('#list-tab').onclick = () => setMode('list');
$('#timeline-tab').onclick = () => setMode('timeline');
$('#stats-tab').onclick = () => setMode('stats');
$('#stats-settings').onclick = $('#settings-button').onclick;
$('#future-days').onchange = event => { state.futureDays = Number(event.target.value); localStorage.setItem('bee-future-days', String(state.futureDays)); closeDatapointTooltip(); renderTimeline(); };
$('#datapoint-tooltip-close').onclick = closeDatapointTooltip;
$('#data-dialog-close').onclick = () => els.dataDialog.close();
$('#calendar-dialog-close').onclick = () => els.calendarDialog.close();
$('#empty-connect').onclick = () => els.settingsDialog.showModal();
$('#auth-gate-button').onclick = () => els.settingsDialog.showModal();
$('#edit-goal-form').onsubmit = async event => { event.preventDefault(); const button = $('#save-goal-button'); button.disabled = true; button.textContent = 'Saving…'; try { await saveGoalTitle(); els.editDialog.close(); toast('Commitment saved to Beeminder'); } catch (error) { toast(error.message); } finally { button.disabled = false; button.textContent = 'Save commitment to Beeminder'; } };
$('#calendar-form').onsubmit = event => {
  event.preventDefault();
  try {
    const url = googleCalendarUrl();
    sessionStorage.setItem('bee-calendar-return-scroll', String(scrollY));
    location.href = url;
  } catch (error) { toast(error.message); }
};
$('#data-entry-form').onsubmit = async event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const button = $('#save-data-button'), error = $('#data-error');
  button.disabled = true; button.textContent = 'Adding…'; error.hidden = true;
  try {
    const slug = state.dataEntrySlug;
    const datapoint = await createDatapoint();
    BeeGoalChecklist.clear(localStorage, checklistUsername(), slug);
    const submittedGoal = state.goals.find(item => item.slug === slug);
    if (submittedGoal) {
      submittedGoal.doneToday = true;
      if (!submittedGoal.datapoints.some(point => point.id && point.id === datapoint?.id)) submittedGoal.datapoints.unshift(datapoint);
      state.refreshingSafetySlug = slug;
      persistGoals(); render();
    }
    let safetyRefreshed = true;
    try {
      await refreshSubmittedGoal(slug, datapoint);
    } catch (refreshError) {
      safetyRefreshed = false;
      refreshGoals().catch(() => {});
    }
    state.refreshingSafetySlug = null;
    render();
    els.dataDialog.close();
    toast(safetyRefreshed ? 'Data added to Beeminder' : 'Data added · safety days are still refreshing');
  } catch (caught) {
    error.textContent = caught.message || 'Could not add data'; error.hidden = false;
    return;
  } finally {
    button.disabled = false; button.textContent = 'Add data to Beeminder';
  }
};
$('#settings-form').onsubmit = async event => {
  if (event.submitter.value === 'cancel') return; event.preventDefault(); const user = $('#username').value.trim(), token = $('#auth-token').value.trim();
  if (!user || !token) { toast('Enter username and token'); return; }
  localStorage.setItem('bee-user', user); localStorage.setItem('bee-token', token); $('#connect-button').textContent = 'Connecting…';
  try {
    state.usingSample = false;
    await refreshGoals({ announce: true });
    els.settingsDialog.close();
  } catch (error) { toast(error.message); } finally { $('#connect-button').textContent = 'Connect & refresh'; }
};
$('#disconnect-button').onclick = () => { localStorage.removeItem('bee-user'); localStorage.removeItem('bee-token'); localStorage.removeItem('bee-goals'); state.goals = []; state.usingSample = false; $('#updated-label').textContent = 'Not connected'; els.settingsDialog.close(); render(); toast('Signed out on this device'); };
if (IS_LOCAL_TEST) $('#sample-button').hidden = false;
$('#sample-button').onclick = () => { if (!IS_LOCAL_TEST) return; state.usingSample = true; state.goals = createSampleGoals(); $('#updated-label').textContent = 'Local test data'; els.settingsDialog.close(); render(); toast('Showing local test data'); };
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
$('#version-label').textContent = `Version ${APP_VERSION}`; $('#update-button').onclick = checkForUpdates; window.addEventListener('load', checkForUpdates); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdates(); });
loadLocalGoals();
setMode(state.mode);
const calendarReturnScroll = sessionStorage.getItem('bee-calendar-return-scroll');
if (calendarReturnScroll !== null) {
  sessionStorage.removeItem('bee-calendar-return-scroll');
  requestAnimationFrame(() => scrollTo(0, Number(calendarReturnScroll) || 0));
}
// Refresh on every launch, return from the iOS background, restored page, and
// network reconnection. The interval also prevents a long-open app going stale.
refreshGoals().catch(() => {});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshGoals().catch(() => {});
});
window.addEventListener('pageshow', () => refreshGoals().catch(() => {}));
window.addEventListener('online', () => refreshGoals().catch(() => {}));
setInterval(() => {
  if (document.visibilityState === 'visible') refreshGoals().catch(() => {});
}, AUTO_REFRESH_INTERVAL_MS);
renderWorkdayCountdown();
setInterval(() => { if (document.visibilityState === 'visible') renderWorkdayCountdown(); }, 1000);
if (IS_LOCAL_TEST && TEST_PARAMS.get('tooltip') === '1') {
  const goal = state.goals.find(item => item.datapoints.length);
  if (goal) showDatapointTooltip(goal, goal.datapoints[0].daystamp, goal.datapoints.filter(point => point.daystamp === goal.datapoints[0].daystamp));
}
