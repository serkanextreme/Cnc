import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, ClipboardCopy, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { Eyebrow, SectionHeading, SegmentedToggle, StatusChip } from './Primitives';
import { useToast } from './Toast';
import { copyText } from '../lib/records';
import { FEED_MODES, feedModeInfo, gcodeLine, machineFeedText, normalizeFeedMode } from '../lib/feed';
import { formatQty, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts, alpha } from '../theme';

const FRAME = { critical: colors.destructive, warn: colors.primary, ok: colors.primary, neutral: colors.border };
const STRIPE = { critical: colors.destructive, warn: colors.primary, ok: colors.primary, neutral: colors.border };
const CHIP = { critical: 'error', warn: 'warn', ok: 'ok', neutral: 'neutral' };
const CHIP_TEXT = { critical: 'KONTROL ET!', warn: 'Kontrol edin', ok: 'Güvenli aralık', neutral: '—' };

function FeedValueCell({ active, modeId, value, unit, hint, testID }) {
  const info = feedModeInfo(modeId);
  return (
    <View style={[styles.cell, active && { backgroundColor: alpha(colors.primary, 0.1) }]} testID={`${testID}-cell`}>
      <View style={styles.cellTopRow}>
        <View style={[styles.modeBadge, active ? styles.modeBadgeActive : styles.modeBadgeInactive]}>
          <Text style={[styles.modeBadgeText, { color: active ? colors.primary : colors.mutedForeground }]}>{info.short}</Text>
        </View>
        <Text style={[styles.cellCaption, { color: active ? colors.primary : colors.mutedForeground }]}>
          {active ? 'TEZGÂHA BUNU GIR' : 'Karşılığı'}
        </Text>
      </View>
      <Text style={[active ? styles.cellValueXl : styles.cellValueLg, { color: active ? colors.primary : colors.mutedForeground }]} testID={testID}>
        {value}
      </Text>
      <Text style={[styles.cellUnit, { color: active ? colors.cardForeground : colors.mutedForeground }]}>{unit}</Text>
      <Text style={styles.cellHint}>{hint}</Text>
    </View>
  );
}

/**
 * TEZGÂHA GIRILECEK ILERLEME KARTI
 * F degerini hem G94 (mm/dk) hem G95 (mm/dev) olarak birlikte gosterir,
 * kopyalanabilir G-kod satiri uretir ve limit asimlarinda kritik uyari verir.
 */
export function FeedCard({
  n, vf, fn, mode, onModeChange, unitSystem = 'metric', safety = { level: 'neutral', messages: [] },
  fnRange = null, scopeLabel = null, title = 'Tezgâha girilecek F', eyebrow = 'ILERLEME · BIRIM KONTROLÜ',
  extraNote = null, testID = 'feed-card',
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const activeMode = normalizeFeedMode(mode);
  const level = safety.level === 'neutral' ? 'neutral' : safety.level;
  const line = gcodeLine({ mode: activeMode, n, vf, fn, unitSystem });

  const handleCopy = async () => {
    if (line === '—') { toast.error('Kopyalanacak geçerli değer yok'); return; }
    const ok = await copyText(line);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success('G-kod satırı kopyalandı', { description: line });
    } else {
      toast.error('Kopyalama desteklenmiyor');
    }
  };

  const vfText = machineFeedText({ mode: 'G94', vf, fn, unitSystem });
  const fnText = machineFeedText({ mode: 'G95', vf, fn, unitSystem });

  return (
    <View testID={testID}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        right={(
          <StatusChip tone={CHIP[level]} icon={level === 'ok' ? ShieldCheck : TriangleAlert} testID="feed-safety-chip">
            {CHIP_TEXT[level]}
          </StatusChip>
        )}
      />
      <View style={[styles.card, { borderColor: FRAME[level] }]}>
        <View style={[styles.stripe, { backgroundColor: STRIPE[level] }]} />

        {level === 'critical' ? (
          <View style={styles.criticalBanner} testID="feed-critical-banner">
            <TriangleAlert size={16} color={colors.destructive} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.criticalTitle}>TEZGÂHA GIRMEDEN KONTROL ET</Text>
              {safety.messages.map((m) => (
                <Text key={m} style={styles.criticalMsg} testID="feed-warning-message">{m}</Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.twoCol}>
          <View style={[styles.colHalf, styles.colBorderRight]}>
            <FeedValueCell active={activeMode === 'G94'} modeId="G94" value={vfText} unit={unitLabel('vf', unitSystem)} hint="Dakikada ilerleme (Vf) · tam sayı" testID="feed-value-g94" />
          </View>
          <View style={styles.colHalf}>
            <FeedValueCell active={activeMode === 'G95'} modeId="G95" value={fnText} unit={unitLabel('f', unitSystem)} hint="Devir başına ilerleme (fn)" testID="feed-value-g95" />
          </View>
        </View>

        <View style={styles.gcodeRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Tezgâha yazılacak satır</Eyebrow>
            <Text style={styles.gcodeText} numberOfLines={1} testID="feed-gcode">{line}</Text>
          </View>
          <Pressable onPress={handleCopy} testID="feed-gcode-copy" style={styles.copyBtn} accessibilityLabel="G-kod satırını kopyala">
            {copied ? <Check size={18} color={colors.success} /> : <ClipboardCopy size={18} color={colors.primary} />}
          </Pressable>
        </View>

        <View style={styles.modeSection}>
          <Eyebrow style={{ marginBottom: spacing.sm }}>{scopeLabel ? `Tezgâh F modu · ${scopeLabel}` : 'Tezgâh F modu'}</Eyebrow>
          <SegmentedToggle
            options={FEED_MODES.map((m) => ({ id: m.id, label: m.label }))}
            value={activeMode}
            onChange={(v) => onModeChange && onModeChange(v)}
            testID="feed-mode-toggle"
          />
          <Text style={styles.modeHint}>
            {scopeLabel ? `Bu seçim yalnızca ${scopeLabel} için geçerlidir. ` : ''}
            Tezgâhın kumandası G94 modundaysa F alanına mm/dk (tam sayı), G95 modundaysa mm/dev yazılır.
          </Text>
        </View>

        {level === 'warn' && safety.messages.length ? (
          <View style={styles.warnBanner} testID="feed-warn-banner">
            {safety.messages.map((m) => (
              <View key={m} style={styles.warnMsgRow}>
                <TriangleAlert size={13} color={colors.primary} style={{ marginTop: 2 }} />
                <Text style={styles.warnMsgText} testID="feed-warning-message">{m}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.rangeRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Önerilen mm/dev aralığı</Eyebrow>
            <Text style={styles.rangeValue} testID="feed-fn-range">
              {fnRange ? `${formatQty('f', fnRange[0], unitSystem, { decimals: 3 })} – ${formatQty('f', fnRange[1], unitSystem, { decimals: 3 })} ${unitLabel('f', unitSystem)}` : 'Malzeme önerisi yok'}
            </Text>
          </View>
          <StatusChip tone={level === 'ok' ? 'ok' : level === 'critical' ? 'error' : level === 'warn' ? 'warn' : 'neutral'}>
            {`fn = ${fnText}`}
          </StatusChip>
        </View>

        {extraNote ? <Text style={styles.extraNoteText}>{extraNote}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.card, overflow: 'hidden' },
  stripe: { height: 4 },
  criticalBanner: { flexDirection: 'row', gap: spacing.sm, borderBottomWidth: 1, borderColor: alpha(colors.destructive, 0.4), backgroundColor: alpha(colors.destructive, 0.15), paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  criticalTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.destructive },
  criticalMsg: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.destructive, marginTop: 4 },
  twoCol: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  colHalf: { flex: 1, minWidth: 0 },
  colBorderRight: { borderRightWidth: 1, borderColor: colors.border },
  cell: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  cellTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeBadge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  modeBadgeActive: { borderColor: alpha(colors.primary, 0.4), backgroundColor: alpha(colors.primary, 0.15) },
  modeBadgeInactive: { borderColor: colors.border, backgroundColor: colors.muted },
  modeBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5 },
  cellCaption: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  cellValueXl: { fontFamily: fonts.headingBold, fontSize: 30, marginTop: 6 },
  cellValueLg: { fontFamily: fonts.headingBold, fontSize: 22, marginTop: 6 },
  cellUnit: { fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 4 },
  cellHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 14, color: colors.mutedForeground, marginTop: 4 },
  gcodeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  gcodeText: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.foreground, marginTop: 4 },
  copyBtn: { height: 44, width: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  modeSection: { borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  modeHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.mutedForeground, marginTop: spacing.sm },
  warnBanner: { borderBottomWidth: 1, borderColor: colors.border, backgroundColor: alpha(colors.primary, 0.1), paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 4 },
  warnMsgRow: { flexDirection: 'row', gap: 6 },
  warnMsgText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.primary },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rangeValue: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.cardForeground, marginTop: 2 },
  extraNoteText: { borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.mutedForeground },
});
