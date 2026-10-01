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

  return { DEFAULT_EXCLUSIONS, parseExclusions, excludedTerm, isExcluded, sumIncludedValues };
}));
