export function groupMoments(moments) {
  const ids = new Set();
  for (const moment of moments) {
    if (!moment.id || ids.has(moment.id)) throw new Error('年轮中的每条内容需要唯一 id。');
    ids.add(moment.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moment.date)
      || !Number.isFinite(Date.parse(moment.date))
      || new Date(moment.date).toISOString().slice(0, 10) !== moment.date) {
      throw new Error(`年轮日期无效：${moment.date}，请使用 YYYY-MM-DD。`);
    }
  }

  const years = new Map();
  for (const moment of [...moments].sort((a, b) => b.date.localeCompare(a.date))) {
    const year = moment.date.slice(0, 4);
    const month = moment.date.slice(5, 7);
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(moment);
  }
  return [...years].map(([year, months]) => ({
    year,
    months: [...months].map(([month, entries]) => ({ month, entries }))
  }));
}
