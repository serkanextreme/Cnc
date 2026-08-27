import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, ChevronRight, Minus, Plus, ShieldCheck, TriangleAlert,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { parseNumber, toInputText, toMetric, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts, alpha } from '../theme';

/* ------------------------------------------------------------------ shell */
export function ScreenShell({ children, testId, scroll = true, contentStyle, edges = ['top'], footer }) {
  const insets = useSafeAreaInsets();
  const Wrapper = scroll ? ScrollView : View;
  const wrapperProps = scroll
    ? { contentContainerStyle: [styles.scrollContent, contentStyle], keyboardShouldPersistTaps: 'handled' }
    : { style: [{ flex: 1 }, contentStyle] };
  return (
    <View
      style={[styles.shell, { paddingTop: edges.includes('top') ? insets.top : 0 }]}
      testID={testId || 'screen-shell'}
    >
      <Wrapper {...wrapperProps}>{children}</Wrapper>
      {footer}
    </View>
  );
}

export function Eyebrow({ children, style, testID }) {
  return <Text testID={testID} style={[styles.eyebrow, style]}>{children}</Text>;
}

const ICON_TONES = {
  default: { border: colors.border, bg: colors.card, fg: colors.cardForeground },
  primary: { border: alpha(colors.primary, 0.5), bg: alpha(colors.primary, 0.1), fg: colors.primary },
  accent: { border: colors.border, bg: colors.card, fg: colors.accent },
  muted: { border: colors.border, bg: colors.card, fg: colors.mutedForeground },
};

export function IconButton({ icon: Icon, onPress, label, tone = 'default', testID, style }) {
  const t = ICON_TONES[tone] || ICON_TONES.default;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: t.border, backgroundColor: t.bg },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      <Icon size={19} color={t.fg} strokeWidth={2} />
    </Pressable>
  );
}

export function ScreenHeader({ eyebrow, title, onBack, right, children, testID = 'screen-header' }) {
  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.headerRow}>
        {onBack ? (
          <IconButton icon={ArrowLeft} label="Geri dön" onPress={onBack} testID="back-button" />
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Text style={styles.headerTitle} numberOfLines={1} testID="screen-title">{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function SectionHeading({ eyebrow, title, right, style }) {
  return (
    <View style={[styles.sectionHeading, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text style={styles.titleMd}>{title}</Text>
      </View>
      {right ? <View style={{ paddingBottom: 2 }}>{right}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ cards */
export function ListCard({ children, divided = true, style, testID = 'list-card' }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.listCard, style]} testID={testID}>
      {items.map((child, idx) => (
        <View key={child.key || idx} style={divided && idx < items.length - 1 ? styles.divider : null}>
          {child}
        </View>
      ))}
    </View>
  );
}

const ROW_TONES = {
  muted: { bg: colors.muted, fg: colors.accent },
  primary: { bg: colors.primary, fg: colors.primaryForeground },
  secondary: { bg: colors.secondary, fg: colors.secondaryForeground },
  destructive: { bg: alpha(colors.destructive, 0.15), fg: colors.destructive },
  success: { bg: alpha(colors.success, 0.15), fg: colors.success },
};

export function Row({
  icon: Icon, iconTone = 'muted', title, subtitle, meta, onPress, right, chevron = false, testID, style,
}) {
  const t = ROW_TONES[iconTone] || ROW_TONES.muted;
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && onPress ? { backgroundColor: alpha(colors.muted, 0.6) } : null, style]}
    >
      {Icon ? (
        <View style={[styles.rowIcon, { backgroundColor: t.bg }]}>
          <Icon size={18} color={t.fg} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Comp>
  );
}

/* ------------------------------------------------------------------ chips */
const CHIP_TONES = {
  ok: { bg: alpha(colors.success, 0.15), fg: colors.success, border: alpha(colors.success, 0.3) },
  success: { bg: alpha(colors.success, 0.15), fg: colors.success, border: alpha(colors.success, 0.3) },
  warn: { bg: alpha(colors.primary, 0.15), fg: colors.primary, border: alpha(colors.primary, 0.4) },
  primary: { bg: alpha(colors.primary, 0.15), fg: colors.primary, border: alpha(colors.primary, 0.4) },
  error: { bg: alpha(colors.destructive, 0.15), fg: colors.destructive, border: alpha(colors.destructive, 0.4) },
  destructive: { bg: alpha(colors.destructive, 0.15), fg: colors.destructive, border: alpha(colors.destructive, 0.4) },
  accent: { bg: alpha(colors.accent, 0.15), fg: colors.accent, border: alpha(colors.accent, 0.3) },
  neutral: { bg: colors.muted, fg: colors.mutedForeground, border: colors.border },
};

export function StatusChip({ tone = 'neutral', icon: Icon, children, testID, style }) {
  const t = CHIP_TONES[tone] || CHIP_TONES.neutral;
  return (
    <View style={[styles.chip, { backgroundColor: t.bg, borderColor: t.border }, style]} testID={testID}>
      {Icon ? <Icon size={13} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.chipText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- segmented */
export function SegmentedToggle({ options, value, onChange, tone = 'primary', testID, style }) {
  const activeBg = tone === 'secondary' ? colors.secondary : colors.primary;
  const activeFg = tone === 'secondary' ? colors.secondaryForeground : colors.primaryForeground;
  return (
    <View style={[styles.segmented, style]} testID={testID}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            testID={testID ? `${testID}-${opt.id}` : undefined}
            style={[styles.segmentedItem, active && { backgroundColor: activeBg }]}
          >
            <Text style={[styles.segmentedText, { color: active ? activeFg : colors.mutedForeground }, active && { fontFamily: fonts.bodySemiBold }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- stepper */
export function Stepper({ value, onChange, min = 1, max = 12, label, hint, testID = 'stepper' }) {
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowMeta}>{label}</Text>
        <Text style={styles.stepperHint}>{hint}</Text>
      </View>
      <View style={styles.stepperControl}>
        <Pressable
          accessibilityLabel="Azalt"
          testID={`${testID}-minus`}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.stepperBtn}
        >
          <Minus size={16} color={colors.mutedForeground} />
        </Pressable>
        <Text style={styles.stepperValue} testID={`${testID}-value`}>{value}</Text>
        <Pressable
          accessibilityLabel="Artır"
          testID={`${testID}-plus`}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepperBtn, { borderLeftWidth: 1, borderRightWidth: 0, borderColor: colors.border }]}
        >
          <Plus size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

/* ----------------------------------------------------------- numeric field */
export function NumericField({
  id, label, hint, hintTone = 'muted', kind = 'length', value, onChange, disabled = false,
  status = 'neutral', unitOverride, testID, error, style,
}) {
  const { unitSystem } = useApp();
  const [text, setText] = useState(() => toInputText(kind, value, unitSystem));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toInputText(kind, value, unitSystem));
  }, [value, unitSystem, kind, focused]);

  const handleChange = (raw) => {
    setText(raw);
    const parsed = parseNumber(raw);
    if (Number.isFinite(parsed)) onChange(toMetric(kind, parsed, unitSystem));
  };

  const borderColor = status === 'error' ? colors.destructive : status === 'warn' ? alpha(colors.primary, 0.6) : colors.border;
  const hintColor = hintTone === 'warn' ? colors.primary : hintTone === 'error' ? colors.destructive : colors.mutedForeground;

  return (
    <View style={[styles.fieldWrap, disabled && { opacity: 0.5 }, style]}>
      <View style={styles.fieldTopRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={[styles.fieldHint, { color: hintColor }]}>{hint}</Text> : null}
      </View>
      <View style={[styles.fieldInputRow, { borderColor }]}>
        <TextInput
          testID={testID}
          value={text}
          editable={!disabled}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setText(toInputText(kind, value, unitSystem)); }}
          onChangeText={handleChange}
          style={styles.fieldInput}
          placeholderTextColor={colors.mutedForeground}
        />
        <View style={styles.fieldUnitBox}>
          <Text style={styles.fieldUnitText}>{unitOverride || unitLabel(kind, unitSystem)}</Text>
        </View>
      </View>
      {error ? <Text style={styles.fieldError} testID={testID ? `${testID}-error` : undefined}>{error}</Text> : null}
    </View>
  );
}

/* -------------------------------------------------------------- notices */
export function ClampNotice({ notes, tone = 'warn', title, body, action, testID = 'clamp-notice' }) {
  const isWarn = tone === 'warn';
  return (
    <View
      testID={testID}
      style={[styles.notice, isWarn ? { borderColor: alpha(colors.primary, 0.4), backgroundColor: alpha(colors.primary, 0.1) } : { borderColor: colors.border, backgroundColor: colors.muted }]}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {isWarn ? (
          <TriangleAlert size={18} color={colors.primary} style={{ marginTop: 2 }} />
        ) : (
          <ShieldCheck size={18} color={colors.success} style={{ marginTop: 2 }} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.noticeTitle, { color: isWarn ? colors.primary : colors.foreground }]}>{title}</Text>
          {body ? <Text style={styles.noticeBody}>{body}</Text> : null}
          {notes && notes.length ? notes.map((n) => (
            <Text key={n} style={styles.noticeBody}>· {n}</Text>
          )) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, body, action, testID = 'empty-state' }) {
  return (
    <View style={styles.emptyState} testID={testID}>
      {Icon ? (
        <View style={styles.emptyStateIcon}>
          <Icon size={24} color={colors.accent} />
        </View>
      ) : null}
      <Text style={styles.titleMdCenter}>{title}</Text>
      {body ? <Text style={styles.emptyStateBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------ bottom bars */
export function BottomActionBar({ children, testID = 'bottom-action-bar' }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} testID={testID}>
      {children}
    </View>
  );
}

export function PrimaryButton({ icon: Icon, children, onPress, testID, disabled, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [styles.primaryButton, disabled && { opacity: 0.5 }, pressed && !disabled && { opacity: 0.85 }, style]}
    >
      {Icon ? <Icon size={18} color={colors.primaryForeground} /> : null}
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

const GHOST_TONES = {
  default: { border: colors.border, bg: colors.card, fg: colors.cardForeground },
  primary: { border: colors.primary, bg: alpha(colors.primary, 0.15), fg: colors.primary },
  destructive: { border: alpha(colors.destructive, 0.5), bg: alpha(colors.destructive, 0.1), fg: colors.destructive },
};

export function GhostButton({ icon: Icon, children, onPress, testID, tone = 'default', style }) {
  const t = GHOST_TONES[tone] || GHOST_TONES.default;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.ghostButton, { borderColor: t.border, backgroundColor: t.bg }, pressed && { opacity: 0.8 }, style]}
    >
      {Icon ? <Icon size={18} color={t.fg} /> : null}
      <Text style={[styles.ghostButtonText, { color: t.fg }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.xl },
  eyebrow: {
    fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
    color: colors.mutedForeground,
  },
  header: { borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.foreground, marginTop: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  titleMdCenter: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground, textAlign: 'center' },
  iconButton: { height: 40, width: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 44 },
  rowIcon: { height: 36, width: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowMeta: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.mutedForeground },
  rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  rowSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, padding: 4, gap: 4 },
  segmentedItem: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  segmentedText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  stepperHint: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground, marginTop: 2 },
  stepperControl: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, overflow: 'hidden' },
  stepperBtn: { height: '100%', width: 44, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontFamily: fonts.headingBold, fontSize: 18, width: 44, textAlign: 'center', color: colors.foreground },
  fieldWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  fieldHint: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  fieldInputRow: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.input },
  fieldInput: { flex: 1, minWidth: 0, paddingHorizontal: spacing.md, fontFamily: fonts.headingBold, fontSize: 22, color: colors.foreground },
  fieldUnitBox: { borderLeftWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: '100%', alignItems: 'center', justifyContent: 'center' },
  fieldUnitText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.mutedForeground },
  fieldError: { marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.destructive },
  notice: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  noticeTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  noticeBody: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 2, lineHeight: 16 },
  emptyState: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxl * 1.5, alignItems: 'center' },
  emptyStateIcon: { height: 48, width: 48, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyStateBody: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedForeground, marginTop: spacing.sm, textAlign: 'center', maxWidth: 280 },
  bottomActionBar: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: 'row', gap: spacing.md },
  primaryButton: { flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryForeground },
  ghostButton: { height: 48, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.lg },
  ghostButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
