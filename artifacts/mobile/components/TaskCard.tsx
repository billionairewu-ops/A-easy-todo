import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Task } from "@/context/TaskContext";

interface Props {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDeadline(deadline: string): { label: string; overdue: boolean; today: boolean } {
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return { label: `逾期 ${Math.abs(diff)} 天`, overdue: true, today: false };
  if (diff === 0) return { label: "今天到期", overdue: false, today: true };
  if (diff === 1) return { label: "明天到期", overdue: false, today: false };
  return { label: `${d.getMonth() + 1}月${d.getDate()}日`, overdue: false, today: false };
}

const CARD_THEME = {
  urgent:   { bg: "#FFF0EF", border: "#FF1F1F38", accent: "#FF1F1F", label: "紧急" },
  track:    { bg: "#FFF8E6", border: "#F08A0038", accent: "#F08A00", label: "需跟踪" },
  remember: { bg: "#EFF2FF", border: "#1C44F538", accent: "#1C44F5", label: "记得做" },
} as const;

const LONG_PRESS_MS = 2000;

export function TaskCard({ task, onToggle, onEdit, onDelete }: Props) {
  const colors = useColors();

  // ── Swipe-to-delete ────────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteVisible = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          const x = g.dx > -80 ? g.dx : -80 + (g.dx + 80) * 0.2;
          translateX.setValue(Math.max(x, -96));
        } else if (deleteVisible.current) {
          translateX.setValue(Math.min(g.dx - 80, 0));
        }
      },
      onPanResponderRelease: (_, g) => {
        const spring = (toValue: number) =>
          Animated.spring(translateX, { toValue, useNativeDriver: true, tension: 180, friction: 12 }).start();
        if (!deleteVisible.current) {
          if (g.dx < -40 || g.vx < -0.5) { deleteVisible.current = true; spring(-80); }
          else { spring(0); }
        } else {
          if (g.dx > 40 || g.vx > 0.5) { deleteVisible.current = false; spring(0); }
          else { spring(-80); }
        }
      },
    })
  ).current;

  // ── Long-press-to-delete ───────────────────────────────────────────────────
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);
  const longPressTriggered = useRef(false);

  const startProgress = () => {
    longPressTriggered.current = false;
    progress.setValue(0);
    progressAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: LONG_PRESS_MS,
      useNativeDriver: false,
    });
    progressAnim.current.start();
  };

  const cancelProgress = () => {
    progressAnim.current?.stop();
    if (!longPressTriggered.current) {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  };

  const handleLongPress = () => {
    longPressTriggered.current = true;
    progressAnim.current?.stop();
    progress.setValue(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDelete();
  };

  // ─ Derived styles
  const theme = CARD_THEME[task.priority];
  const deadline = task.deadline ? formatDeadline(task.deadline) : null;
  const cardBg = task.completed ? colors.card : theme.bg;
  const cardBorder = task.completed ? colors.border : theme.border;
  const accent = task.completed ? colors.mutedForeground : theme.accent;

  // Progress bar width as %
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  // Card border interpolates toward red as progress fills
  const cardBorderColor = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [cardBorder, "#EF444455", "#EF4444"],
  });

  return (
    <View style={styles.wrapper}>
      {/* Swipe-reveal delete button */}
      <Pressable
        style={[styles.deleteBtn, { backgroundColor: colors.destructive }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(); }}
      >
        <Feather name="trash-2" size={20} color="#fff" />
      </Pressable>

      <Animated.View
        {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorderColor, transform: [{ translateX }] },
        ]}
      >
        {/* Priority accent strip */}
        <View style={[styles.strip, { backgroundColor: accent }]} />

        {/* Checkbox */}
        <Pressable
          style={[styles.checkbox, { borderColor: accent, backgroundColor: task.completed ? accent : "transparent" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}
          hitSlop={8}
        >
          {task.completed && <Feather name="check" size={14} color="#fff" />}
        </Pressable>

        {/* Content — long-press here to delete */}
        <Pressable
          style={styles.content}
          onPress={onEdit}
          onPressIn={startProgress}
          onPressOut={cancelProgress}
          onLongPress={handleLongPress}
          delayLongPress={LONG_PRESS_MS}
        >
          <Text
            style={[
              styles.title,
              { color: task.completed ? colors.mutedForeground : colors.foreground },
              task.completed && styles.strikethrough,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}

          <View style={styles.meta}>
            <View style={[styles.pill, { backgroundColor: accent + "22", borderColor: accent + "44" }]}>
              <View style={[styles.pillDot, { backgroundColor: accent }]} />
              <Text style={[styles.pillText, { color: accent }]}>{theme.label}</Text>
            </View>

            {deadline && (
              <View style={styles.deadlineRow}>
                <Feather
                  name="calendar"
                  size={11}
                  color={deadline.overdue ? colors.urgent : deadline.today ? colors.track : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.deadline,
                    { color: deadline.overdue ? colors.urgent : deadline.today ? colors.track : colors.mutedForeground },
                  ]}
                >
                  {deadline.label}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable onPress={onEdit} hitSlop={8} style={styles.editIcon}>
          <Feather name="chevron-right" size={16} color={accent + "88"} />
        </Pressable>

        {/* Long-press progress bar — fills from left, turns red */}
        <Animated.View
          style={[styles.progressBar, { width: barWidth }]}
          pointerEvents="none"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginHorizontal: 16,
    marginVertical: 5,
  },
  deleteBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 70,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    paddingVertical: 13,
    paddingRight: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  strip: { width: 4, alignSelf: "stretch" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 5 },
  title: { fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 21 },
  strikethrough: { textDecorationLine: "line-through" },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  deadline: { fontSize: 11, fontFamily: "Inter_500Medium" },
  editIcon: { paddingLeft: 4 },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: "#EF4444",
    borderRadius: 2,
  },
});
