(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoalChecklist = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STORAGE_KEY = 'bee-checklists-v1';

  function parse(description = '') {
    const items = [], descriptionLines = [];
    String(description).split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*[-*]\s+\[[ xX]\]\s+(.+?)\s*$/);
      if (match) items.push(match[1]);
      else descriptionLines.push(line);
    });
    return {
      description: descriptionLines.join('\n').replace(/^\s*\n|\n\s*$/g, '').trim(),
      items,
      signature: JSON.stringify(items)
    };
  }

  function readAll(storage) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  function recordKey(username, slug) { return `${username || 'local'}/${slug}`; }

  function checkedItems(storage, username, slug, signature) {
    const all = readAll(storage), key = recordKey(username, slug), record = all[key];
    if (!record || record.signature !== signature || !Array.isArray(record.checked)) {
      if (record) { delete all[key]; storage.setItem(STORAGE_KEY, JSON.stringify(all)); }
      return [];
    }
    return record.checked.filter(index => Number.isInteger(index) && index >= 0);
  }

  function setChecked(storage, username, slug, signature, checked) {
    const all = readAll(storage), key = recordKey(username, slug);
    all[key] = { signature, checked: [...new Set(checked)].sort((a, b) => a - b) };
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function clear(storage, username, slug) {
    const all = readAll(storage); delete all[recordKey(username, slug)];
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  return { parse, checkedItems, setChecked, clear, STORAGE_KEY };
}));
