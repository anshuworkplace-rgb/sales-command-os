export default function TemperatureBadge({ temperature, size = 'sm' }) {
  const c = { HOT: { l: 'Hot', i: '🔥', cls: 'badge-hot' }, WARM: { l: 'Warm', i: '🌡', cls: 'badge-warm' }, COLD: { l: 'Cold', i: '❄️', cls: 'badge-cold' } };
  const t = c[temperature] || c.COLD;
  const sz = { xs: 'text-[10px] px-1.5 py-[2px]', sm: 'text-[11px] px-2 py-0.5', md: 'text-[12px] px-2.5 py-1' };
  return <span className={`inline-flex items-center gap-1 rounded-lg font-bold ${t.cls} ${sz[size]}`}><span className="text-[10px]">{t.i}</span>{t.l}</span>;
}
