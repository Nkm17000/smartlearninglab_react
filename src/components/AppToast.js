import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { colors } from '../theme';
import { subscribeNotifications } from '../services/notifications';

export default function AppToast() {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  useEffect(() => subscribeNotifications(event => {
    if (timer.current) clearTimeout(timer.current);
    setToast(event);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    }, event.duration || 3200);
  }), []);

  if (!toast) return null;
  const success = toast.type === 'success';
  const info = toast.type === 'info';
  const accent = success ? colors.success : info ? colors.primary : colors.danger;
  return (
    <Animated.View pointerEvents="box-none" style={{
      position: 'fixed', top: Platform.OS === 'web' ? 18 : 50, left: 0, right: 0,
      alignItems: 'center', zIndex: 99999, opacity
    }}>
      <Pressable onPress={() => { if (timer.current) clearTimeout(timer.current); setToast(null); }}
        style={{ maxWidth: 560, width: '92%', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
          borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 14, padding: 13, paddingRight: 38,
          shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: {width:0,height:6}, elevation: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: accent, marginBottom: 3 }}>
          {success ? 'Success' : info ? 'Information' : 'Error'}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text }}>{toast.message}</Text>
        <Text style={{ position: 'absolute', right: 13, top: 10, fontSize: 18, color: colors.subtle }}>×</Text>
      </Pressable>
    </Animated.View>
  );
}
