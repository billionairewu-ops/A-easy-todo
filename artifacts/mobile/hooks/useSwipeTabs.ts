import { useRef } from "react";
import { PanResponder } from "react-native";
import { useRouter } from "expo-router";

const TABS = ["/", "/calendar", "/dashboard"] as const;
const DIST = 48;
const VX = 0.35;

/**
 * Returns PanResponder panHandlers that switch tabs on a clear horizontal swipe.
 * Safe to spread on any View — only claims gesture when horizontal >> vertical,
 * so vertical ScrollViews underneath keep working normally.
 */
export function useSwipeTabs(currentIndex: 0 | 1 | 2) {
  const router = useRouter();
  // Refs so PanResponder closure always reads the latest values
  const idxRef = useRef(currentIndex);
  idxRef.current = currentIndex;
  const routerRef = useRef(router);
  routerRef.current = router;

  return useRef(
    PanResponder.create({
      // Only claim gesture when clearly horizontal (horizontal > 1.5× vertical)
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
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
