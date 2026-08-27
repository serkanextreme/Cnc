import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Coins, Gauge, Plus, Sparkles, Timer, TriangleAlert, Wrench } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import { coolantLifeFactor, midOf } from '../data/materials';
import { toolCost, toolLifeMinutes, vcForTargetLife, wearStatus } from '../lib/calc';
import { formatNumber, formatQty, unitLabel } from '../lib/units';
import { Eyebrow, NumericField, StatusChip } from './Primitives';
import { colors, radius, spacing, fonts } from '../theme';

const STATUS_MAP = {
  iyi: { tone: 'ok', label: 'Ömür iyi' },
  dikkat: { tone: 'warn', label: 'Ömür kısa' },
  kritik: { tone: 'error', label: 'Ömür kritik' },
  bilinmiyor: { tone: 'neutral', label: '—' },
};

/** Takim omru (Taylor) + parca basi maliyet + asinma uyarisi. */
export function ToolLifeCard({ op, vc, vcRange, tool, coolant, onApplyVc, cycleSeconds }) {
  const { settings, updateSettings, unitSystem, tools, addToolUsage } = useApp();
  const toast = useToast();
  const [selectedTool, setSelectedTool] = useState('');

  const vcRef = useMemo(() => (vcRange ? midOf(vcRange) : vc), [vcRange, vc]);
  const life = useMemo(() => toolLifeMinutes({
    vc, vcRef, tool: tool === 'hss' ? 'hss' : 'karbur', refLife: settings.refLife || 15, coolant: coolant || 'sivi',
  }), [vc, vcRef, tool, settings.refLife, coolant]);
  const status = wearStatus(life);
  const partMinutes = Number(settings.partMinutes) > 0 ? Number(settings.partMinutes) : (cycleSeconds ? cycleSeconds / 60 : 1);
  const cost = useMemo(() => toolCost({
    toolPrice: settings.toolPrice, edges: settings.toolEdges, lifeMinutes: life, partMinutes, hourlyRate: settings.hourlyRate,
  }), [settings.toolPrice, settings.toolEdges, settings.hourlyRate, life, partMinutes]);
  const suggestedVc = useMemo(() => vcForTargetLife({
    targetLife: settings.targetLife || 30, vcRef, tool: tool === 'hss' ? 'hss' : 'karbur', refLife: settings.refLife || 15, coolant: coolant || 'sivi',
  }), [settings.targetLife, vcRef, tool, settings.refLife, coolant]);

  const cur = settings.currency || 'TL';
  const money = (v) => `${formatNumber(v, 2)} ${cur}`;
  const opTools = tools.filter((t) => !t.op || t.op === op);

  return (
    <View testID="tool-life-card">
      <View style={styles.head}>
        <View>
          <Eyebrow>TAKIM ÖMÜRÜ & MALIYET</Eyebrow>
          <Text style={styles.titleMd}>Ömür ve maliyet</Text>
        </View>
        <View style={{ paddingBottom: 2 }}>
          <StatusChip tone={STATUS_MAP[status].tone} icon={Timer} testID="wear-status">{STATUS_MAP[status].label}</StatusChip>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.twoCol}>
          <View style={[styles.colHalf, styles.colBorder]}>
            <Eyebrow>Tahmini takım ömürü</Eyebrow>
            <Text style={styles.metricXl} testID="tool-life-minutes">{formatNumber(life, life < 10 ? 1 : 0)}</Text>
            <Text style={styles.metricUnit}>dakika kesme</Text>
          </View>
          <View style={styles.colHalf}>
            <Eyebrow>Parça başı toplam</Eyebrow>
            <Text style={[styles.metricXl, { color: colors.foreground }]} testID="cost-per-part">{formatNumber(cost.totalPerPart, 2)}</Text>
            <Text style={styles.metricUnit}>{cur} / parça</Text>
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Takım maliyeti</Eyebrow>
            <Text style={styles.infoSub}>Uç başına {money(cost.costPerEdge)} · uçla {formatNumber(cost.partsPerEdge, 1)} parça</Text>
          </View>
          <Text style={styles.infoValueAccent} testID="tool-cost-part">{money(cost.toolCostPerPart)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Tezgâh maliyeti</Eyebrow>
            <Text style={styles.infoSub}>{formatNumber(settings.hourlyRate, 0)} {cur}/saat · {formatNumber(partMinutes, 2)} dk/parça</Text>
          </View>
          <Text style={styles.infoValue} testID="machine-cost-part">{money(cost.machineCostPerPart)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Referans</Eyebrow>
            <Text style={styles.infoSub}>
              Vc referans {formatQty('vc', vcRef, unitSystem)} {unitLabel('vc', unitSystem)} · T{settings.refLife || 15} dk ·{' '}
              {tool === 'hss' ? 'HSS n=0,125' : 'Karbür n=0,25'} · soğutma ×{coolantLifeFactor(coolant)}
            </Text>
          </View>
          <Gauge size={16} color={colors.mutedForeground} />
        </View>

        {status !== 'iyi' && onApplyVc ? (
          <Pressable
            onPress={() => {
              onApplyVc(Math.round(suggestedVc));
              toast.success(`Kesme hızı ${formatNumber(suggestedVc, 0)} yapıldı`, { description: `Hedef ömür ${settings.targetLife || 30} dk` });
            }}
            testID="apply-life-vc"
            style={styles.applyBanner}
          >
            <TriangleAlert size={15} color={colors.primary} />
            <Text style={styles.applyBannerText}>
              Ömür kısa — Vc {formatQty('vc', suggestedVc, unitSystem)} {unitLabel('vc', unitSystem)} yaparsan ömür {settings.targetLife || 30} dk olur (uygula)
            </Text>
          </Pressable>
        ) : null}

        {status === 'iyi' && onApplyVc ? (
          <View style={styles.infoBanner}>
            <Sparkles size={15} color={colors.success} />
            <Text style={styles.infoBannerText}>
              {settings.targetLife || 30} dk ömür için Vc {formatQty('vc', suggestedVc, unitSystem)} {unitLabel('vc', unitSystem)} olmalı
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { marginTop: spacing.md }]}>
        <View style={styles.infoRow}>
          <View style={styles.icon}><Coins size={18} color={colors.accent} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Maliyet girdileri</Text>
            <Text style={styles.infoSub}>Değerler tüm hesaplarda kullanılır</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <NumericField id="tl-price" label="Takım fiyatı" kind="deg" unitOverride={cur} value={settings.toolPrice} onChange={(v) => updateSettings({ toolPrice: v })} testID="input-tool-price" />
          </View>
          <View style={styles.colHalf}>
            <NumericField id="tl-edges" label="Kesici ağız" kind="deg" unitOverride="adet" value={settings.toolEdges} onChange={(v) => updateSettings({ toolEdges: Math.max(1, Math.round(v)) })} testID="input-tool-edges" />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <NumericField id="tl-rate" label="Tezgâh saat ücreti" kind="deg" unitOverride={`${cur}/s`} value={settings.hourlyRate} onChange={(v) => updateSettings({ hourlyRate: v })} testID="input-hourly-rate" />
          </View>
          <View style={styles.colHalf}>
            <NumericField id="tl-part" label="Parça süresi" kind="deg" unitOverride="dk" value={settings.partMinutes} onChange={(v) => updateSettings({ partMinutes: v })} testID="input-part-minutes" />
          </View>
        </View>
      </View>

      {opTools.length ? (
        <View style={[styles.card, { marginTop: spacing.md }]}>
          <View style={styles.infoRow}>
            <View style={styles.icon}><Wrench size={18} color={colors.accent} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>Takım kullanımı kaydet</Text>
              <Text style={styles.infoSub}>Bu hesabın kesme süresini takım sayacına ekle</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {opTools.map((t) => {
                const pct = t.lifeMinutes > 0 ? Math.min(100, ((t.usedMinutes || 0) / t.lifeMinutes) * 100) : 0;
                const active = selectedTool === t.id;
                return (
                  <Pressable key={t.id} onPress={() => setSelectedTool(active ? '' : t.id)} testID={`select-tool-${t.id}`} style={[styles.toolChip, active ? styles.toolChipActive : styles.toolChipInactive]}>
                    <Text style={[styles.toolChipLabel, active && { color: colors.primary }]}>{t.name}</Text>
                    <Text style={styles.toolChipSub}>%{formatNumber(pct, 0)} kullanıldı</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          {selectedTool ? (
            <Pressable
              onPress={() => { addToolUsage(selectedTool, partMinutes); toast.success(`${formatNumber(partMinutes, 2)} dk kullanım eklendi`); }}
              testID="add-tool-usage"
              style={styles.addUsageBtn}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={styles.addUsageText}>{formatNumber(partMinutes, 2)} dk kullanım ekle</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  twoCol: { flexDirection: 'row' },
  colHalf: { flex: 1, minWidth: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  colBorder: { borderRightWidth: 1, borderColor: colors.border },
  metricXl: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.primary, marginTop: 4 },
  metricUnit: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  infoSub: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  infoValue: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.foreground },
  infoValueAccent: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.accent },
  rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  icon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  applyBanner: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderTopWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(244,185,66,0.1)', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  applyBannerText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  infoBanner: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  infoBannerText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  toolChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toolChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)' },
  toolChipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  toolChipLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  toolChipSub: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  addUsageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(244,185,66,0.1)', paddingVertical: spacing.md },
  addUsageText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
});
