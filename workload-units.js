(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeWorkloadUnits = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DAYS_PER_UNIT = { h: 1 / 24, d: 1, w: 7, m: 30.4375, y: 365.25 };

  function dailyTarget(goal) {
    const rate = Number(goal?.rate), days = DAYS_PER_UNIT[goal?.runits] || 1;
    return Number.isFinite(rate) ? rate / days : 0;
  }

  // Workload metadata describes an input of 1. A commitment requiring several
  // units per day therefore needs a correspondingly larger daily work block.
  function unitsForWorkBlock(goal) {
    const target = dailyTarget(goal);
    return target > 1 ? target : 1;
  }

  function minutesForWorkBlock(goal) {
    const minutes = Number(goal?.minutesPerUnit);
    return Number.isFinite(minutes) && minutes > 0 ? minutes * unitsForWorkBlock(goal) : 0;
  }

  return { dailyTarget, unitsForWorkBlock, minutesForWorkBlock };
}));
