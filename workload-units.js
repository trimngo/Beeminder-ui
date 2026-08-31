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

  function enteredUnitsOnDay(goal, daystamp) {
    return (Array.isArray(goal?.datapoints) ? goal.datapoints : []).reduce((total, point) => {
      const value = Number(point?.value);
      return point?.daystamp === daystamp && Number.isFinite(value) && value > 0 ? total + value : total;
    }, 0);
  }

  function remainingUnitsForWorkBlock(goal) {
    return Math.max(0, unitsForWorkBlock(goal) - Math.max(0, Number(goal?.todayUnits) || 0));
  }

  function minutesForRemainingWorkBlock(goal) {
    const minutes = Number(goal?.minutesPerUnit);
    return Number.isFinite(minutes) && minutes > 0 ? minutes * remainingUnitsForWorkBlock(goal) : 0;
  }

  function isWorkBlockComplete(goal, daystamp) {
    const points = (Array.isArray(goal?.datapoints) ? goal.datapoints : []).filter(point => point?.daystamp === daystamp);
    if (!(dailyTarget(goal) > 0) || goal?.kyoom === false) return points.length > 0;
    return enteredUnitsOnDay(goal, daystamp) + Number.EPSILON >= unitsForWorkBlock(goal);
  }

  return { dailyTarget, unitsForWorkBlock, minutesForWorkBlock, enteredUnitsOnDay, remainingUnitsForWorkBlock, minutesForRemainingWorkBlock, isWorkBlockComplete };
}));
