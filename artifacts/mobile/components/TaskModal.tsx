import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { Priority, Task } from "@/context/TaskContext";

interface Props {
  visible: boolean;
  task?: Task | null;
  onSave: (data: { title: string; description: string; priority: Priority; deadline: string | null }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; emoji: string }[] = [
  { value: "urgent", label: "紧急", emoji: "🔴" },
  { value: "track", label: "需跟踪", emoji: "🟡" },
  { value: "remember", label: "记得做", emoji: "🔵" },
];

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateParts(iso: string | null): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function DatePicker({
  value,
  onChange,
  onClear,
}: {
  value: string | null;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const colors = useColors();
  const today = new Date();
  const initial = parseDateParts(value) ?? {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    const safeDay = Math.min(day, maxDay);
    setDay(safeDay);
  }, [year, month]);

  const handleChange = (y: number, m: number, d: number) => {
    const maxDay = daysInMonth(y, m);
    const safeDay = Math.min(d, maxDay);
    onChange(toIso(y, m, safeDay));
  };

  const adj = (setter: (v: number) => void, cur: number, min: number, max: number, delta: number) => {
    const next = cur + delta;
    if (next < min || next > max) return;
    setter(next);
    handleChange(
      setter === setYear ? next : year,
      setter === setMonth ? next : month,
      setter === setDay ? next : day
    );
  };

  const MONTH_LABELS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];

  return (
    <View style={[styles.datePicker, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <View style={styles.dateRow}>
        <DateSpinner
          label={`${year}年`}
          onDec={() => adj(setYear, year, 2020, 2035, -1)}
          onInc={() => adj(setYear, year, 2020, 2035, 1)}
          colors={colors}
        />
        <DateSpinner
          label={MONTH_LABELS[month - 1]}
          onDec={() => adj(setMonth, month, 1, 12, -1)}
          onInc={() => adj(setMonth, month, 1, 12, 1)}
          colors={colors}
        />
        <DateSpinner
          label={`${day}日`}
          onDec={() => adj(setDay, day, 1, daysInMonth(year, month), -1)}
          onInc={() => adj(setDay, day, 1, daysInMonth(year, month), 1)}
          colors={colors}
        />
      </View>
      <Pressable onPress={onClear} style={styles.clearDate}>
        <Text style={[styles.clearDateText, { color: colors.mutedForeground }]}>清除日期</Text>
      </Pressable>
    </View>
  );
}

function DateSpinner({
  label,
  onDec,
  onInc,
  colors,
}: {
  label: string;
  onDec: () => void;
  onInc: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.spinner}>
      <Pressable onPress={onInc} hitSlop={8}>
        <Feather name="chevron-up" size={18} color={colors.primary} />
      </Pressable>
      <Text style={[styles.spinnerLabel, { color: colors.foreground }]}>{label}</Text>
      <Pressable onPress={onDec} hitSlop={8}>
        <Feather name="chevron-down" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function TaskModal({ visible, task, onSave, onDelete, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("remember");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "remember");
      setDeadline(task?.deadline ?? null);
      setShowDatePicker(false);
    }
  }, [visible, task]);

  const handleSave = () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({ title: title.trim(), description: description.trim(), priority, deadline });
  };

  const accentColor =
    priority === "urgent" ? colors.urgent : priority === "track" ? colors.track : colors.remember;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {task ? "编辑任务" : "新建任务"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>任务标题</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="输入任务标题..."
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>备注（选填）</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textarea,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="添加备注..."
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>优先级</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const optColor =
                    opt.value === "urgent"
                      ? colors.urgent
                      : opt.value === "track"
                      ? colors.track
                      : colors.remember;
                  const optBg =
                    opt.value === "urgent"
                      ? colors.urgentLight
                      : opt.value === "track"
                      ? colors.trackLight
                      : colors.rememberLight;
                  const selected = priority === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.priorityChip,
                        {
                          backgroundColor: selected ? optBg : colors.muted,
                          borderColor: selected ? optColor : colors.border,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPriority(opt.value);
                      }}
                    >
                      <View style={[styles.chipDot, { backgroundColor: optColor }]} />
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? optColor : colors.mutedForeground },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>截止日期</Text>
              <Pressable
                style={[
                  styles.deadlineBtn,
                  {
                    backgroundColor: colors.muted,
                    borderColor: deadline ? accentColor : colors.border,
                    borderWidth: deadline ? 1.5 : 1,
                  },
                ]}
                onPress={() => setShowDatePicker((v) => !v)}
              >
                <Feather
                  name="calendar"
                  size={16}
                  color={deadline ? accentColor : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.deadlineBtnText,
                    { color: deadline ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {deadline
                    ? (() => {
                        const [y, m, d] = deadline.split("-");
                        return `${y}年${Number(m)}月${Number(d)}日`;
                      })()
                    : "设置截止日期"}
                </Text>
                <Feather
                  name={showDatePicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {showDatePicker && (
                <DatePicker
                  value={deadline ?? todayString()}
                  onChange={(v) => setDeadline(v)}
                  onClear={() => {
                    setDeadline(null);
                    setShowDatePicker(false);
                  }}
                />
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            {task && onDelete && (
              <Pressable
                style={[styles.deleteTaskBtn, { borderColor: colors.destructive }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  onDelete();
                }}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            )}
            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: title.trim() ? colors.primary : colors.muted,
                  flex: 1,
                },
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: title.trim() ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {task ? "保存修改" : "创建任务"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  kavWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  body: {
    gap: 20,
    paddingBottom: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  deadlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  deadlineBtnText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  datePicker: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  spinner: {
    alignItems: "center",
    gap: 6,
    minWidth: 72,
  },
  spinnerLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    minWidth: 64,
  },
  clearDate: {
    alignItems: "center",
    paddingVertical: 4,
  },
  clearDateText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  deleteTaskBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
