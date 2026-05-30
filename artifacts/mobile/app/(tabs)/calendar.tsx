import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CalendarDot } from "@/components/CalendarPicker";
import { CalendarPicker } from "@/components/CalendarPicker";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import type { Priority, Task } from "@/context/TaskContext";
import { useTasks } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";

// ─── date helpers ─────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayYMD(): string { return toYMD(new Date()); }

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Sunday of the current week (Chinese convention: week ends Sunday) */
function thisWeekSunday(): Date {
  const t = new Date();
  const dow = t.getDay(); // 0 = Sun
  const daysToSunday = dow === 0 ? 0 : 7 - dow;
  return addDays(t, daysToSunday);
}

function shortDateLabel(ymd: string): string {
  const today = todayYMD();
  const tomorrow = toYMD(addDays(new Date(), 1));
  if (ymd === today) return "今天";
  if (ymd === tomorrow) return "明天";
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}月${d}日`;
}

// ─── priority palette ─────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<Priority, string> = {
  urgent:   "#E8001D",
  track:    "#E07800",
  remember: "#1C44F5",
};
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, track: 1, remember: 2 };

function sortUpcoming(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline! < b.deadline!) return -1;
    if (a.deadline! > b.deadline!) return 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// ─── Mini upcoming task row ────────────────────────────────────────────────────
function MiniRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const colors = useColors();
  const accent = PRIORITY_COLOR[task.priority];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.miniRow,
        { backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.miniBar, { backgroundColor: accent }]} />
      <Text style={[styles.miniTitle, { color: colors.foreground }]} numberOfLines={1}>
        {task.title}
      </Text>
      <Text style={[styles.miniDate, { color: accent }]}>
        {shortDateLabel(task.deadline!)}
      </Text>
    </Pressable>
  );
}

// ─── Collapsible section ───────────────────────────────────────────────────────
function Section({
  title,
  icon,
  tasks,
  emptyText,
  accentColor,
  onRowPress,
}: {
  title: string;
  icon: string;
  tasks: Task[];
  emptyText: string;
  accentColor: string;
  onRowPress: (task: Task) => void;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(true);

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Section header */}
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
      >
        <View style={[styles.sectionIconWrap, { backgroundColor: accentColor + "18" }]}>
          <Feather name={icon as any} size={14} color={accentColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: accentColor + "18" }]}>
          <Text style={[styles.countText, { color: accentColor }]}>{tasks.length}</Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
          style={{ marginLeft: "auto" }}
        />
      </Pressable>

      {open && (
        tasks.length === 0 ? (
          <View style={styles.sectionEmpty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>
          </View>
        ) : (
          <View style={[styles.miniList, { borderTopColor: colors.border }]}>
            {tasks.map((t) => (
              <MiniRow key={t.id} task={t} onPress={() => onRowPress(t)} />
            ))}
          </View>
        )
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, updateTask, deleteTask, toggleComplete } = useTasks();

  const swipePan = useSwipeTabs(1);
  const [selected, setSelected] = useState<string>(todayYMD());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Calendar dots
  const dots: CalendarDot[] = useMemo(
    () => tasks.filter((t) => t.deadline && !t.completed).map((t) => ({ date: t.deadline!, priority: t.priority })),
    [tasks]
  );

  // This week: today → this Sunday (inclusive), not completed, has deadline
  const thisWeekTasks = useMemo(() => {
    const today = todayYMD();
    const sundayYMD = toYMD(thisWeekSunday());
    return sortUpcoming(
      tasks.filter((t) => t.deadline && !t.completed && t.deadline >= today && t.deadline <= sundayYMD)
    );
  }, [tasks]);

  // Two-week window: today → today+13, not completed, has deadline
  const twoWeekTasks = useMemo(() => {
    const today = todayYMD();
    const endYMD = toYMD(addDays(new Date(), 13));
    return sortUpcoming(
      tasks.filter((t) => t.deadline && !t.completed && t.deadline >= today && t.deadline <= endYMD)
    );
  }, [tasks]);

  // Selected day
  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline === selected)
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        }),
    [tasks, selected]
  );

  const dateLabel = useMemo(() => {
    const today = todayYMD();
    const [, m, d] = selected.split("-").map(Number);
    if (selected === today) return "今天";
    if (selected === toYMD(addDays(new Date(), 1))) return "明天";
    return `${m}月${d}日`;
  }, [selected]);

  const handleSave = (data: { title: string; description: string; priority: Priority; deadline: string | null }) => {
    if (editingTask) updateTask(editingTask.id, data);
    setModalVisible(false);
    setEditingTask(null);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    setModalVisible(false);
    setEditingTask(null);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 + 90 : 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} {...swipePan.panHandlers}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
        stickyHeaderIndices={[0]}
      >
        {/* Title */}
        <View style={[styles.titleBlock, { backgroundColor: colors.background }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>日历</Text>
        </View>

        {/* Calendar picker */}
        <View style={styles.calendarWrap}>
          <CalendarPicker
            selected={selected}
            onSelect={(d) => { Haptics.selectionAsync(); setSelected(d); }}
            dots={dots}
          />
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([
            { label: "紧急", color: PRIORITY_COLOR.urgent },
            { label: "需跟踪", color: PRIORITY_COLOR.track },
            { label: "记得做", color: PRIORITY_COLOR.remember },
          ] as const).map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── 本周到期 ────────────────────────────────────────────── */}
        <Section
          title="本周到期"
          icon="clock"
          tasks={thisWeekTasks}
          emptyText="本周没有待办任务"
          accentColor={PRIORITY_COLOR.urgent}
          onRowPress={openEdit}
        />

        {/* ── 两周内到期 ───────────────────────────────────────────── */}
        <Section
          title="两周内到期"
          icon="calendar"
          tasks={twoWeekTasks}
          emptyText="两周内没有待办任务"
          accentColor={PRIORITY_COLOR.track}
          onRowPress={openEdit}
        />

        {/* ── Selected day ─────────────────────────────────────────── */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayLabel, { color: colors.foreground }]}>{dateLabel}的任务</Text>
          <View style={[styles.dayCountBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.dayCount, { color: colors.mutedForeground }]}>{selectedTasks.length}</Text>
          </View>
        </View>

        {selectedTasks.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="sun" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>这天没有任务</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {selectedTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleComplete(t.id); }}
                onEdit={() => openEdit(t)}
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
        onClose={() => { setModalVisible(false); setEditingTask(null); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { gap: 14 },

  titleBlock: { paddingHorizontal: 20, paddingBottom: 4 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },

  calendarWrap: { paddingHorizontal: 16 },

  legend: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // ─ Section
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  sectionEmpty: { paddingHorizontal: 16, paddingBottom: 14 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  miniList: { borderTopWidth: StyleSheet.hairlineWidth },

  // ─ Mini row
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingRight: 14,
    gap: 10,
  },
  miniBar: { width: 3, height: "100%", minHeight: 36, borderRadius: 2, marginLeft: 0 },
  miniTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  miniDate: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ─ Day section
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20 },
  dayLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  dayCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 24, alignItems: "center" },
  dayCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyDay: {
    marginHorizontal: 16, borderRadius: 14, borderWidth: 1,
    paddingVertical: 28, alignItems: "center", gap: 10,
  },
  emptyDayText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  taskList: { gap: 0 },
});
