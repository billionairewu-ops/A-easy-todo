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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarPicker } from "@/components/CalendarPicker";
import type { Priority } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;

interface Props {
  visible: boolean;
  onSave: (data: { title: string; priority: Priority; deadline: string | null }) => void;
  onClose: () => void;
}

const PRIORITY_META: Record<
  Priority,
  { label: string; lightBg: string; darkBg: string; accent: string; icon: string }
> = {
  urgent: {
    label: "紧急",
    lightBg: "#FEF2F2",
    darkBg: "#FEE2E2",
    accent: "#EF4444",
    icon: "🔴",
  },
  track: {
    label: "需跟踪",
    lightBg: "#FFFBEB",
    darkBg: "#FEF3C7",
    accent: "#F59E0B",
    icon: "🟡",
  },
  remember: {
    label: "记得做",
    lightBg: "#EFF6FF",
    darkBg: "#DBEAFE",
    accent: "#3B82F6",
    icon: "🔵",
  },
};

export function SwipeTaskCard({ visible, onSave, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [livePriority, setLivePriority] = useState<Priority>("track");

  const dragX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setContent("");
      setDeadline(null);
      setShowCalendar(false);
      setLivePriority("track");
      dragX.setValue(0);
      isAnimating.current = false;
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Track live priority from drag position
  useEffect(() => {
    const id = dragX.addListener(({ value }) => {
      if (value < -30) setLivePriority("urgent");
      else if (value > 30) setLivePriority("remember");
      else setLivePriority("track");
    });
    return () => dragX.removeListener(id);
  }, []);

  const meta = PRIORITY_META[livePriority];

  const cardBg = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 1.2, 0, SWIPE_THRESHOLD * 1.2],
    outputRange: [
      PRIORITY_META.urgent.darkBg,
      PRIORITY_META.track.lightBg,
      PRIORITY_META.remember.darkBg,
    ],
    extrapolate: "clamp",
  });

  const cardRotate = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: ["-6deg", "0deg", "6deg"],
    extrapolate: "clamp",
  });

  const urgentHintOpacity = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });

  const rememberHintOpacity = dragX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0, 0.4, 1],
    extrapolate: "clamp",
  });

  const flyOff = (priority: Priority, direction: "left" | "right" | "up") => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const toX =
      direction === "left"
        ? -SCREEN_WIDTH * 1.4
        : direction === "right"
        ? SCREEN_WIDTH * 1.4
        : 0;

    Animated.parallel([
      Animated.timing(dragX, { toValue: toX, duration: 220, useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (content.trim()) {
        onSave({ title: content.trim(), priority, deadline });
      }
      onClose();
    });
  };

  const dismiss = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.spring(dragX, { toValue: 0, useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.spring(cardScale, {
        toValue: 0.92,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start(onClose);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        dragX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (isAnimating.current) return;
        if (g.dx < -SWIPE_THRESHOLD) {
          flyOff("urgent", "left");
        } else if (g.dx > SWIPE_THRESHOLD) {
          flyOff("remember", "right");
        } else {
          Animated.spring(dragX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 120,
            friction: 8,
          }).start();
          setLivePriority("track");
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Card */}
      <KeyboardAvoidingView
        style={styles.kavWrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.cardOuter,
            {
              opacity: cardOpacity,
              transform: [
                { scale: cardScale },
                { translateX: dragX },
                { rotate: cardRotate },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.card, { backgroundColor: cardBg }]}>
            {/* Drag handle + swipe hints */}
            <View {...panResponder.panHandlers} style={styles.dragZone}>
              <Animated.View style={[styles.hintLeft, { opacity: urgentHintOpacity }]}>
                <Feather name="chevron-left" size={14} color={PRIORITY_META.urgent.accent} />
                <Text style={[styles.hintText, { color: PRIORITY_META.urgent.accent }]}>
                  紧急
                </Text>
              </Animated.View>

              <View style={styles.priorityCenter}>
                <View
                  style={[
                    styles.priorityPill,
                    { backgroundColor: meta.accent + "22", borderColor: meta.accent + "44" },
                  ]}
                >
                  <View style={[styles.priorityDot, { backgroundColor: meta.accent }]} />
                  <Text style={[styles.priorityPillText, { color: meta.accent }]}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <Animated.View style={[styles.hintRight, { opacity: rememberHintOpacity }]}>
                <Text style={[styles.hintText, { color: PRIORITY_META.remember.accent }]}>
                  记得做
                </Text>
                <Feather name="chevron-right" size={14} color={PRIORITY_META.remember.accent} />
              </Animated.View>
            </View>

            {/* Handle bar */}
            <View {...panResponder.panHandlers} style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: meta.accent + "44" }]} />
            </View>

            {/* Content input */}
            <TextInput
              style={[styles.contentInput, { color: colors.foreground }]}
              placeholder="写下你的任务..."
              placeholderTextColor={meta.accent + "88"}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={300}
              autoFocus
              textAlignVertical="top"
            />

            {/* Deadline */}
            <View style={styles.deadlineSection}>
              <Pressable
                style={[
                  styles.deadlineBtn,
                  {
                    backgroundColor: deadline ? meta.accent + "18" : "rgba(0,0,0,0.05)",
                    borderColor: deadline ? meta.accent + "55" : "rgba(0,0,0,0.08)",
                  },
                ]}
                onPress={() => setShowCalendar((v) => !v)}
              >
                <Feather
                  name="calendar"
                  size={14}
                  color={deadline ? meta.accent : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.deadlineBtnText,
                    { color: deadline ? meta.accent : colors.mutedForeground },
                  ]}
                >
                  {deadline
                    ? (() => {
                        const [y, m, d] = deadline.split("-");
                        return `${y}年${Number(m)}月${Number(d)}日`;
                      })()
                    : "设置截止日期"}
                </Text>
                {deadline && (
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => {
                      e.stopPropagation();
                      setDeadline(null);
                      setShowCalendar(false);
                    }}
                  >
                    <Feather name="x" size={13} color={meta.accent} />
                  </Pressable>
                )}
              </Pressable>

              {showCalendar && (
                <View style={styles.calendarWrap}>
                  <CalendarPicker
                    selected={deadline}
                    onSelect={(d) => {
                      setDeadline(d);
                      setShowCalendar(false);
                      Haptics.selectionAsync();
                    }}
                    compact
                  />
                </View>
              )}
            </View>

            {/* Bottom priority buttons */}
            <View style={styles.actionsRow}>
              {(["urgent", "track", "remember"] as Priority[]).map((p) => {
                const m = PRIORITY_META[p];
                const active = livePriority === p;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: active ? m.accent : m.accent + "22",
                        borderColor: m.accent + (active ? "ff" : "44"),
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (!content.trim()) return;
                      flyOff(
                        p,
                        p === "urgent" ? "left" : p === "remember" ? "right" : "up"
                      );
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: active ? "#fff" : m.accent }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.swipeHint, { color: meta.accent + "88" }]}>
              左划紧急 · 右划记得做 · 或点击上方按钮
            </Text>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kavWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    pointerEvents: "box-none",
  } as any,
  cardOuter: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  dragZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  hintLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hintRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  priorityCenter: {
    alignItems: "center",
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityPillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  handleBar: {
    alignItems: "center",
    marginTop: -8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  contentInput: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
    minHeight: 100,
    paddingTop: 4,
  },
  deadlineSection: {
    gap: 8,
  },
  deadlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  deadlineBtnText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  calendarWrap: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  swipeHint: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -4,
  },
});
