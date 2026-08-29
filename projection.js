(function exposeProjection(root, factory) {
  const projection = factory();
  if (typeof module === 'object' && module.exports) module.exports = projection;
  else root.BeeProjection = projection;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function shiftDaystamp(daystamp, days) {
    const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8)) + days));
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  }
  function dailyRate(goal) {
    const unitDays = { h: 1 / 24, d: 1, w: 7, m: 30.4375, y: 365.25 };
    const rate = Number(goal.rate), days = unitDays[goal.runits] || 1;
    return Number.isFinite(rate) ? rate / days : 0;
  }
  function estimatedActionValue(goal, today) {
    const start = shiftDaystamp(today, -29);
    const values = (goal.datapoints || []).filter(point => point.daystamp >= start && point.daystamp <= today)
      .map(point => Number(point.value)).filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (values.length) {
      const middle = Math.floor(values.length / 2);
      return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    }
    const quantum = Math.abs(Number(goal.quantum));
    return Number.isFinite(quantum) && quantum > 0 ? quantum : 1;
  }
  function projectedDeadlineOffsetsForAction(goal, horizon, action) {
    const first = Math.max(0, Math.floor(Number(goal.safebuf) || 0));
    const offsets = [first], target = dailyRate(goal);
    // Recurring do-less projections require a different model.
    if (!(target > 0)) return new Set(offsets);
    let previous = first;
    for (let actionNumber = 1; ; actionNumber += 1) {
      // Preserve the fractional cadence: five one-unit actions then naturally
      // spread across seven days instead of being rounded to every day.
      const projected = first + Math.floor(actionNumber * action / target);
      const offset = Math.max(previous + 1, projected);
      if (offset > horizon) break;
      offsets.push(offset); previous = offset;
    }
    return new Set(offsets);
  }
  function roadDailyRate(goal, daystamp) {
    const rows = Array.isArray(goal.fullroad) ? goal.fullroad : [];
    if (!rows.length || !/^\d{8}$/.test(daystamp || '')) return dailyRate(goal);
    const timestamp = Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8))) / 1000;
    const row = rows.find(item => Array.isArray(item) && Number(item[0]) >= timestamp) || rows[rows.length - 1];
    const rate = Number(row?.[2]);
    if (!Number.isFinite(rate)) return dailyRate(goal);
    return dailyRate({ rate, runits: goal.runits });
  }
  function projectedRoadDeadlineOffsets(goal, horizon, today, action = 1) {
    const first = Math.max(0, Math.floor(Number(goal.safebuf) || 0));
    const offsets = [first];
    if (!(dailyRate(goal) > 0) || !/^\d{8}$/.test(today || '')) return new Set(offsets);
    let required = 0, nextAction = action;
    for (let offset = first + 1; offset <= horizon; offset += 1) {
      required += Math.max(0, roadDailyRate(goal, shiftDaystamp(today, offset)));
      if (required + Number.EPSILON >= nextAction) {
        offsets.push(offset);
        while (required + Number.EPSILON >= nextAction) nextAction += action;
      }
    }
    return new Set(offsets);
  }
  function projectedDeadlineOffsets(goal, horizon, today) {
    return projectedDeadlineOffsetsForAction(goal, horizon, estimatedActionValue(goal, today));
  }
  function projectedWorkloadDeadlineOffsets(goal, horizon, today) {
    // Workload metadata defines the time for an input of 1. Beeminder's
    // quantum is datapoint precision (often 0.01), not a normal work session.
    return projectedRoadDeadlineOffsets(goal, horizon, today, 1);
  }
  return { dailyRate, estimatedActionValue, roadDailyRate, projectedDeadlineOffsets, projectedRoadDeadlineOffsets, projectedWorkloadDeadlineOffsets };
}));
