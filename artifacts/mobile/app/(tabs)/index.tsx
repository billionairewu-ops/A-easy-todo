import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import type { Priority, Task } from "@/context/TaskContext";
import { useTasks } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { value: Priority | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "urgent", label: "紧急" },
  { value: "track", label: "需跟踪" },
  { value: "remember", label: "记得做" },
];

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, track: 1, remember: 2 };

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, addTask, updateTask, deleteTask, toggleComplete, filter, setFilter } = useTasks();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const base = filter === "all" ? tasks : tasks.filter((t) => t.priority === filter);
    const pending = base
      .filter((t) => !t.completed)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority];
        const pb = PRIORITY_ORDER[b.priority];
        if (pa !== pb) return pa - pb;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    const done = base.filter((t) => t.completed).sort((a, b) =>
      (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
    );
    return [...pending, ...done];
  }, [tasks, filter]);

  const pendingCount = useMemo(() => filtered.filter((t) => !t.completed).length, [filtered]);

  const filterColor = (val: Priority | "all") => {
    if (val === "urgent") return colors.urgent;
    if (val === "track") return colors.track;
    if (val === "remember") return colors.remember;
    return colors.primary;
  };

  const openAdd = () => {
    setEditingTask(null);
    setModalVisible(true);
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setModalVisible(true);
  };

  const handleSave = (data: { title: string; description: string; priority: Priority; deadline: string | null }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask({ ...data, completed: false });
    }
    setModalVisible(false);
    setEditingTask(null);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteTask(id);
    setModalVisible(false);
    setEditingTask(null);
  };

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 + 90 : 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>任务</Text>
          {pendingCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{pendingCount}</Text>
            </View>
          )}
        </View>

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(i) => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = filter === item.value;
            const fc = filterColor(item.value);
            return (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(item.value);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? fc : colors.muted,
                    borderColor: active ? fc : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad },
          !filtered.length && styles.emptyList,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="check-square"
            title="没有任务"
            subtitle={filter === "all" ? "点击 + 创建第一个任务" : "该分类下没有任务"}
          />
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleComplete(item.id);
            }}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad - 60 }]}
        onPress={openAdd}
      >
        <Feather name="plus" size={26} color="#fff" />
      </Pressable>

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
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14,
    zIndex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  filterList: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    paddingTop: 8,
  },
  emptyList: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
