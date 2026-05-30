import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CalendarPicker } from "@/components/CalendarPicker";
import type { Priority } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_H = 75;
const SWIPE_UP = 45;
const SWIPE_VY = -0.4;

interface Props {
  visible: boolean;
  onSave: (data: { title: string; priority: Priority; deadline: string | null }) => void;
  onClose: () => void;
}

// Single unified card color per priority — no multi-zone color banding
const META: Record<Priority, { label: string; bg: string; saveBg: string; accent: string; divider: string }> = {
  urgent:   { label: "紧急",   bg: "#FFE0E0", saveBg: "#FFCECE", accent: "#E8001D", divider: "#E8001D28" },
  track:    { label: "需跟踪", bg: "#FFF0C8", saveBg: "#FFE490", accent: "#E07800", divider: "#E0780028" },
  remember: { label: "记得做", bg: "#DDE8FF", saveBg: "#C8D9FF", accent: "#1C44F5", divider: "#1C44F528" },
};

export function SwipeTaskCard({ visible, onSave, onClose }: Props) {
  const colors = useColors();
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [displayPriority, setDisplayPriority] = useState<Priority>("track");

  // Refs so PanResponder closures always read latest values
  const contentRef = useRef("");
  const deadlineRef = useRef<string | null>(null);
  const committedPriority = useRef<Priority>("track");
  const isAnimating = useRef(false);
  const textRef = useRef<TextInput>(null);

  const handleSetContent = (v: string) => { contentRef.current = v; setContent(v); };
  const handleSetDeadline = (v: string | null) => { deadlineRef.current = v; setDeadline(v); };

  // Animated values
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const saveScaleAnim = useRef(new Animated.Value(1)).current;

  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ["-7deg", "0deg", "7deg"],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (!visible) return;
    contentRef.current = "";
    deadlineRef.current = null;
    committedPriority.current = "track";
    isAnimating.current = false;
    setContent("");
    setDeadline(null);
    setShowCal(false);
    setDisplayPriority("track");
    translateX.setValue(0);
    translateY.setValue(0);
    saveScaleAnim.setValue(1);

    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const springBack = () =>
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 160, friction: 9 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 160, friction: 9 }),
    ]).start();

  // flyUpRef: reassigned every render so PanResponder always calls latest version
  const flyUpRef = useRef(() => {});
  flyUpRef.current = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -SCREEN_H, duration: 300, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      if (contentRef.current.trim()) {
        onSave({ title: contentRef.current.trim(), priority: committedPriority.current, deadline: deadlineRef.current });
      }
      onClose();
    });
  };

  const dismiss = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 0.9, useNativeDriver: true }),
    ]).start(onClose);
  };

  // ── PanResponder A: Header — left / right priority selection ─────────────
  const headerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { textRef.current?.blur(); },
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        translateY.setValue(g.dy * 0.1);
        setDisplayPriority(g.dx > 20 ? "urgent" : g.dx < -20 ? "remember" : committedPriority.current);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_H) {
          committedPriority.current = "urgent";
          setDisplayPriority("urgent");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (g.dx < -SWIPE_H) {
          committedPriority.current = "remember";
          setDisplayPriority("remember");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          setDisplayPriority(committedPriority.current);
        }
        springBack();
      },
    })
  ).current;

  // ── PanResponder B: Save zone — upward swipe to save ─────────────────────
  const savePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { Keyboard.dismiss(); },
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) {
          translateY.setValue(g.dy);
          const pct = Math.min(Math.abs(g.dy) / SWIPE_UP, 1);
          saveScaleAnim.setValue(1 + pct * 0.06);
        }
      },
      onPanResponderRelease: (_, g) => {
        saveScaleAnim.setValue(1);
        if (g.dy < -SWIPE_UP || g.vy < SWIPE_VY) {
          flyUpRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 160, friction: 9 }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const m = META[displayPriority];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateX }, { translateY }, { rotate }],
            },
          ]}
        >
          {/* Entire card shares one background color */}
          <View style={[styles.card, { backgroundColor: m.bg }]}>

            {/* ── Header: left/right swipe to select priority ── */}
            <View
              {...headerPan.panHandlers}
              style={[styles.headerZone, { borderBottomColor: m.divider }]}
            >
              <View style={styles.headerSide}>
                <Feather name="chevron-left" size={16} color={META.remember.accent} />
                <Text style={[styles.sideLabel, { color: META.remember.accent }]}>记得做</Text>
              </View>

              <View style={[styles.badge, { borderColor: m.accent + "55", backgroundColor: "rgba(255,255,255,0.5)" }]}>
                <View style={[styles.badgeDot, { backgroundColor: m.accent }]} />
                <Text style={[styles.badgeText, { color: m.accent }]}>{m.label}</Text>
              </View>

              <View style={[styles.headerSide, styles.headerRight]}>
                <Text style={[styles.sideLabel, { color: META.urgent.accent }]}>紧急</Text>
                <Feather name="chevron-right" size={16} color={META.urgent.accent} />
              </View>
            </View>

            <Text style={[styles.swipeHint, { color: m.accent + "88" }]}>← 拖动顶部换优先级 →</Text>

            {/* ── Text input — no Android border ── */}
            <TextInput
              ref={textRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="写下你的任务内容..."
              placeholderTextColor={m.accent + "70"}
              value={content}
              onChangeText={handleSetContent}
              multiline
              maxLength={500}
              autoFocus
              textAlignVertical="top"
              scrollEnabled={false}
              underlineColorAndroid="transparent"
            />

            {/* ── Deadline ── */}
            <View style={[styles.deadlineSection, { borderTopColor: m.divider }]}>
              <Pressable
                style={[
                  styles.deadlineBtn,
                  {
                    backgroundColor: "rgba(255,255,255,0.45)",
                    borderColor: deadline ? m.accent + "55" : "rgba(255,255,255,0.7)",
                  },
                ]}
                onPress={() => setShowCal((v) => !v)}
              >
                <Feather name="calendar" size={14} color={deadline ? m.accent : m.accent + "99"} />
                <Text style={[styles.deadlineText, { color: deadline ? m.accent : m.accent + "99" }]}>
                  {deadline
                    ? (() => { const [y, mo, d] = deadline.split("-"); return `${y}年${+mo}月${+d}日`; })()
                    : "设置截止日期"}
                </Text>
                {deadline && (
                  <Pressable hitSlop={12} onPress={(e) => { e.stopPropagation(); handleSetDeadline(null); setShowCal(false); }}>
                    <Feather name="x-circle" size={14} color={m.accent} />
                  </Pressable>
                )}
              </Pressable>
              {showCal && (
                <CalendarPicker
                  selected={deadline}
                  onSelect={(d) => { handleSetDeadline(d); setShowCal(false); }}
                  compact
                />
              )}
            </View>

            {/* ── Save zone: slightly deeper shade, top border ── */}
            <Animated.View
              {...savePan.panHandlers}
              style={[
                styles.saveZone,
                {
                  backgroundColor: m.saveBg,
                  borderTopColor: m.divider,
                  transform: [{ scale: saveScaleAnim }],
                },
              ]}
            >
              <Feather name="arrow-up" size={18} color={m.accent} />
              <View style={styles.saveLabels}>
                <Text style={[styles.saveMain, { color: m.accent }]}>上划保存</Text>
                <Text style={[styles.saveSub, { color: m.accent + "bb" }]}>保存为「{m.label}」</Text>
              </View>
              <Feather name="arrow-up" size={18} color={m.accent} />
            </Animated.View>

          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_W = Math.min(SCREEN_W - 32, 420);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  kav: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "box-none",
  } as any,
  cardWrapper: {
    width: CARD_W,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
  },

  // Header
  headerZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { flexDirection: "row", alignItems: "center", gap: 5, width: 72 },
  headerRight: { justifyContent: "flex-end" },
  sideLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  swipeHint: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingTop: 7,
    paddingBottom: 2,
  },

  // Input
  input: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    lineHeight: 27,
    minHeight: 120,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },

  // Deadline
  deadlineSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deadlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deadlineText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },

  // Save zone
  saveZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveLabels: { alignItems: "center", gap: 2 },
  saveMain: { fontSize: 16, fontFamily: "Inter_700Bold" },
  saveSub: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
