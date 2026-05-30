import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DonutChart } from "@/components/DonutChart";
import { PriorityBadge } from "@/components/PriorityBadge";
import { useTasks, useTaskStats } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";
import { useSwipeTabs } from "@/hooks/useSwipeTabs";

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

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.legendValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.statRowIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.statRowLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.statRowValue, { color }]}>{value}</Text>
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

  const recentCompleted = useMemo(
    () =>
      tasks
        .filter((t) => t.completed)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
        .slice(0, 3),
    [tasks]
  );

  const completionSegments = [
    { value: stats.completed, color: colors.success, label: "已完成" },
    { value: stats.pending, color: colors.muted, label: "待完成" },
  ];

  const categorySegments = [
    { value: stats.urgent, color: colors.urgent, label: "紧急" },
    { value: stats.track, color: colors.track, label: "需跟踪" },
    { value: stats.remember, color: colors.remember, label: "记得做" },
  ];

  const swipePan = useSwipeTabs(2);
  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 + 90 : 90;

  return (
    <View style={{ flex: 1 }} {...swipePan.panHandlers}>
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>仪表盘</Text>

      {/* Two donut charts side by side */}
      <View style={styles.chartsRow}>
        {/* Completion donut */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>完成率</Text>
          <View style={styles.chartCenter}>
            <DonutChart
              segments={completionSegments}
              size={130}
              strokeWidth={16}
              centerLabel={`${stats.completionRate}%`}
              centerSub="完成"
              emptyColor={colors.muted}
            />
          </View>
          <View style={styles.chartLegend}>
            <LegendItem color={colors.success} label="已完成" value={stats.completed} />
            <LegendItem color={colors.muted} label="待完成" value={stats.pending} />
          </View>
        </View>

        {/* Category donut */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>任务分类</Text>
          <View style={styles.chartCenter}>
            <DonutChart
              segments={categorySegments}
              size={130}
              strokeWidth={16}
              centerLabel={`${stats.pending}`}
              centerSub="待完成"
              emptyColor={colors.muted}
            />
          </View>
          <View style={styles.chartLegend}>
            <LegendItem color={colors.urgent} label="紧急" value={stats.urgent} />
            <LegendItem color={colors.track} label="跟踪" value={stats.track} />
            <LegendItem color={colors.remember} label="记得" value={stats.remember} />
          </View>
        </View>
      </View>

      {/* Stats detail card */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>详细统计</Text>
        <StatRow icon="layers" label="任务总数" value={stats.total} color={colors.primary} />
        <StatRow icon="alert-circle" label="紧急任务" value={stats.urgent} color={colors.urgent} />
        <StatRow icon="clock" label="今天到期" value={stats.dueToday} color={colors.track} />
        <StatRow icon="alert-triangle" label="已逾期" value={stats.overdue} color={colors.destructive} />
        <StatRow icon="check-circle" label="已完成" value={stats.completed} color={colors.success} />
      </View>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: "#FEF2F2", borderColor: colors.urgentLight },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Feather name="alert-triangle" size={16} color={colors.urgent} />
            <Text style={[styles.sectionTitle, { color: colors.urgent }]}>
              已逾期 ({overdueTasks.length})
            </Text>
          </View>
          {overdueTasks.map((t, i) => (
            <View
              key={t.id}
              style={[
                styles.taskRow,
                {
                  borderBottomColor: colors.urgentLight,
                  borderBottomWidth: i < overdueTasks.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <PriorityBadge priority={t.priority} size="sm" />
              <Text
                style={[styles.taskRowTitle, { color: colors.foreground }]}
                numberOfLines={1}
              >
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

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>即将到期</Text>
          </View>
          {upcoming.map((t, i) => (
            <View
              key={t.id}
              style={[
                styles.taskRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < upcoming.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <PriorityBadge priority={t.priority} size="sm" />
              <Text
                style={[styles.taskRowTitle, { color: colors.foreground }]}
                numberOfLines={1}
              >
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
                          : formatDeadlineShort(t.deadline).startsWith("逾期")
                          ? colors.urgent
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

      {/* Recent completed */}
      {recentCompleted.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>最近完成</Text>
          </View>
          {recentCompleted.map((t, i) => (
            <View
              key={t.id}
              style={[
                styles.taskRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < recentCompleted.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text
                style={[
                  styles.taskRowTitle,
                  { color: colors.mutedForeground, textDecorationLine: "line-through", flex: 1 },
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
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  chartsRow: {
    flexDirection: "row",
    gap: 12,
  },
  chartCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    alignSelf: "flex-start",
  },
  chartCenter: {
    alignItems: "center",
  },
  chartLegend: {
    width: "100%",
    gap: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  legendValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
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
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statRowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  statRowValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
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
