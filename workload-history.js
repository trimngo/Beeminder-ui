(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeWorkloadHistory = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function shiftDaystamp(daystamp, days) {
    const date = new Date(Date.UTC(Number(daystamp.slice(0, 4)), Number(daystamp.slice(4, 6)) - 1, Number(daystamp.slice(6, 8)) + days));
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function workloadSeries(goals, today, futureDays, projectOffsets) {
    const items = Array.isArray(goals) ? goals : [];
    const historical = new Map();
    items.forEach(goal => {
      const minutes = Number(goal.minutesPerUnit);
      if (!(minutes > 0)) return;
      (Array.isArray(goal.datapoints) ? goal.datapoints : []).forEach(point => {
        const value = Number(point.value);
        if (/^\d{8}$/.test(point.daystamp || '') && point.daystamp <= today && value > 0) {
          const components = historical.get(point.daystamp) || new Map();
          components.set(String(goal.slug || ''), (components.get(String(goal.slug || '')) || 0) + value * minutes);
          historical.set(point.daystamp, components);
        }
      });
    });
    const twoWeeksAgo = shiftDaystamp(today, -13);
    const earliestData = [...historical.keys()].sort()[0];
    const earliest = earliestData && earliestData < twoWeeksAgo ? earliestData : twoWeeksAgo;
    const result = [];
    for (let day = earliest, offset = 0; day <= today; day = shiftDaystamp(earliest, ++offset)) {
      const components = [...(historical.get(day) || new Map()).entries()].map(([slug, minutes]) => ({ slug, minutes }));
      result.push({ daystamp: day, actual: components.reduce((sum, item) => sum + item.minutes, 0), predicted: 0, components, today: day === today });
    }
    const predicted = Array.from({ length: Math.max(0, Number(futureDays) || 0) }, () => new Map());
    if (typeof projectOffsets === 'function') items.forEach(goal => {
      const minutes = Number(goal.minutesPerUnit);
      if (!(minutes > 0)) return;
      projectOffsets(goal, predicted.length, today).forEach(offset => {
        if (offset > 0 && offset <= predicted.length) predicted[offset - 1].set(String(goal.slug || ''), minutes);
      });
    });
    predicted.forEach((itemsForDay, index) => {
      const components = [...itemsForDay.entries()].map(([slug, minutes]) => ({ slug, minutes }));
      result.push({ daystamp: shiftDaystamp(today, index + 1), actual: 0, predicted: components.reduce((sum, item) => sum + item.minutes, 0), components, today: false });
    });
    result.forEach((item, index) => {
      if (item.daystamp > today) { item.mean = null; item.upper = null; item.lower = null; return; }
      const values = result.slice(Math.max(0, index - 6), index + 1).map(day => day.actual);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      item.mean = mean; item.upper = mean + Math.sqrt(variance); item.lower = Math.max(0, mean - Math.sqrt(variance));
    });
    return result;
  }

  return { workloadSeries, shiftDaystamp };
}));
