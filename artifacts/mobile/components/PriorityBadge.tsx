import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Priority } from "@/context/TaskContext";

interface Props {
  priority: Priority;
  size?: "sm" | "md";
}

const LABELS: Record<Priority, string> = {
  urgent: "紧急",
  track: "需跟踪",
  remember: "记得做",
};

export function PriorityBadge({ priority, size = "md" }: Props) {
  const colors = useColors();

  const bgColor =
    priority === "urgent"
      ? colors.urgentLight
      : priority === "track"
      ? colors.trackLight
      : colors.rememberLight;

  const textColor =
    priority === "urgent"
      ? colors.urgentDark
      : priority === "track"
      ? colors.trackDark
      : colors.rememberDark;

  const dotColor =
    priority === "urgent"
      ? colors.urgent
      : priority === "track"
      ? colors.track
      : colors.remember;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === "sm" && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: dotColor }, size === "sm" && styles.dotSm]} />
      <Text style={[styles.text, { color: textColor }, size === "sm" && styles.textSm]}>
        {LABELS[priority]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  textSm: {
    fontSize: 11,
  },
});
