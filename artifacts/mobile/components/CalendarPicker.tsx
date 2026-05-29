import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Priority } from "@/context/TaskContext";

export interface CalendarDot {
  date: string; // "YYYY-MM-DD"
  priority: Priority;
}

interface Props {
  selected: string | null;
  onSelect: (date: string) => void;
  dots?: CalendarDot[];
  compact?: boolean;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayYMD(): string {
  return toYMD(new Date());
}

export function CalendarPicker({ selected, onSelect, dots = [], compact = false }: Props) {
  const colors = useColors();
  const today = todayYMD();

  const [viewDate, setViewDate] = useState(() => {
    if (selected) {
      const [y, m] = selected.split("-").map(Number);
      return { year: y, month: m };
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });

  const dotMap = useMemo(() => {
    const map: Record<string, Priority[]> = {};
    for (const d of dots) {
      if (!map[d.date]) map[d.date] = [];
      map[d.date].push(d.priority);
    }
    return map;
  }, [dots]);

  const days = useMemo(() => {
    const { year, month } = viewDate;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const grid: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewDate]);

  const prevMonth = () => {
    setViewDate(({ year, month }) =>
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
    );
  };

  const nextMonth = () => {
    setViewDate(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    );
  };

  const cellSize = compact ? 36 : 42;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable onPress={prevMonth} hitSlop={10} style={styles.navBtn}>
          <Feather name="chevron-left" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {viewDate.year}年 {MONTHS[viewDate.month - 1]}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={10} style={styles.navBtn}>
          <Feather name="chevron-right" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text
            key={w}
            style={[styles.weekday, { color: colors.mutedForeground, width: cellSize }]}
          >
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((dateStr, idx) => {
          if (!dateStr) {
            return <View key={`empty-${idx}`} style={{ width: cellSize, height: cellSize }} />;
          }
          const isSelected = dateStr === selected;
          const isToday = dateStr === today;
          const isPast = dateStr < today;
          const cellDots = dotMap[dateStr] ?? [];

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelect(dateStr)}
              style={[
                styles.dayCell,
                { width: cellSize, height: cellSize },
                isSelected && { backgroundColor: colors.primary, borderRadius: cellSize / 2 },
                isToday && !isSelected && {
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  borderRadius: cellSize / 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isPast && !isToday ? colors.mutedForeground : colors.foreground },
                  isSelected && { color: "#fff" },
                  isToday && !isSelected && { color: colors.primary, fontFamily: "Inter_700Bold" },
                ]}
              >
                {Number(dateStr.split("-")[2])}
              </Text>
              {cellDots.length > 0 && (
                <View style={styles.dotsRow}>
                  {cellDots.slice(0, 3).map((p, di) => (
                    <View
                      key={di}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.8)"
                            : p === "urgent"
                            ? colors.urgent
                            : p === "track"
                            ? colors.track
                            : colors.remember,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekday: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    rowGap: 4,
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    height: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
