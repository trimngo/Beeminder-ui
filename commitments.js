(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeCommitments = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = 1;
  const MARKER = '[bee-commit:v1]';
  const STATES = ['unlogged', 'completed', 'snoozed', 'missed'];

  function newConfig() { return { version: VERSION, commitments: [] }; }
  function normalize(config) {
    const source = config && Number(config.version) === VERSION ? config : newConfig();
    return { version: VERSION, commitments: (source.commitments || []).map(item => ({
      id: String(item.id || ''), name: String(item.name || 'Untitled'),
      days: Array.isArray(item.days) ? item.days.filter(day => Number.isInteger(day) && day >= 0 && day <= 6) : [0, 1, 2, 3, 4, 5, 6],
      deadline: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.deadline) ? item.deadline : '21:00',
      strict: Boolean(item.strict), unlockSecret: item.strict ? String(item.unlockSecret || '') : ''
    })) };
  }
  function toBase64(value) { return typeof Buffer !== 'undefined' ? Buffer.from(value, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(value))); }
  function fromBase64(value) { return typeof Buffer !== 'undefined' ? Buffer.from(value, 'base64').toString('utf8') : decodeURIComponent(escape(atob(value))); }
  function compact(config) {
    const normalized = normalize(config);
    return { v: VERSION, c: normalized.commitments.map(item => [item.id, item.name, item.days.reduce((mask, day) => mask | (1 << day), 0), item.deadline.replace(':', ''), item.strict ? 1 : 0, item.unlockSecret || '']) };
  }
  function expand(value) {
    if (!value || value.v !== VERSION || !Array.isArray(value.c)) return value;
    return { version: VERSION, commitments: value.c.map(row => ({ id: row[0], name: row[1], days: [0, 1, 2, 3, 4, 5, 6].filter(day => Number(row[2]) & (1 << day)), deadline: `${String(row[3]).padStart(4, '0').slice(0, 2)}:${String(row[3]).padStart(4, '0').slice(2)}`, strict: row[4] === 1, unlockSecret: row[5] || '' })) };
  }
  function encode(config) { return `${MARKER}${toBase64(JSON.stringify(compact(config))).replace(/=+$/g, '')}`; }
  function decode(text) {
    const start = String(text || '').indexOf(MARKER); if (start < 0) return null;
    const raw = String(text).slice(start + MARKER.length).trim().split(/\s/)[0];
    try { return normalize(expand(JSON.parse(fromBase64(raw.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; }
  }
  function isDue(commitment, date) { return commitment.days.includes(date.getDay()); }
  function effectiveState(log, commitment, now) {
    const value = log?.[commitment.id];
    if (STATES.includes(value) && value !== 'unlogged') return value;
    const [hour, minute] = commitment.deadline.split(':').map(Number);
    const deadline = new Date(now); deadline.setHours(hour, minute, 0, 0);
    return now > deadline ? 'missed' : 'unlogged';
  }
  function aggregate(config, log, now = new Date()) {
    const due = normalize(config).commitments.filter(item => isDue(item, now));
    const states = due.map(item => ({ item, state: effectiveState(log, item, now) }));
    const counts = Object.fromEntries(STATES.map(state => [state, states.filter(row => row.state === state).length]));
    const strictFailure = states.some(row => row.item.strict && row.state === 'missed');
    const successful = counts.completed + counts.snoozed;
    return { due: due.length, successful, score: strictFailure ? 0 : (due.length ? successful / due.length : 1), strictFailure, counts, states };
  }
  function comment(daystamp, summary) {
    const details = summary.states.map(row => `${row.item.id}:${row.state}`).join(',');
    return `bee-commit/v1 date=${daystamp} completed=${summary.counts.completed} snoozed=${summary.counts.snoozed} missed=${summary.counts.missed} unlogged=${summary.counts.unlogged} strict_failure=${summary.strictFailure ? 1 : 0} | ${details}`;
  }
  function requestId(daystamp) { return `bee-commit-v1-${daystamp}`; }
  return { VERSION, MARKER, STATES, newConfig, normalize, encode, decode, isDue, effectiveState, aggregate, comment, requestId };
});
