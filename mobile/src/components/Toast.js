import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, TriangleAlert, CircleX, Info, X } from 'lucide-react-native';
import { colors, radius, spacing, fonts, alpha } from '../theme';

const ToastContext = createContext(null);

const TONE = {
  success: { icon: CircleCheck, fg: colors.success, border: alpha(colors.success, 0.4) },
  error: { icon: CircleX, fg: colors.destructive, border: alpha(colors.destructive, 0.4) },
  warning: { icon: TriangleAlert, fg: colors.primary, border: alpha(colors.primary, 0.4) },
  info: { icon: Info, fg: colors.accent, border: alpha(colors.accent, 0.4) },
};

function ToastItem({ item, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const t = TONE[item.type] || TONE.info;
  const Icon = t.icon;

  React.useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDismiss(item.id));
    }, item.duration || 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.toast, { borderColor: t.border, opacity }]} testID="toast">
      <Icon size={18} color={t.fg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.toastTitle}>{item.message}</Text>
        {item.description ? <Text style={styles.toastDesc}>{item.description}</Text> : null}
      </View>
      <Pressable onPress={() => onDismiss(item.id)} hitSlop={8} testID="toast-close">
        <X size={16} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setItems((prev) => [...prev.slice(-2), { id, type, message, description: opts.description, duration: opts.duration }]);
  }, []);

  const api = React.useMemo(() => ({
    success: (message, opts) => push('success', message, opts),
    error: (message, opts) => push('error', message, opts),
    warning: (message, opts) => push('warning', message, opts),
    info: (message, opts) => push('info', message, opts),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 8 }]}>
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.sm, zIndex: 300 },
  toast: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.card,
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  toastTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.cardForeground },
  toastDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
});
