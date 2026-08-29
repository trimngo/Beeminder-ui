(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeDashboardSummary = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function estimatedMinutesToSafety(goals) {
    return (Array.isArray(goals) ? goals : []).reduce((total, goal) => {
      if (goal.doneToday || Number(goal.safebuf) > 0) return total;
      const minutes = Number(goal.minutesPerUnit);
      if (!Number.isFinite(minutes) || minutes <= 0) return total;
      const quantum = Math.abs(Number(goal.quantum));
      return total + minutes * (Number.isFinite(quantum) && quantum > 0 ? quantum : 1);
    }, 0);
  }

  function goalsMissingTimeToSafety(goals) {
    return (Array.isArray(goals) ? goals : []).filter(goal =>
      !goal.doneToday && Number(goal.safebuf) <= 0 &&
      (!Number.isFinite(Number(goal.minutesPerUnit)) || Number(goal.minutesPerUnit) <= 0)
    ).length;
  }

  function estimatedMinutesForGoals(goals) {
    return (Array.isArray(goals) ? goals : []).reduce((total, goal) => {
      const minutes = Number(goal.minutesPerUnit);
      if (!Number.isFinite(minutes) || minutes <= 0) return total;
      const quantum = Math.abs(Number(goal.quantum));
      return total + minutes * (Number.isFinite(quantum) && quantum > 0 ? quantum : 1);
    }, 0);
  }

  function goalsMissingTime(goals) {
    return (Array.isArray(goals) ? goals : []).filter(goal =>
      !Number.isFinite(Number(goal.minutesPerUnit)) || Number(goal.minutesPerUnit) <= 0
    ).length;
  }

  function workloadBreakdown(goals, dueOnly = false) {
    return (Array.isArray(goals) ? goals : []).flatMap(goal => {
      if (dueOnly && (goal.doneToday || Number(goal.safebuf) > 0)) return [];
      const minutes = Number(goal.minutesPerUnit);
      if (!Number.isFinite(minutes) || minutes <= 0) return [];
      const quantum = Math.abs(Number(goal.quantum));
      return [{ slug: String(goal.slug || ''), value: minutes * (Number.isFinite(quantum) && quantum > 0 ? quantum : 1) }];
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value || a.slug.localeCompare(b.slug));
  }

  function penaltyBreakdown(goals, countDerails, derailCost = 5) {
    if (typeof countDerails !== 'function') return [];
    return (Array.isArray(goals) ? goals : []).map(goal => ({
      slug: String(goal.slug || ''), value: countDerails(goal.datapoints) * derailCost
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value || a.slug.localeCompare(b.slug));
  }

  function sevenDayWorkload(goals, today, projectOffsets, dayCount = 7) {
    const totals = Array.from({ length: dayCount }, () => 0);
    if (typeof projectOffsets !== 'function') return totals;
    (Array.isArray(goals) ? goals : []).forEach(goal => {
      const minutes = Number(goal.minutesPerUnit);
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      // A workload unit has to remain stable when a datapoint is added. Recent
      // datapoint values describe past behavior, not the size of the next
      // minimum action, so use Beeminder's quantum for both cadence and time.
      const quantum = Math.abs(Number(goal.quantum));
      const action = Number.isFinite(quantum) && quantum > 0 ? quantum : 1;
      if (!Number.isFinite(action) || action <= 0) return;
      projectOffsets(goal, dayCount - 1, today).forEach(offset => {
        if (offset >= 0 && offset < dayCount && !(offset === 0 && goal.doneToday)) totals[offset] += minutes * action;
      });
    });
    return totals;
  }

  function formatCompactDuration(minutes) {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return '0m';
    if (value < 60) return `${Math.round(value)}m`;
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value / 60)}h`;
  }

  function totalPenalties(goals, countDerails, derailCost = 5) {
    if (typeof countDerails !== 'function') return 0;
    return (Array.isArray(goals) ? goals : []).reduce((total, goal) =>
      total + countDerails(goal.datapoints) * derailCost, 0);
  }

  function formatDuration(minutes) {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return '0 min';
    if (value < 60) return `${Math.round(value)} min`;
    const hours = value / 60;
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(hours)} hr`;
  }

  return { estimatedMinutesToSafety, goalsMissingTimeToSafety, estimatedMinutesForGoals, goalsMissingTime, workloadBreakdown, penaltyBreakdown, sevenDayWorkload, totalPenalties, formatDuration, formatCompactDuration };
}));
