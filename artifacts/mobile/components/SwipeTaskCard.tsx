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
const SWIPE_H = 75;   // left/right to commit priority
const SWIPE_UP = 55;  // upward to save

interface Props {
  visible: boolean;
  onSave: (data: { title: string; priority: Priority; deadline: string | null }) => void;
  onClose: () => void;
}

const META: Record<Priority, { label: string; bg: string; tint: string; accent: string }> = {
  urgent:   { label: "紧急",   bg: "#FEF2F2", tint: "#FEE2E2", accent: "#EF4444" },
  track:    { label: "需跟踪", bg: "#FFFBEB", tint: "#FEF3C7", accent: "#F59E0B" },
  remember: { label: "记得做", bg: "#EFF6FF", tint: "#DBEAFE", accent: "#3B82F6" },
};

export function SwipeTaskCard({ visible, onSave, onClose }: Props) {
  const colors = useColors();
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [displayPriority, setDisplayPriority] = useState<Priority>("track");

  const committedPriority = useRef<Priority>("track");
  const isAnimating = useRef(false);
  const textRef = useRef<TextInput>(null);

  // Animated values — all useNativeDriver: true
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const saveZoneScale = useRef(new Animated.Value(1)).current;

  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  });

  // ── Entrance / Reset ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    setContent("");
    setDeadline(null);
    setShowCal(false);
    setDisplayPriority("track");
    committedPriority.current = "track";
    isAnimating.current = false;
    translateX.setValue(0);
    translateY.setValue(0);
    saveZoneScale.setValue(1);

    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const springBack = () =>
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 160, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 160, friction: 8 }),
    ]).start();

  const flyUp = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.parallel([
      Animated.timing(translateY, { toValue: -SCREEN_H, duration: 300, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      if (content.trim()) {
        onSave({ title: content.trim(), priority: committedPriority.current, deadline });
      }
      onClose();
    });
  };

  const dismiss = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 0.88, useNativeDriver: true }),
    ]).start(onClose);
  };

  // ── PanResponder A: Header — left / right ─────────────────────────────────
  const headerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { textRef.current?.blur(); },
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        translateY.setValue(g.dy * 0.15);
        setDisplayPriority(
          g.dx < -20 ? "urgent" : g.dx > 20 ? "remember" : committedPriority.current
        );
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_H) {
          committedPriority.current = "urgent";
          setDisplayPriority("urgent");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (g.dx > SWIPE_H) {
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

  // ── PanResponder B: Save zone — upward ───────────────────────────────────
  const savePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { Keyboard.dismiss(); },
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) {
          translateY.setValue(g.dy);
          // Save zone grows as card lifts
          const progress = Math.min(Math.abs(g.dy) / SWIPE_UP, 1);
          saveZoneScale.setValue(1 + progress * 0.12);
        }
      },
      onPanResponderRelease: (_, g) => {
        saveZoneScale.setValue(1);
        if (g.dy < -SWIPE_UP) {
          flyUp();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 160, friction: 8 }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const m = META[displayPriority];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Card */}
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
          <View style={[styles.card, { backgroundColor: m.bg }]}>

            {/* ── Zone A: Header (left / right swipe) ─────────────────── */}
            <View {...headerPan.panHandlers} style={[styles.headerZone, { backgroundColor: m.tint }]}>
              <View style={styles.headerLeft}>
                <Feather name="chevron-left" size={18} color={META.urgent.accent} />
                <Text style={[styles.hintSideText, { color: META.urgent.accent }]}>紧急</Text>
              </View>

              <View style={[styles.priorityBadge, { borderColor: m.accent + "60", backgroundColor: m.accent + "18" }]}>
                <View style={[styles.dot, { backgroundColor: m.accent }]} />
                <Text style={[styles.priorityText, { color: m.accent }]}>{m.label}</Text>
              </View>

              <View style={styles.headerRight}>
                <Text style={[styles.hintSideText, { color: META.remember.accent }]}>记得做</Text>
                <Feather name="chevron-right" size={18} color={META.remember.accent} />
              </View>
            </View>

            <Text style={[styles.zoneHint, { color: m.accent + "88" }]}>
              ← 左右拖动选分类
            </Text>

            {/* ── Zone B: Text input (free for typing) ────────────────── */}
            <TextInput
              ref={textRef}
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="写下你的任务内容..."
              placeholderTextColor={m.accent + "66"}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={500}
              autoFocus
              textAlignVertical="top"
              scrollEnabled={false}
            />

            {/* Deadline */}
            <View style={styles.deadlineWrap}>
              <Pressable
                style={[
                  styles.deadlineBtn,
                  {
                    backgroundColor: deadline ? m.accent + "14" : "rgba(0,0,0,0.04)",
                    borderColor: deadline ? m.accent + "50" : "rgba(0,0,0,0.08)",
                  },
                ]}
                onPress={() => setShowCal((v) => !v)}
              >
                <Feather name="calendar" size={15} color={deadline ? m.accent : colors.mutedForeground} />
                <Text style={[styles.deadlineText, { color: deadline ? m.accent : colors.mutedForeground }]}>
                  {deadline
                    ? (() => { const [y, mo, d] = deadline.split("-"); return `${y}年${+mo}月${+d}日`; })()
                    : "设置截止日期"}
                </Text>
                {deadline && (
                  <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); setDeadline(null); setShowCal(false); }}>
                    <Feather name="x-circle" size={15} color={m.accent} />
                  </Pressable>
                )}
              </Pressable>
              {showCal && (
                <CalendarPicker selected={deadline} onSelect={(d) => { setDeadline(d); setShowCal(false); }} compact />
              )}
            </View>

            {/* ── Zone C: Save zone (upward swipe) ────────────────────── */}
            <Animated.View
              {...savePan.panHandlers}
              style={[
                styles.saveZone,
                {
                  backgroundColor: m.accent + "18",
                  borderColor: m.accent + "40",
                  transform: [{ scale: saveZoneScale }],
                },
              ]}
            >
              <Feather name="arrow-up" size={22} color={m.accent} />
              <Text style={[styles.saveLabel, { color: m.accent }]}>
                上划保存为「{m.label}」
              </Text>
              <Feather name="arrow-up" size={22} color={m.accent} />
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
    backgroundColor: "rgba(0,0,0,0.52)",
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
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 22,
  },
  card: {
    borderRadius: 26,
    overflow: "hidden",
    gap: 0,
  },

  // ── Header zone ──────────────────────────────────────────────────────────
  headerZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 72,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 72,
    justifyContent: "flex-end",
  },
  hintSideText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // ── Zone hint ─────────────────────────────────────────────────────────────
  zoneHint: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
  },

  // ── Text input ────────────────────────────────────────────────────────────
  textInput: {
    fontSize: 19,
    fontFamily: "Inter_400Regular",
    lineHeight: 28,
    minHeight: 130,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // ── Deadline ──────────────────────────────────────────────────────────────
  deadlineWrap: { paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  deadlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  deadlineText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

  // ── Save zone ─────────────────────────────────────────────────────────────
  saveZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 22,
    marginHorizontal: 0,
    borderTopWidth: 1.5,
  },
  saveLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
