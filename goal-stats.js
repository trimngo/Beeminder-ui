(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoalStats = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PLEDGE_LEVELS = [0, 5, 10, 30, 90, 270, 810];

  function isRecordedDerail(point) {
    const comment = String(point?.comment || '');
    return Boolean(point?.is_derail || point?.derail || /^#?DERAIL\b/i.test(comment.trim()));
  }

  function countDerails(datapoints) {
    return Array.isArray(datapoints) ? datapoints.filter(isRecordedDerail).length : 0;
  }

  // The API exposes the current pledge, not historical charges. Reconstruct the
  // standard pledge ladder when possible; return null rather than inventing a
  // dollar total when stepdowns, custom contracts, or restarts make it ambiguous.
  function estimatedPaid(derails, currentPledge) {
    const count = Number(derails), pledge = Number(currentPledge);
    const currentIndex = PLEDGE_LEVELS.indexOf(pledge);
    if (!Number.isInteger(count) || count < 0 || currentIndex < 0) return null;
    if (count <= currentIndex) {
      return PLEDGE_LEVELS.slice(currentIndex - count, currentIndex).reduce((sum, amount) => sum + amount, 0);
    }
    if (currentIndex !== PLEDGE_LEVELS.length - 1) return null;
    const ladderTotal = PLEDGE_LEVELS.slice(0, currentIndex).reduce((sum, amount) => sum + amount, 0);
    return ladderTotal + (count - currentIndex) * pledge;
  }

  return { countDerails, estimatedPaid, isRecordedDerail };
}));
