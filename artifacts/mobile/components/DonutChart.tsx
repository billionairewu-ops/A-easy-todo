import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

interface Props {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
  emptyColor?: string;
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 18,
  centerLabel,
  centerSub,
  emptyColor = "#E5E7EB",
}: Props) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const isEmpty = total === 0;

  let cumulativeAngle = -90;

  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const fraction = seg.value / total;
      const angle = fraction * 360;
      const dashLen = fraction * circumference;
      const dashOffset = circumference - dashLen;
      const rotation = cumulativeAngle;
      cumulativeAngle += angle;
      return { seg, dashLen, dashOffset, rotation };
    });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={emptyColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Segments */}
        {isEmpty ? null : arcs.map(({ seg, dashLen, dashOffset, rotation }, i) => (
          <G key={i} rotation={rotation} originX={cx} originY={cy}>
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={0}
              strokeLinecap="butt"
              fill="none"
            />
          </G>
        ))}
        {/* Center label */}
        {centerLabel ? (
          <SvgText
            x={cx}
            y={centerSub ? cy - 6 : cy + 6}
            textAnchor="middle"
            fontSize={centerSub ? 22 : 24}
            fontWeight="700"
            fill="#1A1A2E"
          >
            {centerLabel}
          </SvgText>
        ) : null}
        {centerSub ? (
          <SvgText
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fontSize={12}
            fill="#6B7280"
          >
            {centerSub}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
