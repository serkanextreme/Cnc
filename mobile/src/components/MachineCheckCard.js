import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowLeftRight, Check } from 'lucide-react-native';
import { Eyebrow, GhostButton, NumericField, SectionHeading, StatusChip } from './Primitives';
import { useToast } from './Toast';
import { evaluateRange } from '../lib/calc';
import { normalizeFeedMode } from '../lib/feed';
import { formatNumber, formatQty, formatRange, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

function OutCell({ label, value, unit, note, tone = 'foreground', chip = null, testID }) {
  const toneColor = tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accent : colors.foreground;
  return (
    <View style={styles.outCell}>
      <View style={styles.outCellTop}>
        <Eyebrow>{label}</Eyebrow>
        {chip}
      </View>
      <Text style={[styles.outValue, { color: toneColor }]} testID={testID}>{value}</Text>
      <Text style={styles.outUnit}>{unit}</Text>
      {note ? <Text style={styles.outNote}>{note}</Text> : null}
    </View>
  );
}

/**
 * TEZGÂHTAN GERI KONTROL
 * Tezgâhta yazan devir (S) ve ilerleme (F) degerlerini girip bunlarin gercekte
 * hangi Vc / mm/dev / mm/dis degerine karsilik geldigini gosterir.
 */
export function MachineCheckCard({
  diameter, z = null, feedMode = 'G94', unitSystem = 'metric', vcRange = null, fRange = null, fzRange = null,
  fzHint = 'Ağız sayısı girilmedi', suggestS = NaN, suggestF = NaN, onApply = null,
  applyLabel = 'Bu değerleri hesaba uygula', note = null, testID = 'machine-check-card',
}) {
  const toast = useToast();
  const mode = normalizeFeedMode(feedMode);
  const [s, setS] = useState(() => (Number.isFinite(suggestS) && suggestS > 0 ? Math.round(suggestS) : 0));
  const [fVal, setFVal] = useState(0);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) return;
    if (Number.isFinite(suggestS) && suggestS > 0) setS(Math.round(suggestS));
    if (Number.isFinite(suggestF) && suggestF > 0) {
      setFVal(mode === 'G94' ? Math.round(suggestF) : suggestF / (suggestS > 0 ? suggestS : 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestS, suggestF, mode, touched]);

  const D = Number(diameter);
  const S = Number(s);
  const vf = mode === 'G94' ? Number(fVal) : Number(fVal) * S;
  const fn = mode === 'G94' ? (S > 0 ? Number(fVal) / S : NaN) : Number(fVal);
  const vc = D > 0 && S > 0 ? (Math.PI * D * S) / 1000 : NaN;
  const fz = z > 0 && Number.isFinite(fn) ? fn / z : NaN;

  const vcEval = vcRange && Number.isFinite(vc) ? evaluateRange(vc, vcRange) : null;
  const fEval = fRange && Number.isFinite(fn) ? evaluateRange(fn, fRange) : null;
  const fzEval = fzRange && Number.isFinite(fz) ? evaluateRange(fz, fzRange) : null;

  const rpmForVc = vcRange && D > 0 ? [(vcRange[0] * 1000) / (Math.PI * D), (vcRange[1] * 1000) / (Math.PI * D)] : null;
  const vfForF = fRange && S > 0 ? [fRange[0] * S, fRange[1] * S] : null;

  const chipFor = (ev, testIdChip) => (ev ? (
    <StatusChip tone={ev.status === 'ok' ? 'ok' : ev.status === 'error' ? 'error' : 'warn'} testID={testIdChip}>{ev.label}</StatusChip>
  ) : null);

  return (
    <View testID={testID}>
      <SectionHeading
        eyebrow="TEZGÂHTAN GERI KONTROL"
        title="Tezgâhta yazan S / F ne demek?"
        right={<StatusChip tone="accent" icon={ArrowLeftRight}>{mode === 'G94' ? 'F = mm/dk' : 'F = mm/dev'}</StatusChip>}
      />
      <View style={styles.card}>
        <Text style={styles.intro}>
          Tezgâh ekranında yazan S (devir) ve F ({mode === 'G94' ? 'mm/dk' : 'mm/dev'}) değerlerini girin; bunların
          hangi kesme hızına ve diş başına ilerlemeye karşılık geldiğini gösterir.
        </Text>

        <View style={styles.divider} />
        <NumericField
          id={`${testID}-s`}
          label="Tezgâhtaki devir (S)"
          hint={rpmForVc ? `Önerilen Vc için: ${formatRange('rpm', rpmForVc, unitSystem)} ${unitLabel('rpm', unitSystem)}` : ''}
          kind="rpm"
          value={S}
          onChange={(v) => { setTouched(true); setS(v); }}
          testID={`${testID}-input-s`}
        />
        <View style={styles.divider} />
        <NumericField
          id={`${testID}-f`}
          label={mode === 'G94' ? 'Tezgâhtaki ilerleme (F, mm/dk)' : 'Tezgâhtaki ilerleme (F, mm/dev)'}
          hint={vfForF && mode === 'G94' ? `Önerilen f için: ${formatRange('vf', vfForF, unitSystem)} ${unitLabel('vf', unitSystem)}` : (fRange ? `Önerilen: ${formatRange('f', fRange, unitSystem)} ${unitLabel('f', unitSystem)}` : '')}
          kind={mode === 'G94' ? 'vf' : 'f'}
          value={Number(fVal)}
          onChange={(v) => { setTouched(true); setFVal(v); }}
          testID={`${testID}-input-f`}
        />
        <View style={styles.divider} />

        <View style={styles.row2}>
          <OutCell label="Kesme hızı (Vc / SMM)" value={Number.isFinite(vc) ? formatQty('vc', vc, unitSystem, { decimals: 1 }) : '—'} unit={unitLabel('vc', unitSystem)} note={`Vc = π × ${formatQty('length', D, unitSystem)} × ${formatNumber(S, 0)} / 1000`} tone="accent" chip={chipFor(vcEval, `${testID}-vc-chip`)} testID={`${testID}-vc`} />
          <View style={styles.vDivider} />
          <OutCell label="Devir başına (f)" value={Number.isFinite(fn) ? formatQty('f', fn, unitSystem, { decimals: 3 }) : '—'} unit={unitLabel('f', unitSystem)} note="f = F / S" tone="primary" chip={chipFor(fEval, `${testID}-f-chip`)} testID={`${testID}-fn`} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row2}>
          <OutCell label={z > 0 ? `Diş başına (fz) · ${z} ağız` : 'Diş başına (fz)'} value={Number.isFinite(fz) ? formatQty('fz', fz, unitSystem, { decimals: 3 }) : '—'} unit={unitLabel('fz', unitSystem)} note={z > 0 ? `fz = f / ${z}` : fzHint} tone="primary" chip={chipFor(fzEval, `${testID}-fz-chip`)} testID={`${testID}-fz`} />
          <View style={styles.vDivider} />
          <OutCell label="Dakikada ilerleme (Vf)" value={Number.isFinite(vf) ? formatQty('vf', vf, unitSystem) : '—'} unit={unitLabel('vf', unitSystem)} note="Vf = f × S" tone="foreground" testID={`${testID}-vf`} />
        </View>

        {D > 0 && S > 0 ? (
          <>
            <View style={styles.divider} />
            <View style={styles.scaleWrap} testID={`${testID}-vc-scale`}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>{`Aynı ${formatNumber(S, 0)} dev/dk'da çapa göre Vc`}</Eyebrow>
              <View style={styles.scaleRow}>
                {[0.7, 1, 1.3].map((k) => {
                  const dd = D * k;
                  const vv = (Math.PI * dd * S) / 1000;
                  const isSelf = k === 1;
                  return (
                    <View key={k} style={[styles.scaleCell, isSelf ? styles.scaleCellActive : styles.scaleCellInactive]}>
                      <Text style={styles.scaleCaption}>{`Ø${formatQty('length', dd, unitSystem, { decimals: 1 })}`}</Text>
                      <Text style={[styles.scaleValue, { color: isSelf ? colors.accent : colors.cardForeground }]}>{formatQty('vc', vv, unitSystem, { decimals: 1 })}</Text>
                      <Text style={styles.scaleUnit}>{unitLabel('vc', unitSystem)}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.scaleFooter}>
                Vc çapla doğru orantılıdır. Kataloğunuz aynı devirde daha düşük bir Vc veriyorsa, o değer daha küçük bir (efektif) çapa aittir.
              </Text>
            </View>
          </>
        ) : null}

        {note ? (<><View style={styles.divider} /><Text style={styles.noteText}>{note}</Text></>) : null}

        {onApply ? (
          <>
            <View style={styles.divider} />
            <View style={{ padding: spacing.lg }}>
              <GhostButton
                testID={`${testID}-apply`}
                tone="primary"
                onPress={() => {
                  if (!(Number.isFinite(vc) && vc > 0 && Number.isFinite(fn) && fn > 0)) {
                    toast.error('Önce geçerli S ve F değeri girin');
                    return;
                  }
                  onApply({ vc, fn, fz, s: S, vf });
                  toast.success('Tezgâh değerleri hesaba uygulandi', {
                    description: `Vc ${formatQty('vc', vc, unitSystem)} ${unitLabel('vc', unitSystem)} · f ${formatQty('f', fn, unitSystem, { decimals: 3 })} ${unitLabel('f', unitSystem)}`,
                  });
                }}
              >
                <Check size={16} color={colors.primary} />
                {applyLabel}
              </GhostButton>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  vDivider: { width: 1, backgroundColor: colors.border },
  intro: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.mutedForeground, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row2: { flexDirection: 'row' },
  outCell: { flex: 1, minWidth: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  outCellTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  outValue: { fontFamily: fonts.headingBold, fontSize: 20, marginTop: 4 },
  outUnit: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.cardForeground, marginTop: 2 },
  outNote: { fontFamily: fonts.body, fontSize: 11, lineHeight: 14, color: colors.mutedForeground, marginTop: 4 },
  scaleWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  scaleRow: { flexDirection: 'row', gap: spacing.sm },
  scaleCell: { flex: 1, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 8 },
  scaleCellActive: { borderColor: colors.accent, backgroundColor: 'rgba(85,198,195,0.1)' },
  scaleCellInactive: { borderColor: colors.border, backgroundColor: colors.input },
  scaleCaption: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.mutedForeground },
  scaleValue: { fontFamily: fonts.headingSemiBold, fontSize: 16, marginTop: 2 },
  scaleUnit: { fontFamily: fonts.body, fontSize: 10, color: colors.mutedForeground },
  scaleFooter: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.mutedForeground, marginTop: spacing.sm },
  noteText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.mutedForeground, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
