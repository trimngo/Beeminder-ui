(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoalMetadata = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function normalizeTags(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(tag => String(tag).replace(/^#/, '').trim()).filter(Boolean))];
  }

  function legacyTitleParts(title) {
    const raw = String(title || '');
    const tags = [...raw.matchAll(/#([\w-]+)/g)].map(match => match[1]);
    return { title: raw.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim(), tags: normalizeTags(tags) };
  }

  function metadataEnd(rawTitle) {
    if (!rawTitle.startsWith('{')) return -1;
    let depth = 0, inString = false, escaped = false;
    for (let index = 0; index < rawTitle.length; index += 1) {
      const character = rawTitle[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
      } else if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}' && --depth === 0) return index;
    }
    return -1;
  }

  function parse(rawTitle = '') {
    const raw = String(rawTitle).trim(), end = metadataEnd(raw);
    if (end < 0) return { rawTitle: raw, title: raw, minutes: null, tags: [], hasMetadata: false };
    try {
      const metadata = JSON.parse(raw.slice(0, end + 1));
      if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') throw new Error('Not goal metadata');
      const hasMinutes = hasOwn(metadata, 'm') || hasOwn(metadata, 'minutes');
      const hasTags = hasOwn(metadata, 't') || hasOwn(metadata, 'tags');
      if (!hasMinutes && !hasTags) throw new Error('Not goal metadata');
      const rawMinutes = hasOwn(metadata, 'm') ? metadata.m : metadata.minutes;
      const rawTags = hasOwn(metadata, 't') ? metadata.t : metadata.tags;
      const minutes = rawMinutes === null || rawMinutes === '' || rawMinutes === undefined ? null : Number(rawMinutes);
      if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) throw new Error('Invalid minutes');
      if (hasTags && !Array.isArray(rawTags)) throw new Error('Invalid tags');
      const title = raw.slice(end + 1).trim();
      if (!title) throw new Error('Missing description');
      return { rawTitle: raw, title, minutes, tags: normalizeTags(rawTags), hasMetadata: true };
    } catch {
      return { rawTitle: raw, title: raw, minutes: null, tags: [], hasMetadata: false };
    }
  }

  function serialize(title, minutes, tags) {
    const description = String(title || '').trim();
    if (!description) throw new Error('Enter a description');
    const numericMinutes = minutes === null || minutes === undefined || minutes === '' ? null : Number(minutes);
    if (numericMinutes !== null && (!Number.isFinite(numericMinutes) || numericMinutes <= 0)) throw new Error('Minutes per unit must be greater than zero');
    const normalizedTags = normalizeTags(tags), metadata = {};
    if (numericMinutes !== null) metadata.m = numericMinutes;
    if (normalizedTags.length) metadata.t = normalizedTags;
    return Object.keys(metadata).length ? `${JSON.stringify(metadata)} ${description}` : description;
  }

  return { parse, serialize, normalizeTags, legacyTitleParts };
}));
