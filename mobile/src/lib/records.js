import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
  if (diff === 0) return 'Bugun';
  if (diff === 1) return 'Dun';
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(d);
  } catch (e) {
    return `${d.getDate()}.${d.getMonth() + 1}`;
  }
}

export function timeLabel(dateStr) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
  } catch (e) {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

export function dateLabel(dateStr) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
  } catch (e) {
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }
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

/** Gecmis satiri icin ozet metinler */
export function describeRecord(rec, unitSystem) {
  const i = rec.inputs || {};
  const parts = [];
  if (i.d) parts.push(`Ø${formatQty('length', i.d, unitSystem)} ${unitLabel('length', unitSystem)}`);
  if (rec.op === 'freze' && i.z) parts.push(`${i.z} agiz`);
  if (rec.op === 'matkap' && i.depth) parts.push(`${formatQty('length', i.depth, unitSystem)} ${unitLabel('length', unitSystem)} derinlik`);
  if (rec.op === 'torna' && i.direction) parts.push(i.direction === 'id' ? 'Ic cap' : 'Dis cap');
  if (rec.op === 'dis') {
    const modeLabel = { kilavuz: 'Kilavuz', frezeleme: 'Dis frezesi', torna: 'Torna disi' }[i.mode] || '';
    return {
      title: modeLabel || 'Dis',
      material: rec.materialCode,
      subtitle: [rec.threadLabel, i.pitch ? `adim ${formatQty('length', i.pitch, unitSystem)} ${unitLabel('length', unitSystem)}` : '']
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
    `TALAS · ${opLabel(rec.op).toUpperCase()} HESABI`,
    `Malzeme: ${rec.materialCode}${materialName ? ` ${materialName}` : ''}`,
  ];
  if (rec.op === 'freze') {
    lines.push(`Takim: ${i.tool === 'hss' ? 'HSS' : 'Karbur'} Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · ${i.z} agiz`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} · fz ${formatQty('fz', i.fz, unitSystem)} ${L('fz')}`);
    lines.push(`ap ${formatQty('length', i.ap, unitSystem)} · ae ${formatQty('length', i.ae, unitSystem)} ${L('length')}`);
  } else if (rec.op === 'torna') {
    lines.push(`Uc: ${i.tool === 'hss' ? 'HSS kalem' : 'Karbur uc'} · rε ${formatQty('length', i.noseR, unitSystem)} ${L('length')}`);
    lines.push(`Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · ${i.direction === 'id' ? 'Ic cap' : 'Dis cap'}`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} · f ${formatQty('f', i.f, unitSystem)} ${L('f')} · ap ${formatQty('length', i.ap, unitSystem)} ${L('length')}`);
  } else if (rec.op === 'dis') {
    const modeLabel = { kilavuz: 'Kilavuz', frezeleme: 'Dis frezesi', torna: 'Torna disi' }[i.mode] || 'Dis';
    lines.push(`Yontem: ${modeLabel}${rec.threadLabel ? ` · ${rec.threadLabel}` : ''}`);
    lines.push(`Ø${formatQty('length', i.d, unitSystem)} ${L('length')} · adim ${formatQty('length', i.pitch, unitSystem)} ${L('length')}`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')}`);
    if (o.tapDrill) lines.push(`Kilavuz matkabi: ${formatQty('length', o.tapDrill, unitSystem)} ${L('length')}`);
    if (o.passCount) lines.push(`Paso sayisi: ${o.passCount}`);
  } else {
    lines.push(`Matkap: ${i.tool === 'hss' ? 'HSS' : 'Karbur'} Ø${formatQty('length', i.d, unitSystem)} ${L('length')}`);
    lines.push(`Vc ${formatQty('vc', i.vc, unitSystem)} ${L('vc')} · f ${formatQty('f', i.f, unitSystem)} ${L('f')} · derinlik ${formatQty('length', i.depth, unitSystem)} ${L('length')}`);
  }
  lines.push('—');
  lines.push(`Devir: ${formatNumber(o.n, 0)} ${L('rpm')}`);
  lines.push(`Ilerleme (G94): ${formatQty('vf', o.vf, unitSystem)} ${L('vf')}`);
  const fnShare = Number.isFinite(o.fn) ? o.fn : (o.n > 0 ? o.vf / o.n : NaN);
  if (Number.isFinite(fnShare)) {
    lines.push(`Ilerleme (G95): ${formatQty('f', fnShare, unitSystem, { decimals: 3 })} ${L('f')}`);
  }
  lines.push('! Tezgahin F modunu kontrol et: G94 = mm/dk, G95 = mm/dev');
  lines.push(`Efektif Vc: ${formatQty('vc', o.vcEffective, unitSystem)} ${L('vc')}`);
  if (Number.isFinite(o.q)) lines.push(`Talas hacmi: ${formatQty('q', o.q, unitSystem)} ${L('q')}`);
  if (Number.isFinite(o.power)) lines.push(`Guc: ${formatQty('power', o.power, unitSystem)} ${L('power')}`);
  if (Number.isFinite(o.torque)) lines.push(`Tork: ${formatQty('torque', o.torque, unitSystem)} ${L('torque')}`);
  if (Number.isFinite(o.ra)) lines.push(`Yuzey: Ra ${formatQty('ra', o.ra, unitSystem)} ${L('ra')}`);
  if (Number.isFinite(o.cycleSeconds)) lines.push(`Cevrim suresi: ${formatSeconds(o.cycleSeconds)}`);
  return lines.join('\n');
}

/** RN icin paylas/kopyala - once native Share sheet, iptal edilirse panoya kopyala secenegi cagiran taraf sunar. */
export async function shareText(text) {
  try {
    const result = await Share.share(
      Platform.OS === 'ios' ? { message: text } : { message: text, title: 'Talas hesabi' },
    );
    if (result.action === Share.dismissedAction) return 'cancelled';
    return 'shared';
  } catch (err) {
    console.warn('share failed', err);
  }
  try {
    await Clipboard.setStringAsync(text);
    return 'copied';
  } catch (err) {
    console.warn('clipboard failed', err);
  }
  return 'failed';
}

export async function copyText(text) {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (err) {
    console.warn('clipboard failed', err);
    return false;
  }
}
