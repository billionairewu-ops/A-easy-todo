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

// Priority → vivid card theme (matches SwipeTaskCard palette)
const CARD_THEME = {
  urgent:   { bg: "#FFF0EF", border: "#FF1F1F38", accent: "#FF1F1F", label: "紧急" },
  track:    { bg: "#FFF8E6", border: "#F08A0038", accent: "#F08A00", label: "需跟踪" },
  remember: { bg: "#EFF2FF", border: "#1C44F538", accent: "#1C44F5", label: "记得做" },
} as const;

export function TaskCard({ task, onToggle, onEdit, onDelete }: Props) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteVisible = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          // Rubber-band: linear until -80 (delete reveal), then 20% damping beyond
          const x = g.dx > -80 ? g.dx : -80 + (g.dx + 80) * 0.2;
          translateX.setValue(Math.max(x, -96));
        } else if (deleteVisible.current) {
          // Swiping right to close delete — slight resistance
          translateX.setValue(Math.min(g.dx - 80, 0));
        }
      },
      onPanResponderRelease: (_, g) => {
        const spring = (toValue: number) =>
          Animated.spring(translateX, {
            toValue,
            useNativeDriver: true,
            tension: 180,
            friction: 12,
          }).start();

        if (!deleteVisible.current) {
          if (g.dx < -40 || g.vx < -0.5) {
            deleteVisible.current = true;
            spring(-80);
          } else {
            spring(0);
          }
        } else {
          // Delete revealed: swipe right >40px or fast velocity to close
          if (g.dx > 40 || g.vx > 0.5) {
            deleteVisible.current = false;
            spring(0);
          } else {
            spring(-80);
          }
        }
      },
    })
  ).current;

  const theme = CARD_THEME[task.priority];
  const deadline = task.deadline ? formatDeadline(task.deadline) : null;

  // Completed tasks: muted grey-ish card
  const cardBg = task.completed ? colors.card : theme.bg;
  const cardBorder = task.completed ? colors.border : theme.border;
  const accent = task.completed ? colors.mutedForeground : theme.accent;

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[styles.deleteBtn, { backgroundColor: colors.destructive }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete();
        }}
      >
        <Feather name="trash-2" size={20} color="#fff" />
      </Pressable>

      <Animated.View
        {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Priority dot strip (thin left border accent) */}
        <View style={[styles.strip, { backgroundColor: accent }]} />

        {/* Checkbox */}
        <Pressable
          style={[
            styles.checkbox,
            {
              borderColor: accent,
              backgroundColor: task.completed ? accent : "transparent",
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          hitSlop={8}
        >
          {task.completed && <Feather name="check" size={14} color="#fff" />}
        </Pressable>

        {/* Content */}
        <Pressable style={styles.content} onPress={onEdit}>
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
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {task.description}
            </Text>
          ) : null}

          <View style={styles.meta}>
            {/* Priority pill */}
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
                    {
                      color: deadline.overdue
                        ? colors.urgent
                        : deadline.today
                        ? colors.track
                        : colors.mutedForeground,
                    },
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
  strip: {
    width: 4,
    alignSelf: "stretch",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 21,
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deadline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  editIcon: {
    paddingLeft: 4,
  },
});
