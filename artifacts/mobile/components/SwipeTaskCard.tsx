import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CalendarPicker } from "@/components/CalendarPicker";
import type { Priority } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_H = 80;   // left/right threshold to commit priority
const SWIPE_UP = 70;  // upward threshold to save

interface Props {
  visible: boolean;
  onSave: (data: { title: string; priority: Priority; deadline: string | null }) => void;
  onClose: () => void;
}

const PRIORITY_META: Record<
  Priority,
  { label: string; lightBg: string; darkBg: string; accent: string; textColor: string }
> = {
  urgent: {
    label: "紧急",
    lightBg: "#FEF2F2",
    darkBg: "#FEE2E2",
    accent: "#EF4444",
    textColor: "#DC2626",
  },
  track: {
    label: "需跟踪",
    lightBg: "#FFFBEB",
    darkBg: "#FEF3C7",
    accent: "#F59E0B",
    textColor: "#D97706",
  },
  remember: {
    label: "记得做",
    lightBg: "#EFF6FF",
    darkBg: "#DBEAFE",
    accent: "#3B82F6",
    textColor: "#2563EB",
  },
};

export function SwipeTaskCard({ visible, onSave, onClose }: Props) {
  const colors = useColors();

  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  // Visually committed priority (drives background + bottom hint)
  const [displayPriority, setDisplayPriority] = useState<Priority>("track");

  // Refs
  const committedPriority = useRef<Priority>("track");
  const isAnimating = useRef(false);
  const textRef = useRef<TextInput>(null);

  // Animated values
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Interpolations
  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ["-7deg", "0deg", "7deg"],
    extrapolate: "clamp",
  });

  const urgentHintOpacity = translateX.interpolate({
    inputRange: [-SWIPE_H, -20, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const rememberHintOpacity = translateX.interpolate({
    inputRange: [0, 20, SWIPE_H],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });

  const saveHintOpacity = translateY.interpolate({
    inputRange: [-SWIPE_UP, -20, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });

  // Entrance animation
  useEffect(() => {
    if (visible) {
      setContent("");
      setDeadline(null);
      setShowCalendar(false);
      setDisplayPriority("track");
      committedPriority.current = "track";
      isAnimating.current = false;
      translateX.setValue(0);
      translateY.setValue(0);

      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 72,
          friction: 8,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // --- Helpers ---
  const springBack = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 140,
        friction: 7,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 140,
        friction: 7,
      }),
    ]).start();
  };

  const flyUp = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -SCREEN_H,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (content.trim()) {
        onSave({
          title: content.trim(),
          priority: committedPriority.current,
          deadline,
        });
      }
      onClose();
    });
  };

  const dismiss = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(cardScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
    ]).start(onClose);
  };

  // --- PanResponder ---
  const panResponder = useRef(
    PanResponder.create({
      // Don't steal on tap (let TextInput focus)
      onStartShouldSetPanResponder: () => false,
      // Steal on clear directional move
      onMoveShouldSetPanResponder: (_, g) => {
        const horizontal = Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
        const upward = g.dy < -10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2;
        return horizontal || upward;
      },
      onPanResponderGrant: () => {
        // Blur input so card can move freely
        textRef.current?.blur();
      },
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        // Allow upward movement; resist downward
        translateY.setValue(g.dy < 0 ? g.dy : g.dy * 0.15);

        // Update visual display priority
        if (g.dx < -30) {
          setDisplayPriority("urgent");
        } else if (g.dx > 30) {
          setDisplayPriority("remember");
        } else {
          setDisplayPriority(committedPriority.current);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (isAnimating.current) return;

        // Upward flick → SAVE
        if (g.dy < -SWIPE_UP && Math.abs(g.dy) > Math.abs(g.dx)) {
          flyUp();
          return;
        }

        // Strong left → commit urgent
        if (g.dx < -SWIPE_H) {
          committedPriority.current = "urgent";
          setDisplayPriority("urgent");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          springBack();
          return;
        }

        // Strong right → commit remember
        if (g.dx > SWIPE_H) {
          committedPriority.current = "remember";
          setDisplayPriority("remember");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          springBack();
          return;
        }

        // Otherwise snap back, keep committed
        setDisplayPriority(committedPriority.current);
        springBack();
      },
    })
  ).current;

  if (!visible) return null;

  const meta = PRIORITY_META[displayPriority];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Card */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: cardOpacity,
              transform: [
                { scale: cardScale },
                { translateX },
                { translateY },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Card body — background driven by displayPriority */}
          <View style={[styles.card, { backgroundColor: meta.lightBg }]}>
            {/* Top hint row */}
            <View style={styles.hintRow}>
              <Animated.View style={[styles.hintGroup, { opacity: urgentHintOpacity }]}>
                <Feather name="chevron-left" size={16} color={PRIORITY_META.urgent.accent} />
                <Text style={[styles.hintText, { color: PRIORITY_META.urgent.accent }]}>紧急</Text>
              </Animated.View>

              <View style={[styles.priorityBadge, { borderColor: meta.accent + "55", backgroundColor: meta.accent + "18" }]}>
                <View style={[styles.priorityDot, { backgroundColor: meta.accent }]} />
                <Text style={[styles.priorityLabel, { color: meta.textColor }]}>{meta.label}</Text>
              </View>

              <Animated.View style={[styles.hintGroup, { opacity: rememberHintOpacity }]}>
                <Text style={[styles.hintText, { color: PRIORITY_META.remember.accent }]}>记得做</Text>
                <Feather name="chevron-right" size={16} color={PRIORITY_META.remember.accent} />
              </Animated.View>
            </View>

            {/* Accent top line */}
            <View style={[styles.accentLine, { backgroundColor: meta.accent + "55" }]} />

            {/* Main input */}
            <TextInput
              ref={textRef}
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder={"写下你的任务..."}
              placeholderTextColor={meta.accent + "77"}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={400}
              autoFocus
              textAlignVertical="top"
              scrollEnabled={false}
            />

            {/* Deadline button */}
            <View style={styles.deadlineSection}>
              <Pressable
                style={[
                  styles.deadlineBtn,
                  {
                    backgroundColor: deadline ? meta.accent + "15" : "rgba(0,0,0,0.04)",
                    borderColor: deadline ? meta.accent + "50" : "rgba(0,0,0,0.07)",
                  },
                ]}
                onPress={() => setShowCalendar((v) => !v)}
              >
                <Feather
                  name="calendar"
                  size={15}
                  color={deadline ? meta.accent : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.deadlineBtnText,
                    { color: deadline ? meta.textColor : colors.mutedForeground },
                  ]}
                >
                  {deadline
                    ? (() => {
                        const [y, m, d] = deadline.split("-");
                        return `${y}年${Number(m)}月${Number(d)}日`;
                      })()
                    : "点击设置截止日期"}
                </Text>
                {deadline && (
                  <Pressable
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation();
                      setDeadline(null);
                      setShowCalendar(false);
                    }}
                  >
                    <Feather name="x-circle" size={15} color={meta.accent} />
                  </Pressable>
                )}
              </Pressable>

              {showCalendar && (
                <CalendarPicker
                  selected={deadline}
                  onSelect={(d) => {
                    setDeadline(d);
                    setShowCalendar(false);
                  }}
                  compact
                />
              )}
            </View>

            {/* Bottom: up-swipe save hint */}
            <View style={styles.saveHintRow}>
              <Animated.View style={[styles.saveHintActive, { opacity: saveHintOpacity }]}>
                <Feather name="arrow-up" size={16} color={meta.accent} />
                <Text style={[styles.saveHintTextActive, { color: meta.accent }]}>
                  松手保存
                </Text>
              </Animated.View>

              <View style={styles.saveHintIdle}>
                <View style={[styles.upArrowIcon, { borderColor: meta.accent + "66" }]}>
                  <Feather name="arrow-up" size={14} color={meta.accent + "aa"} />
                </View>
                <Text style={[styles.saveHintTextIdle, { color: meta.accent + "99" }]}>
                  上划保存为「{meta.label}」
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_W = SCREEN_W - 32;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  kav: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "box-none",
  } as any,
  cardWrapper: {
    width: CARD_W,
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    gap: 16,
    overflow: "hidden",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hintGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  accentLine: {
    height: 2,
    borderRadius: 1,
    marginHorizontal: -22,
  },
  textInput: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    lineHeight: 30,
    minHeight: 140,
    paddingTop: 4,
  },
  deadlineSection: {
    gap: 10,
  },
  deadlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  deadlineBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  saveHintRow: {
    alignItems: "center",
    paddingTop: 4,
    position: "relative",
    height: 36,
    justifyContent: "center",
  },
  saveHintIdle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveHintActive: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upArrowIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  saveHintTextIdle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  saveHintTextActive: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
