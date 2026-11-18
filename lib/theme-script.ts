// Plain (non-client) module so the server layout can inline the script as a string.

export const THEME_KEY = "json-parser-theme";

/**
 * Runs inline in <head> before first paint, so the page never flashes the wrong theme.
 * Saved choice wins; otherwise follow the OS. Older saved values ("blue", "green", …) mean light.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_KEY}");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export const LAYOUT_KEY = "workspace-layout";

/** Restores the workspace width choice ("focus" = centred container, "wide" = full width) before paint. */
export const LAYOUT_INIT_SCRIPT = `(function(){try{document.documentElement.dataset.layout=localStorage.getItem("${LAYOUT_KEY}")==="wide"?"wide":"focus";}catch(e){document.documentElement.dataset.layout="focus";}})();`;
