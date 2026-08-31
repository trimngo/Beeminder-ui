(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoalSearch = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function queryTokens(query) {
    return String(query || '').match(/(?:[^\s"]+|"[^"]*")+/g)?.map(token => token.replace(/^"|"$/g, '').toLowerCase()) || [];
  }

  function goalTags(goal) {
    const source = goal.hasMetadata ? goal.metadataTags : [...String(goal.title || '').matchAll(/#([\w-]+)/g)].map(match => match[1]);
    return [...new Set((source || []).map(tag => String(tag).replace(/^#/, '').trim().toLowerCase()).filter(Boolean))];
  }

  function matchesGoalQuery(goal, query) {
    const tags = goalTags(goal);
    const haystack = `${goal.slug || ''} ${goal.title || ''} ${goal.fineprint || ''} ${tags.join(' ')}`.toLowerCase();
    return queryTokens(query).every(token => {
      const excluded = token.startsWith('-');
      const term = excluded ? token.slice(1) : token;
      let matched;
      if (term === 'done:today' || term === 'done') matched = Boolean(goal.doneToday);
      else if (term.startsWith('#')) matched = tags.includes(term.slice(1));
      else matched = haystack.includes(term);
      return excluded ? !matched : matched;
    });
  }

  return { queryTokens, goalTags, matchesGoalQuery };
}));
