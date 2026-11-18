"use client";

import { useSyncExternalStore } from "react";
import { writeStorage } from "./storage";
import { LAYOUT_KEY } from "./theme-script";

/** "focus" keeps the workspace in the centred container; "wide" uses the full window width. */
export type WorkspaceLayout = "focus" | "wide";

const listeners = new Set<() => void>();

function readLayout(): WorkspaceLayout {
  return document.documentElement.dataset.layout === "wide" ? "wide" : "focus";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LAYOUT_KEY) return;
    document.documentElement.dataset.layout = event.newValue === "wide" ? "wide" : "focus";
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLayout(layout: WorkspaceLayout) {
  document.documentElement.dataset.layout = layout;
  writeStorage(LAYOUT_KEY, layout);
  listeners.forEach((listener) => listener());
}

export function useWorkspaceLayout() {
  const layout = useSyncExternalStore(subscribe, readLayout, () => "focus" as WorkspaceLayout);
  return [layout, setLayout] as const;
}
