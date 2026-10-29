export const STORAGE_KEY = 'yoko-learning-v1';
const ids = new Set(Array.from({ length: 30 }, (_, i) => String(i + 1)));
const checks = new Set(['1', '10', '20', '30']);
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function cleanProgress(value) {
  const result = { completed: [], notes: {}, checks: {}, conditions: {} };
  if (!object(value)) return result;
  if (Array.isArray(value.completed)) result.completed = [...new Set(value.completed.filter(n => Number.isInteger(n) && n >= 1 && n <= 30))].sort((a,b)=>a-b);
  if (object(value.notes)) for (const [id, note] of Object.entries(value.notes)) if (ids.has(id) && typeof note === 'string') result.notes[id] = note.slice(0,5000);
  if (object(value.conditions)) for (const [id, text] of Object.entries(value.conditions)) if (checks.has(id) && typeof text === 'string') result.conditions[id] = text.slice(0,500);
  if (object(value.checks)) for (const [id, rows] of Object.entries(value.checks)) {
    if (!checks.has(id) || !object(rows)) continue;
    result.checks[id] = {};
    for (const [index, row] of Object.entries(rows)) {
      if (!/^[0-5]$/.test(index) || !object(row)) continue;
      const out = {};
      for (const key of ['first','repeat','reply']) {
        const options = key === 'repeat' ? ['','yes','no','unneeded'] : key === 'reply' ? ['','yes','assisted','no'] : ['','yes','partial','no'];
        out[key] = options.includes(row[key]) ? row[key] : '';
      }
      out.seconds = typeof row.seconds === 'number' && Number.isFinite(row.seconds) && row.seconds >= 0 && row.seconds <= 600 ? row.seconds : null;
      result.checks[id][index] = out;
    }
  }
  return result;
}

export function nextDay(progress) {
  return Array.from({length:30},(_,i)=>i+1).find(id => !progress.completed.includes(id)) ?? 30;
}

export function assessmentSummary(rows = {}) {
  const values = Object.values(rows);
  return {
    first: values.filter(r=>r.first === 'yes').length,
    repeat: values.filter(r=>r.repeat === 'yes').length,
    reply: values.filter(r=>r.reply === 'yes').length,
    understoodNoReply: values.filter(r=>(r.first === 'yes' || r.repeat === 'yes') && r.reply === 'no').length,
    recorded: values.filter(r=>r.first || r.repeat || r.reply || r.seconds !== null).length,
    times: values.map(r=>r.seconds).filter(n=>typeof n === 'number'),
  };
}
