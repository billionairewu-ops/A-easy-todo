import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PriorityBadge } from "@/components/PriorityBadge";
import type { Priority } from "@/context/TaskContext";
import { useTasks, useTaskStats } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";

function formatDeadlineShort(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `逾期 ${Math.abs(diff)} 天`;
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ProgressRing({ percent, size = 72, color }: { percent: number; size?: number; color: string }) {
  const colors = useColors();
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const stroke = circumference - (percent / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          borderColor: colors.muted,
          position: "absolute",
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          borderColor: color,
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
          opacity: percent > 0 ? 1 : 0,
          borderStyle: "solid",
        }}
      />
      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color }}>{percent}%</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function CategoryBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const colors = useColors();
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.categoryRow}>
      <Text style={[styles.catLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.catCount, { color: colors.mutedForeground }]}>{count}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const stats = useTaskStats();

  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return tasks
      .filter((t) => !t.completed && t.deadline)
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
      .slice(0, 5);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (t.completed || !t.deadline) return false;
      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);
      return d < now;
    });
  }, [tasks]);

  const recentCompleted = useMemo(() =>
    tasks
      .filter((t) => t.completed)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 3),
    [tasks]
  );

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 + 90 : 90;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>仪表盘</Text>

      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>整体完成率</Text>
          <Text style={styles.heroValue}>{stats.completionRate}%</Text>
          <Text style={styles.heroSub}>
            {stats.completed}/{stats.total} 任务已完成
          </Text>
        </View>
        <View style={styles.heroRight}>
          <View style={styles.heroRingBg}>
            <ProgressRing percent={stats.completionRate} size={80} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="待完成" value={stats.pending} color={colors.primary} icon="clock" />
        <StatCard label="紧急" value={stats.urgent} color={colors.urgent} icon="alert-circle" />
        <StatCard label="今天到期" value={stats.dueToday} color={colors.track} icon="calendar" />
        <StatCard label="已逾期" value={stats.overdue} color={colors.destructive} icon="alert-triangle" />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>分类分布</Text>
        <View style={styles.catList}>
          <CategoryBar label="紧急" count={stats.urgent} total={stats.pending} color={colors.urgent} />
          <CategoryBar label="需跟踪" count={stats.track} total={stats.pending} color={colors.track} />
          <CategoryBar label="记得做" count={stats.remember} total={stats.pending} color={colors.remember} />
        </View>
      </View>

      {overdueTasks.length > 0 && (
        <View style={[styles.section, { backgroundColor: "#FEF2F2", borderColor: colors.urgentLight }]}>
          <View style={styles.sectionHeader}>
            <Feather name="alert-triangle" size={16} color={colors.urgent} />
            <Text style={[styles.sectionTitle, { color: colors.urgent }]}>
              已逾期 ({overdueTasks.length})
            </Text>
          </View>
          {overdueTasks.map((t) => (
            <View key={t.id} style={[styles.taskRow, { borderBottomColor: colors.urgentLight }]}>
              <PriorityBadge priority={t.priority} size="sm" />
              <Text style={[styles.taskRowTitle, { color: colors.foreground }]} numberOfLines={1}>
                {t.title}
              </Text>
              {t.deadline && (
                <Text style={[styles.taskRowDate, { color: colors.urgent }]}>
                  {formatDeadlineShort(t.deadline)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>即将到期</Text>
          </View>
          {upcoming.map((t) => (
            <View key={t.id} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
              <PriorityBadge priority={t.priority} size="sm" />
              <Text style={[styles.taskRowTitle, { color: colors.foreground }]} numberOfLines={1}>
                {t.title}
              </Text>
              {t.deadline && (
                <Text
                  style={[
                    styles.taskRowDate,
                    {
                      color:
                        formatDeadlineShort(t.deadline) === "今天"
                          ? colors.track
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {formatDeadlineShort(t.deadline)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {recentCompleted.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>最近完成</Text>
          </View>
          {recentCompleted.map((t) => (
            <View key={t.id} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text
                style={[
                  styles.taskRowTitle,
                  { color: colors.mutedForeground, textDecorationLine: "line-through" },
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {stats.total === 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.emptyDash}>
            <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyDashText, { color: colors.mutedForeground }]}>
              添加任务后，仪表盘将显示统计数据
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  heroCard: {
    borderRadius: 18,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  heroLeft: {
    flex: 1,
    gap: 4,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  heroValue: {
    color: "#fff",
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    lineHeight: 46,
  },
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  heroRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroRingBg: {
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  catList: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catLabel: {
    width: 52,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  catCount: {
    width: 24,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskRowTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  taskRowDate: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDash: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  emptyDashText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
