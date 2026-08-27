import { formatNumber, formatQty, formatSeconds, unitLabel } from './units';
import { opLabel } from '../data/materials';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayLabel(dateStr) {
  const d = startOfDay(dateStr);
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - d.getTime()) / DAY_MS);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(d);
}

export function timeLabel(dateStr) {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
}

export function dateLabel(dateStr) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
}

export function groupByDay(history) {
  const map = new Map();
  history.forEach((rec) => {
    const key = startOfDay(rec.createdAt).toISOString();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(rec);
  });
  return [...map.entries()]
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([key, items]) => ({
      key,
      label: dayLabel(key),
      date: dateLabel(key),
      items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    }));
}

export function todayStats(history) {
  const today = startOfDay(new Date()).getTime();
  const items = history.filter((r) => startOfDay(r.createdAt).getTime() === today);
  const counts = { freze: 0, torna: 0, matkap: 0, dis: 0, chatter: 0 };
  items.forEach((r) => {
    if (counts[r.op] !== undefined) counts[r.op] += 1;
  });
  return { total: items.length, counts };
}

/** Geçmiş satırı için özet metinler */
export function describeRecord(rec, unitSystem) {
  const i = rec.inputs || {};
  const parts = [];
  if (i.d) parts.push(`Ø${formatQty('length', i.d, unitSystem)} ${unitLabel('length', unitSystem)}`);
  if (rec.op === 'freze' && i.z) parts.push(`${i.z} ağız`);
  if (rec.op === 'matkap' && i.depth) parts.push(`${formatQty('length', i.depth, unitSystem)} ${unitLabel('length', unitSystem)} derinlik`);
  if (rec.op === 'torna' && i.direction) parts.push(i.direction === 'id' ? 'İç çap' : 'Dış çap');
  if (rec.op === 'chatter') {
    return {
      title: 'Chatter-Free',
      material: rec.materialCode,
      subtitle: `Ø${formatQty('length', i.d, unitSystem)} · ap ${formatQty('length', i.ap, unitSystem)} · ae ${formatQty('length', i.ae, unitSystem)} ${unitLabel('length', unitSystem)}`,
      time: timeLabel(rec.createdAt),
    };
  }
  if (rec.op === 'dis') {
    const modeLabel = { kilavuz: 'Kılavuz', frezeleme: 'Diş frezesi', torna: 'Torna dişi' }[i.mode] || '';
    return {
      title: modeLabel || 'Diş',
      material: rec.materialCode,
      subtitle: [rec.threadLabel, i.pitch ? `adım ${formatQty('length', i.pitch, unitSystem)} ${unitLabel('length', unitSystem)}` : '']
        .filter(Boolean).join(' · '),
      time: timeLabel(rec.createdAt),
    };
  }
  return {
    title: `${opLabel(rec.op)}`,
    material: rec.materialCode,
    subtitle: parts.join(' · '),
    time: timeLabel(rec.createdAt),
  };
}

export function buildShareText(rec, unitSystem, materialName) {
  const i = rec.inputs || {};
  const o = rec.outputs || {};
  const L = (k) => unitLabel(k, unitSystem);
  const lines = [
    `TALAŞ · ${opLabel(rec.op).toUpperCase()} HESABI`,
    `Malzeme: ${rec.materialCode}${materialName ? ` ${materialName}` : ''}`,
  ];
  if (rec.op === 'freze') {
    lines.push(`Takım: ${i.tool === 'hss' ? 'HSS' : 'Karbür'} Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · ${i.z} ağız`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} · fz ${formatQty('fz', i.fz, unitSystem)} ${L('fz')}`);
    lines.push(`ap ${formatQty('length', i.ap, unitSystem)} · ae ${formatQty('length', i.ae, unitSystem)} ${L('length')}`);
  } else if (rec.op === 'torna') {
    lines.push(`Uç: ${i.tool === 'hss' ? 'HSS kalem' : 'Karbür uç'} · rε ${formatQty('length', i.noseR, unitSystem)} ${L('length')}`);
    lines.push(`Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · ${i.direction === 'id' ? 'İç çap' : 'Dış çap'}`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} · f ${formatQty('f', i.f, unitSystem)} ${L('f')} · ap ${formatQty('length', i.ap, unitSystem)} ${L('length')}`);
  } else if (rec.op === 'chatter') {
    lines.push(`Takım: ${i.tool === 'hss' ? 'HSS' : 'Karbür'} Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · ${i.z} ağız · helis ${formatQty('length', i.fluteLength, unitSystem)} ${L('length')}`);
    lines.push(`ap ${formatQty('length', i.ap, unitSystem)} · ae ${formatQty('length', i.ae, unitSystem)} ${L('length')} (%${((i.ae / i.d) * 100).toFixed(1)})`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} × ${i.vcFactor || 1} · hedef fz ${formatQty('fz', i.fz, unitSystem)} ${L('fz')}`);
    if (o.rctf) lines.push(`RCTF ${o.rctf.toFixed(3)} → programlanan fz ${formatQty('fz', o.fzProgrammed, unitSystem)} ${L('fz')}`);
    if (o.mrrGain) lines.push(`Klasik frezelemeye göre ${o.mrrGain.toFixed(2)}× talaş hacmi`);
  } else if (rec.op === 'dis') {
    const modeLabel = { kilavuz: 'Kılavuz', frezeleme: 'Diş frezesi', torna: 'Torna dişi' }[i.mode] || 'Diş';
    lines.push(`Yöntem: ${modeLabel}${rec.threadLabel ? ` · ${rec.threadLabel}` : ''}`);
    lines.push(`Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · adım ${formatQty('length', i.pitch, unitSystem)} ${L('length')}`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')}`);
    if (o.tapDrill) lines.push(`Kılavuz matkabı: ${formatQty('length', o.tapDrill, unitSystem)} ${L('length')}`);
    if (o.passCount) lines.push(`Paso sayısı: ${o.passCount}`);
  } else {
    lines.push(`Matkap: ${i.tool === 'hss' ? 'HSS' : 'Karbür'} Ø${formatQty('length', i.d, unitSystem)} ${L('length')}`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} · f ${formatQty('f', i.f, unitSystem)} ${L('f')} · derinlik ${formatQty('length', i.depth, unitSystem)} ${L('length')}`);
  }
  lines.push('—');
  lines.push(`Devir: ${formatNumber(o.n, 0)} ${L('rpm')}`);
  lines.push(`İlerleme (G94): ${formatQty('vf', o.vf, unitSystem)} ${L('vf')}`);
  const fnShare = Number.isFinite(o.fn) ? o.fn : (o.n > 0 ? o.vf / o.n : NaN);
  if (Number.isFinite(fnShare)) {
    lines.push(`İlerleme (G95): ${formatQty('f', fnShare, unitSystem, { decimals: 3 })} ${L('f')}`);
  }
  lines.push('! Tezgâhın F modunu kontrol et: G94 = mm/dk, G95 = mm/dev');
  lines.push(`Efektif Vc: ${formatQty('vc', o.vcEffective, unitSystem)} ${L('vc')}`);
  if (Number.isFinite(o.q)) lines.push(`Talaş hacmi: ${formatQty('q', o.q, unitSystem)} ${L('q')}`);
  if (Number.isFinite(o.power)) lines.push(`Güç: ${formatQty('power', o.power, unitSystem)} ${L('power')}`);
  if (Number.isFinite(o.torque)) lines.push(`Tork: ${formatQty('torque', o.torque, unitSystem)} ${L('torque')}`);
  if (Number.isFinite(o.ra)) lines.push(`Yüzey: Ra ${formatQty('ra', o.ra, unitSystem)} ${L('ra')}`);
  if (Number.isFinite(o.cycleSeconds)) lines.push(`Çevrim süresi: ${formatSeconds(o.cycleSeconds)}`);
  return lines.join('\n');
}

export async function shareText(text) {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Talaş hesabı', text });
      return 'shared';
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancelled';
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch (err) {
    console.warn('clipboard failed', err);
  }
  return 'failed';
}
