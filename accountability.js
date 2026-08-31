(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeAccountability = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const WEEKS_PER_UNIT = { h: 1 / 168, d: 1 / 7, w: 1, m: 30.4375 / 7, y: 365.25 / 7 };

  function formatNumber(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }

  function withoutHashtags(text) {
    return String(text || '').replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim();
  }

  function formatGoalRate(goal) {
    if (goal?.rate === null || goal?.rate === undefined || goal?.rate === '') return 'Rate unavailable';
    const rate = Number(goal?.rate);
    if (!Number.isFinite(rate)) return 'Rate unavailable';
    const weeksPerUnit = WEEKS_PER_UNIT[goal.runits];
    if (!weeksPerUnit) return 'Rate unavailable';
    const weeklyRate = rate / weeksPerUnit;
    if (weeklyRate === 0 || Math.abs(weeklyRate) >= 1) {
      const times = Math.abs(weeklyRate) === 1 ? 'time' : 'times';
      return `${formatNumber(weeklyRate)} ${times} per week`;
    }
    if (Math.abs(weeklyRate) >= 0.5) {
      const biweeklyRate = weeklyRate * 2;
      const times = Math.abs(biweeklyRate) === 1 ? 'time' : 'times';
      return `${formatNumber(biweeklyRate)} ${times} per 2 weeks`;
    }
    const weekInterval = 1 / Math.abs(weeklyRate);
    return `${weeklyRate < 0 ? '-1' : '1'} time per ${formatNumber(weekInterval)} weeks`;
  }

  function commitmentsMessage(goals) {
    if (!Array.isArray(goals) || !goals.length) return '';
    const items = goals.map((goal, index) => {
      const description = withoutHashtags(goal.title) || goal.slug;
      return `${index + 1}. ${goal.slug} — ${description}\n   Rate: ${formatGoalRate(goal)}`;
    });
    return `My commitments:\n\n${items.join('\n\n')}`;
  }

  function todayWinsMessage(goals, today) {
    const completed = (Array.isArray(goals) ? goals : []).filter(goal =>
      (Array.isArray(goal.datapoints) ? goal.datapoints : []).some(point => point.daystamp === today)
    );
    if (!completed.length) return '';
    const items = completed.map((goal, index) => {
      const messages = goal.datapoints
        .filter(point => point.daystamp === today && point.comment?.trim())
        .flatMap(point => point.comment.split(/\r?\n|\\n/).map(line => line.trim()).filter(Boolean));
      const logs = messages.length ? `\n${messages.map(message => `   - ${message}`).join('\n')}` : '';
      return `${index + 1}. ${goal.slug} — ${goal.title}${logs}`;
    });
    return `Today’s wins\n\n${items.join('\n\n')}`;
  }

  return { formatGoalRate, commitmentsMessage, todayWinsMessage, withoutHashtags };
}));
