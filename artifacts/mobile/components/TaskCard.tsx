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
import { PriorityBadge } from "./PriorityBadge";

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
  return {
    label: `${d.getMonth() + 1}月${d.getDate()}日`,
    overdue: false,
    today: false,
  };
}

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
          translateX.setValue(Math.max(g.dx, -80));
        } else if (deleteVisible.current) {
          translateX.setValue(Math.min(g.dx - 80, 0));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
          deleteVisible.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          deleteVisible.current = false;
        }
      },
    })
  ).current;

  const accentColor =
    task.priority === "urgent"
      ? colors.urgent
      : task.priority === "track"
      ? colors.track
      : colors.remember;

  const deadline = task.deadline ? formatDeadline(task.deadline) : null;

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
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <Pressable
          style={[
            styles.checkbox,
            {
              borderColor: task.completed ? accentColor : colors.border,
              backgroundColor: task.completed ? accentColor : "transparent",
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

        <Pressable style={styles.content} onPress={onEdit}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: colors.foreground },
                task.completed && { color: colors.mutedForeground, textDecorationLine: "line-through" },
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>

          {task.description ? (
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {task.description}
            </Text>
          ) : null}

          <View style={styles.meta}>
            <PriorityBadge priority={task.priority} size="sm" />
            {deadline ? (
              <View style={styles.deadlineRow}>
                <Feather
                  name="calendar"
                  size={11}
                  color={
                    deadline.overdue
                      ? colors.urgent
                      : deadline.today
                      ? colors.track
                      : colors.mutedForeground
                  }
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
            ) : null}
          </View>
        </Pressable>

        <Pressable onPress={onEdit} hitSlop={8} style={styles.editIcon}>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
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
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 12,
    paddingRight: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 0,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 21,
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
