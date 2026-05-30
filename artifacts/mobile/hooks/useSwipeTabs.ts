import { useRef } from "react";
import { PanResponder } from "react-native";
import { useRouter } from "expo-router";

const TABS = ["/", "/calendar", "/dashboard"] as const;
const DIST = 48;
const VX = 0.35;

/**
 * Returns PanResponder panHandlers for horizontal tab-switch swipes.
 * Pass `disabled=true` to pause gesture capture (e.g. when an overlay is open).
 */
export function useSwipeTabs(currentIndex: 0 | 1 | 2, disabled = false) {
  const router = useRouter();
  const idxRef = useRef(currentIndex);
  const disabledRef = useRef(disabled);
  const routerRef = useRef(router);

  // Always keep refs fresh — PanResponder closure reads from refs, never stale
  idxRef.current = currentIndex;
  disabledRef.current = disabled;
  routerRef.current = router;

  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !disabledRef.current &&
        Math.abs(g.dx) > 10 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (disabledRef.current) return;
        const idx = idxRef.current;
        const isHoriz = Math.abs(g.dx) > Math.abs(g.dy);
        const toNext = (g.dx < -DIST || g.vx < -VX) && isHoriz && idx < 2;
        const toPrev = (g.dx > DIST || g.vx > VX) && isHoriz && idx > 0;
        if (toNext) routerRef.current.navigate(TABS[idx + 1] as any);
        else if (toPrev) routerRef.current.navigate(TABS[idx - 1] as any);
      },
    })
  ).current;
}
