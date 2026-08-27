(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeeGoogleCalendar = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function compactLocalDateTime(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Choose a valid date and time');
    return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;
  }

  function addMinutes(date, time, minutes) {
    const duration = Number(minutes);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duration must be greater than zero');
    const [year, month, day] = date.split('-').map(Number), [hour, minute] = time.split(':').map(Number);
    const end = new Date(Date.UTC(year, month - 1, day, hour, minute + Math.ceil(duration)));
    return {
      date: `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`,
      time: `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`
    };
  }

  function eventUrl({ title, date, time, duration, timeZone, details = '' }) {
    const end = addMinutes(date, time, duration);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: String(title || '').trim(),
      dates: `${compactLocalDateTime(date, time)}/${compactLocalDateTime(end.date, end.time)}`,
      details: String(details || '')
    });
    if (timeZone) params.set('ctz', timeZone);
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  return { addMinutes, eventUrl };
}));
