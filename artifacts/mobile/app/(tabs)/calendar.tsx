import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CalendarDot } from "@/components/CalendarPicker";
import { CalendarPicker } from "@/components/CalendarPicker";
import { PriorityBadge } from "@/components/PriorityBadge";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import type { Priority, Task } from "@/context/TaskContext";
import { useTasks } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, updateTask, deleteTask, toggleComplete } = useTasks();

  const [selected, setSelected] = useState<string>(todayYMD());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const dots: CalendarDot[] = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline && !t.completed)
        .map((t) => ({ date: t.deadline!, priority: t.priority })),
    [tasks]
  );

  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline === selected)
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const order: Record<Priority, number> = { urgent: 0, track: 1, remember: 2 };
          return order[a.priority] - order[b.priority];
        }),
    [tasks, selected]
  );

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 + 90 : 90;

  const handleSave = (data: {
    title: string;
    description: string;
    priority: Priority;
    deadline: string | null;
  }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    }
    setModalVisible(false);
    setEditingTask(null);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    setModalVisible(false);
    setEditingTask(null);
  };

  const dateLabel = useMemo(() => {
    const today = todayYMD();
    const [y, m, d] = selected.split("-").map(Number);
    if (selected === today) return "今天";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    if (selected === tomorrowStr) return "明天";
    return `${m}月${d}日`;
  }, [selected]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
        stickyHeaderIndices={[0]}
      >
        {/* Title */}
        <View style={[styles.titleBlock, { backgroundColor: colors.background }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>日历</Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarWrap}>
          <CalendarPicker
            selected={selected}
            onSelect={(d) => {
              Haptics.selectionAsync();
              setSelected(d);
            }}
            dots={dots}
          />
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "紧急", color: colors.urgent },
            { label: "需跟踪", color: colors.track },
            { label: "记得做", color: colors.remember },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected day tasks */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayLabel, { color: colors.foreground }]}>{dateLabel}的任务</Text>
          <View style={[styles.dayCountBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.dayCount, { color: colors.mutedForeground }]}>
              {selectedTasks.length}
            </Text>
          </View>
        </View>

        {selectedTasks.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="sun" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>
              这天没有任务
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {selectedTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleComplete(t.id);
                }}
                onEdit={() => {
                  setEditingTask(t);
                  setModalVisible(true);
                }}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TaskModal
        visible={modalVisible}
        task={editingTask}
        onSave={handleSave}
        onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
        onClose={() => {
          setModalVisible(false);
          setEditingTask(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { gap: 14 },
  titleBlock: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  calendarWrap: {
    paddingHorizontal: 16,
  },
  legend: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  dayLabel: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  dayCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  dayCount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  emptyDay: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyDayText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  taskList: {
    gap: 0,
  },
});
