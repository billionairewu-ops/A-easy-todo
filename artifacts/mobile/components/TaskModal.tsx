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
import { CalendarPicker } from "@/components/CalendarPicker";
import { useColors } from "@/hooks/useColors";
import type { Priority, Task } from "@/context/TaskContext";

interface Props {
  visible: boolean;
  task?: Task | null;
  onSave: (data: { title: string; description: string; priority: Priority; deadline: string | null }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: "紧急" },
  { value: "track", label: "需跟踪" },
  { value: "remember", label: "记得做" },
];

export function TaskModal({ visible, task, onSave, onDelete, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("remember");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "remember");
      setDeadline(task?.deadline ?? null);
      setShowCalendar(false);
    }
  }, [visible, task]);

  const handleSave = () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({ title: title.trim(), description: description.trim(), priority, deadline });
  };

  const accentColor =
    priority === "urgent" ? colors.urgent : priority === "track" ? colors.track : colors.remember;

  const formatDeadline = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${y}年${Number(m)}月${Number(day)}日`;
  };

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
            {/* Title */}
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

            {/* Description */}
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

            {/* Priority */}
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

            {/* Deadline */}
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
                onPress={() => setShowCalendar((v) => !v)}
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
                  {deadline ? formatDeadline(deadline) : "点击选择日期"}
                </Text>
                <Feather
                  name={showCalendar ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
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
                  {deadline && (
                    <Pressable
                      style={styles.clearBtn}
                      onPress={() => {
                        setDeadline(null);
                        setShowCalendar(false);
                      }}
                    >
                      <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>
                        清除日期
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Actions */}
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
    maxHeight: "95%",
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
  calendarWrap: {
    gap: 8,
  },
  clearBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  clearBtnText: {
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
