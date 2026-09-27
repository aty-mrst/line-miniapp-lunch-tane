// 時刻はすべて JST（Asia/Tokyo）基準で扱う

const TZ = 'Asia/Tokyo';

function parts(d: Date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}

/** 'YYYY-MM-DD'（JST） */
export function jstDate(d: Date): string {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 'HH:MM'（JST） */
export function jstTime(d: Date): string {
  const p = parts(d);
  return `${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** '9月28日(月)' */
export function jstDateLabel(d: Date): string {
  const [, m, day] = jstDate(d).split('-').map(Number);
  const wd = new Date(Date.UTC(Number(jstDate(d).slice(0, 4)), m - 1, day)).getUTCDay();
  return `${m}月${day}日(${WD[wd]})`;
}

/** 'YYYY-MM-DD' → '9/18' */
export function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}/${d}`;
}

/** 締め切り：出発時刻 <= 現在時刻（同じ日付の前提） */
export function isPast(departTime: string, now: Date): boolean {
  return departTime <= jstTime(now);
}
