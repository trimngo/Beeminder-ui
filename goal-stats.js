(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoalStats = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DERAIL_COST = 5;

  function isRecordedDerail(point) {
    const comment = String(point?.comment || '');
    return Boolean(point?.is_derail || point?.derail || /^#?DERAIL\b/i.test(comment.trim()));
  }

  function countDerails(datapoints) {
    return Array.isArray(datapoints) ? datapoints.filter(isRecordedDerail).length : 0;
  }

  function totalPaid(derails) {
    const count = Number(derails);
    return Number.isInteger(count) && count >= 0 ? count * DERAIL_COST : null;
  }

  return { countDerails, totalPaid, isRecordedDerail };
}));
