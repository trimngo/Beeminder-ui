(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoalFilters = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function safeDaysAtMost(goal, maximum) {
    if (maximum === null || maximum === undefined || maximum === '') return true;
    const limit = Number(maximum), safeDays = Number(goal.safebuf);
    return Number.isFinite(limit) && Number.isFinite(safeDays) && safeDays <= limit;
  }

  function compareMinutesPerUnit(a, b, direction = 'asc') {
    const aMinutes = Number(a.minutesPerUnit), bMinutes = Number(b.minutesPerUnit);
    const aMissing = a.minutesPerUnit === null || a.minutesPerUnit === undefined || !Number.isFinite(aMinutes);
    const bMissing = b.minutesPerUnit === null || b.minutesPerUnit === undefined || !Number.isFinite(bMinutes);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (aMissing) return String(a.slug || '').localeCompare(String(b.slug || ''));
    const result = aMinutes - bMinutes;
    return (direction === 'desc' ? -result : result) || String(a.slug || '').localeCompare(String(b.slug || ''));
  }

  return { safeDaysAtMost, compareMinutesPerUnit };
}));
