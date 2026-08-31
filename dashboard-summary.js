(function (root, factory) {
  const units = typeof module === 'object' && module.exports ? require('./workload-units.js') : root.BeeWorkloadUnits;
  const api = factory(units);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeDashboardSummary = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (WorkloadUnits) {
  function estimatedMinutesToSafety(goals) {
    return (Array.isArray(goals) ? goals : []).reduce((total, goal) => {
      if (goal.doneToday || Number(goal.safebuf) > 0) return total;
      const minutes = Number(goal.minutesPerUnit);
      if (!Number.isFinite(minutes) || minutes <= 0) return total;
      return total + WorkloadUnits.minutesForRemainingWorkBlock(goal);
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
      return total + WorkloadUnits.minutesForWorkBlock(goal);
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
      return [{ slug: String(goal.slug || ''), value: WorkloadUnits.minutesForRemainingWorkBlock(goal) }];
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
      const action = WorkloadUnits.unitsForWorkBlock(goal);
      projectOffsets(goal, dayCount - 1, today).forEach(offset => {
        if (offset >= 0 && offset < dayCount && !(offset === 0 && goal.doneToday)) {
          totals[offset] += offset === 0 ? WorkloadUnits.minutesForRemainingWorkBlock(goal) : minutes * action;
        }
      });
    });
    return totals;
  }

  function sevenDayCommitmentCounts(goals, today, projectOffsets, dayCount = 7) {
    const counts = Array.from({ length: dayCount }, () => 0);
    if (typeof projectOffsets !== 'function') return counts;
    (Array.isArray(goals) ? goals : []).forEach(goal => {
      projectOffsets(goal, dayCount - 1, today).forEach(offset => {
        if (offset >= 0 && offset < dayCount && !(offset === 0 && goal.doneToday)) counts[offset] += 1;
      });
    });
    return counts;
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

  function remainingWorkdaySeconds(now = new Date(), timeZone, endHour = 21) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    const elapsed = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
    return Math.max(0, endHour * 3600 - elapsed);
  }

  function formatCountdown(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(value / 3600), minutes = Math.floor(value % 3600 / 60), remainder = value % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function workdayCountdownStatus(seconds, workloadMinutes) {
    const remaining = Math.max(0, Number(seconds) || 0);
    const workload = Math.max(0, Number(workloadMinutes) || 0) * 60;
    if (remaining === 0) return 'expired';
    if (remaining <= workload) return 'critical';
    if (remaining <= workload + 3600) return 'danger';
    if (remaining <= workload + 7200) return 'warning';
    return 'safe';
  }

  function workdayProgress(seconds, workloadMinutes, startHour = 8, endHour = 21) {
    const total = Math.max(1, (endHour - startHour) * 3600);
    const remaining = Math.max(0, Math.min(total, Number(seconds) || 0));
    const required = Math.max(0, Math.min(total, (Number(workloadMinutes) || 0) * 60));
    return {
      remainingPercent: remaining / total * 100,
      elapsedPercent: (total - remaining) / total * 100,
      requiredPercent: required / total * 100,
      dangerPercent: Math.min(total, required + 3600) / total * 100,
      warningPercent: Math.min(total, required + 7200) / total * 100
    };
  }

  function workdayThresholds(workloadMinutes, startHour = 8, endHour = 21) {
    const start = startHour * 60, end = endHour * 60;
    const deadline = Math.max(start, end - Math.max(0, Number(workloadMinutes) || 0));
    return { warningTwoHours: Math.max(start, deadline - 120), warningOneHour: Math.max(start, deadline - 60), deadline };
  }

  function formatTimeOfDay(minutes) {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    const hour = Math.floor(value / 60) % 24, minute = value % 60;
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  }

  return { estimatedMinutesToSafety, goalsMissingTimeToSafety, estimatedMinutesForGoals, goalsMissingTime, workloadBreakdown, penaltyBreakdown, sevenDayWorkload, sevenDayCommitmentCounts, totalPenalties, formatDuration, formatCompactDuration, remainingWorkdaySeconds, formatCountdown, workdayCountdownStatus, workdayProgress, workdayThresholds, formatTimeOfDay };
}));
