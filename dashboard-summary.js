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

  return { estimatedMinutesToSafety, goalsMissingTimeToSafety, totalPenalties, formatDuration };
}));
