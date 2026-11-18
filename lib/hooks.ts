"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";

/* ---------- Environment ---------- */

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/* ---------- Resizable split panes (pointer + keyboard) ---------- */

type SplitOptions = { initial?: number; min?: number; max?: number; enabled: boolean };

export function useSplitResize<T extends HTMLElement>({ initial = 50, min = 25, max = 75, enabled }: SplitOptions) {
  // Callback ref kept in state so the element is never read through a ref during render.
  const [container, containerRef] = useState<T | null>(null);
  const [split, setSplit] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);
  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [max, min]);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const rect = container?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      setSplit(clamp(((clientX - rect.left) / rect.width) * 100));
    },
    [clamp, container],
  );

  const handleProps = {
    role: "separator",
    tabIndex: enabled ? 0 : -1,
    "aria-orientation": "vertical" as const,
    "aria-valuemin": min,
    "aria-valuemax": max,
    "aria-valuenow": Math.round(split),
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (!enabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsResizing(true);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (isResizing) updateFromPointer(event.clientX);
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setIsResizing(false);
    },
    onPointerCancel() {
      setIsResizing(false);
    },
    onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
      if (!enabled) return;
      const step = event.shiftKey ? 10 : 2;
      if (event.key === "ArrowLeft") setSplit((current) => clamp(current - step));
      else if (event.key === "ArrowRight") setSplit((current) => clamp(current + step));
      else if (event.key === "Home") setSplit(min);
      else if (event.key === "End") setSplit(max);
      else return;
      event.preventDefault();
    },
  };

  // fr units split the space left after the handle and gaps, so 50 really means half/half.
  const gridStyle = enabled
    ? { gridTemplateColumns: `minmax(0, ${split}fr) 10px minmax(0, ${100 - split}fr)` }
    : undefined;

  return { setContainer: containerRef, split, isResizing, handleProps, gridStyle };
}
