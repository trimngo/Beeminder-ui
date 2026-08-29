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
          historical.set(point.daystamp, (historical.get(point.daystamp) || 0) + value * minutes);
        }
      });
    });
    const earliest = [...historical.keys()].sort()[0] || today;
    const result = [];
    for (let day = earliest, offset = 0; day <= today; day = shiftDaystamp(earliest, ++offset)) {
      result.push({ daystamp: day, actual: historical.get(day) || 0, predicted: 0, today: day === today });
    }
    const predicted = Array.from({ length: Math.max(0, Number(futureDays) || 0) }, () => 0);
    if (typeof projectOffsets === 'function') items.forEach(goal => {
      const minutes = Number(goal.minutesPerUnit);
      if (!(minutes > 0)) return;
      projectOffsets(goal, predicted.length, today).forEach(offset => {
        if (offset > 0 && offset <= predicted.length) predicted[offset - 1] += minutes;
      });
    });
    predicted.forEach((minutes, index) => result.push({ daystamp: shiftDaystamp(today, index + 1), actual: 0, predicted: minutes, today: false }));
    return result;
  }

  return { workloadSeries, shiftDaystamp };
}));
