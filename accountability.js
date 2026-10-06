(function (root, factory) {
  const units = typeof module === 'object' && module.exports ? require('./workload-units.js') : root.BeeWorkloadUnits;
  const api = factory(units);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeAccountability = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (WorkloadUnits) {
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

  function projectsDataExport(goals, context = {}, exportedAt = new Date().toISOString()) {
    if (!Array.isArray(goals) || !goals.length) return '';
    return JSON.stringify({
      format: 'bee-today-project-export',
      schemaVersion: 1,
      exportedAt,
      context: { timeZone: context.timeZone || null, complianceWindowDays: Number(context.complianceWindow) || null, complianceExclusions: Array.isArray(context.complianceExclusions) ? context.complianceExclusions : [] },
      projects: goals
    }, null, 2);
  }

  function projectName(slug) {
    const words = String(slug || 'Commitment').replace(/[-_]+/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  function planDuration(goal) {
    const minutes = Number(goal?.minutesPerUnit);
    if (!Number.isFinite(minutes) || minutes <= 0) return 'time not specified';
    const total = WorkloadUnits.minutesForRemainingWorkBlock(goal);
    if (total < 60) return `${formatNumber(total)} min`;
    return `${formatNumber(total / 60)} hr`;
  }

  function dailyPlanMessage(goals) {
    const due = (Array.isArray(goals) ? goals : []).filter(goal => !goal.doneToday && Number(goal.safebuf) <= 0);
    if (!due.length) return '';
    const items = due.map((goal, index) => {
      const description = withoutHashtags(goal.title) || projectName(goal.slug);
      return `${index + 1}. *${projectName(goal.slug)}* — ${description} — *${planDuration(goal)}*`;
    });
    return `*Today's plan*\n\n${items.join('\n')}`;
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

  return { formatGoalRate, commitmentsMessage, projectsDataExport, dailyPlanMessage, todayWinsMessage, withoutHashtags };
}));
