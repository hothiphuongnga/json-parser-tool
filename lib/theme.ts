"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { writeStorage } from "./storage";
import { THEME_KEY } from "./theme-script";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  writeStorage(THEME_KEY, theme);
  notify();
}

const DURATION = 650;

/**
 * Switches theme with a circular reveal that grows from the top-right corner of the
 * viewport. Falls back to an instant switch when View Transitions are unsupported
 * or the user prefers reduced motion.
 */
export function setTheme(theme: Theme) {
  if (theme === readTheme()) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduceMotion) {
    applyTheme(theme);
    return;
  }

  const x = window.innerWidth;
  const y = 0;
  const radius = Math.hypot(window.innerWidth, window.innerHeight);

  document.documentElement.classList.add("theme-transition");
  // flushSync so React re-renders (e.g. the switch knob) inside the "new" snapshot.
  const transition = document.startViewTransition(() => flushSync(() => applyTheme(theme)));

  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});

  transition.finished.finally(() => document.documentElement.classList.remove("theme-transition"));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  return [theme, setTheme] as const;
}
