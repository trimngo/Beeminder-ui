(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeAccountability = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const UNIT_NAMES = { h: 'hour', d: 'day', w: 'week', m: 'month', y: 'year' };

  function formatGoalRate(goal) {
    if (goal?.rate === null || goal?.rate === undefined || goal?.rate === '') return 'Rate unavailable';
    const rate = Number(goal?.rate);
    if (!Number.isFinite(rate)) return 'Rate unavailable';
    const unit = UNIT_NAMES[goal.runits] || goal.runits || 'day';
    const amount = new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(rate);
    const times = Math.abs(rate) === 1 ? 'time' : 'times';
    return `${amount} ${times} per ${unit}`;
  }

  function commitmentsMessage(goals) {
    if (!Array.isArray(goals) || !goals.length) return '';
    const items = goals.map((goal, index) =>
      `${index + 1}. ${goal.slug} — ${goal.title || goal.slug}\n   Rate: ${formatGoalRate(goal)}`
    );
    return `My commitments:\n\n${items.join('\n\n')}`;
  }

  return { formatGoalRate, commitmentsMessage };
}));
