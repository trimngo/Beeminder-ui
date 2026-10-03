(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeCompliance = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_EXCLUSIONS = ['vacation'];

  function parseExclusions(value) {
    const source = Array.isArray(value) ? value : String(value || '').split(/[\n,]+/);
    return [...new Set(source.map(term => String(term).trim().toLocaleLowerCase()).filter(Boolean))];
  }

  function excludedTerm(point, exclusions = DEFAULT_EXCLUSIONS) {
    const comment = String(point?.comment || '').toLocaleLowerCase();
    return parseExclusions(exclusions).find(term => comment.includes(term)) || null;
  }

  function isExcluded(point, exclusions = DEFAULT_EXCLUSIONS) {
    return excludedTerm(point, exclusions) !== null;
  }

  function sumIncludedValues(datapoints, exclusions, startDaystamp, endDaystamp) {
    return (Array.isArray(datapoints) ? datapoints : []).reduce((result, point) => {
      if (startDaystamp && point?.daystamp < startDaystamp) return result;
      if (endDaystamp && point?.daystamp > endDaystamp) return result;
      if (isExcluded(point, exclusions)) { result.excluded += 1; return result; }
      const value = Number(point?.value);
      if (Number.isFinite(value)) result.total += value;
      return result;
    }, { total: 0, excluded: 0 });
  }

  function shiftDaystamp(daystamp, days) {
    if (!/^\d{8}$/.test(String(daystamp))) return null;
    const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8)) + days));
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function rollingPerformance(goal, endDaystamp, windowSize = 7, exclusions = DEFAULT_EXCLUSIONS) {
    const days = Number(windowSize);
    const unitDays = { h: 1 / 24, d: 1, w: 7, m: 30.4375, y: 365.25 };
    const rate = Number(goal?.rate), period = unitDays[goal?.runits] || 1;
    const dailyTarget = Number.isFinite(rate) ? rate / period : null;
    if (!goal?.kyoom || !Number.isInteger(days) || days < 1 || !Number.isFinite(dailyTarget) || dailyTarget === 0 || !shiftDaystamp(endDaystamp, 0)) {
      return { actual: null, target: dailyTarget, compliance: null, miss: null, excluded: 0 };
    }
    const startDaystamp = shiftDaystamp(endDaystamp, 1 - days);
    const result = sumIncludedValues(goal.datapoints, exclusions, startDaystamp, endDaystamp);
    const actual = result.total / days;
    const miss = dailyTarget > 0 ? (dailyTarget - actual) / Math.abs(dailyTarget) : (actual - dailyTarget) / Math.abs(dailyTarget);
    return { actual, target: dailyTarget, compliance: actual / dailyTarget, miss, excluded: result.excluded };
  }

  function rollingSeries(goal, startDaystamp, endDaystamp, windowSize = 7, exclusions = DEFAULT_EXCLUSIONS) {
    if (!shiftDaystamp(startDaystamp, 0) || !shiftDaystamp(endDaystamp, 0) || startDaystamp > endDaystamp) return [];
    const series = [];
    for (let daystamp = startDaystamp; daystamp <= endDaystamp; daystamp = shiftDaystamp(daystamp, 1)) {
      series.push({ daystamp, ...rollingPerformance(goal, daystamp, windowSize, exclusions) });
    }
    return series;
  }

  return { DEFAULT_EXCLUSIONS, parseExclusions, excludedTerm, isExcluded, sumIncludedValues, shiftDaystamp, rollingPerformance, rollingSeries };
}));
