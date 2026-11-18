// English dictionary. This file defines the shape every other locale must match (see vi.ts).

const en = {
  site: {
    tagline: "Free online tools for developers",
    description: "Free online tools: JSON Parser, JSON to Type, HTML Online, text compare, lunar calendar, day counter.",
    copyright: "© 2026 goingtool.com",
  },

  tools: {
    jsonParser: { label: "JSON Parser", description: "Format, validate, minify and convert JSON" },
    jsonToType: { label: "JSON to Type", description: "Generate TypeScript, Go, Kotlin, Swift, C#, Java and Python types from JSON" },
    jsonYaml: { label: "JSON ⇄ YAML", description: "Convert JSON to YAML and YAML to JSON" },
    htmlOnline: { label: "HTML Online", description: "Write and preview HTML live" },
    compare: { label: "Compare", description: "Compare two texts line by line" },
    lunarCalendar: { label: "Lunar Calendar", description: "Vietnamese lunar calendar and lunar ↔ solar date conversion" },
    dayCounter: { label: "Day Counter", description: "Count the days between two dates" },
  },

  meta: {
    jsonToYaml: {
      title: "JSON to YAML Converter – Convert JSON to YAML Online",
      description: "Convert JSON to clean, safely quoted YAML online, or switch to YAML to JSON. Error line and column, 2- or 4-space indent, copy and download.",
    },
    yamlToJson: {
      title: "YAML to JSON Converter – Convert YAML to JSON Online",
      description: "Convert YAML (including multi-document files, anchors and aliases) to formatted JSON online, with error line and column, copy and download.",
    },
    jsonParser: {
      title: "JSON Parser Online – Format, Validate, Minify JSON",
      description:
        "Format, validate and minify JSON online; explore it as a tree, diff two JSON documents and convert to PHP arrays, JS objects, Python dicts, XML and Markdown.",
    },
    jsonToType: {
      title: "JSON to Type – TypeScript, Go, Kotlin, Swift, C#, Java, Python",
      description:
        "Turn JSON into TypeScript interfaces, Go structs, Kotlin data classes, Swift Codable, C# classes, Java records or Python dataclasses, right in your browser.",
    },
    htmlOnline: {
      title: "HTML Online – Write and Preview HTML",
      description: "Write, format and preview HTML, CSS and JavaScript in the browser with a sandboxed live preview.",
    },
    compare: {
      title: "Online Text Compare – Diff Two Texts",
      description: "Compare two texts or code snippets line by line, with added, removed and changed lines highlighted.",
    },
    lunarCalendar: {
      title: "Vietnamese Lunar Calendar – Lunar ↔ Solar Date Converter",
      description:
        "Vietnamese lunar calendar with can chi, auspicious hours and moon phases; convert lunar dates to solar dates and back.",
    },
    dayCounter: {
      title: "Day Counter – Days Between Two Dates",
      description: "Count the days between two dates in days, weeks, months and years, or add days to any date.",
    },
  },

  common: {
    ready: "Ready",
    copy: "Copy",
    copied: "Copied",
    clear: "Clear",
    cleared: "Cleared",
    close: "Close",
    sample: "Sample",
    sampleLoaded: "Sample loaded",
    format: "Format",
    today: "Today",
    nothingToCopy: "Nothing to copy",
    clipboardDenied: "The browser blocked clipboard access",
    chars: (count: string) => `${count} chars`,
    lines: (count: string) => `${count} lines`,
    resizePanels: "Drag to resize the two panels",
    advertisement: "Advertisement",
  },

  header: {
    toolsNav: "Tools",
    language: "Language",
    darkMode: "Dark mode",
    toLight: "Switch to light theme",
    toDark: "Switch to dark theme",
    wideWorkspace: "Full-width workspace",
    toFocus: "Switch to focus mode (centred container)",
    toWide: "Expand the workspace to full width",
  },

  jsonError: {
    title: "Invalid JSON",
    location: (line: number, column: number) => `Line ${line}, column ${column}`,
  },

  jsonParser: {
    tabs: {
      tree: "Tree",
      formatted: "Formatted",
      text: "List",
      diff: "Compare",
      js: "JS Object",
      php: "PHP Array",
      python: "Python Dict",
      xml: "XML",
      markdown: "Markdown",
    },
    viewType: "View",
    markdownModes: { tableRender: "Table", tableSource: "Table (source)", plainRender: "Text", plainSource: "Text (source)" },
    markdownMode: "Markdown style",
    noTableData: "No tabular data.",
    input: "Input JSON",
    inputPlaceholder: 'Paste JSON here...\n\nExample:\n{"name": "John", "age": 30}',
    minify: "Minify",
    validate: "Validate",
    history: "History",
    historyHint: "Last 10 JSON snapshots, stored in this browser",
    historyEmpty: "No history yet.",
    historyLoaded: (time: string) => `Loaded snapshot from ${time}`,
    sharedLoaded: "Loaded shared data",
    emptyOutput: "Output will appear here once you enter JSON.",
    valid: "Valid JSON",
    validRepaired: "Valid JSON (curly quotes “ ” were replaced with \")",
    errorAt: (line: number, column: number) => `Error at line ${line}, column ${column}`,
    invalidAt: (line: number, column: number) => `Invalid JSON: line ${line}, column ${column}`,
    noData: "No data yet",
    cannotFormat: "Can't format invalid JSON",
    cannotMinify: "Can't minify invalid JSON",
    formatted: "Formatted",
    minified: (chars: string) => `Minified (${chars} chars)`,
    inputCopied: "Input JSON copied",
    outputCopied: "Output copied",
    markdownCopied: "Markdown copied",
    pathCopied: (path: string) => `Copied ${path}`,
    showMoreTree: (next: number, remaining: number) => `Show ${next} more / ${remaining} remaining`,
    showMoreList: (remaining: string) => `Show more (${remaining} remaining)`,
    path: "Path",
    compareJson: "JSON to compare",
    comparePlaceholder: "Paste JSON to compare with the input JSON...",
    swap: "Swap",
    swapped: "Swapped both sides",
    compareCleared: "Cleared the comparison JSON",
    compareCopied: "Comparison JSON copied",
    diffStats: { added: "added", removed: "removed", modified: "changed", same: "same" },
    diffApproximate: "The data is too large for an exact comparison; lines are paired by position.",
    diffTruncated: (shown: string, total: string) => `Showing ${shown} of ${total} lines.`,
    inputColumn: "Input JSON",
    compareColumn: "Comparison JSON",
    resizeDiff: "Drag to resize the two comparison columns",
  },

  jsonToType: {
    input: "Input JSON",
    placeholder: "Paste JSON to generate types...",
    rootName: "Root type name",
    declarationKind: "Declaration kind",
    language: "Language",
    copyType: "Copy type",
    typeCopied: "Type copied",
    generated: (language: string) => `${language} types generated`,
    formattedJson: "JSON formatted",
    cannotFormat: "Can't format invalid JSON",
    emptyOutput: "Generated types will appear here.",
    errorAt: (line: number, column: number) => `Error at line ${line}, column ${column}`,
  },

  jsonYaml: {
    toYaml: "JSON → YAML",
    toJson: "YAML → JSON",
    direction: "Conversion direction",
    inputJson: "Input JSON",
    inputYaml: "Input YAML",
    placeholderJson: "Paste JSON here...\n\nExample:\n{\"name\": \"John\", \"tags\": [\"a\", \"b\"]}",
    placeholderYaml: "Paste YAML here...\n\nExample:\nname: John\ntags:\n  - a\n  - b",
    indent: "Indent",
    spaces: (n: number) => `${n} spaces`,
    usedOutput: "Output moved to input; direction reversed",
    download: "Download",
    downloaded: (file: string) => `Downloaded ${file}`,
    outputCopied: "Output copied",
    converted: (target: string) => `Converted to ${target}`,
    documents: (n: number) => `${n} YAML documents → JSON array`,
    invalidYaml: "Invalid YAML",
    errorAt: (line: number, column: number) => `Error at line ${line}, column ${column}`,
    emptyOutput: "The converted result will appear here.",
    yaml11Note: "Strings such as yes, on or 0123 are quoted so YAML 1.1 and 1.2 parsers read them the same way.",
  },

  htmlOnline: {
    source: "HTML source",
    sourcePlaceholder: "Paste HTML here...",
    run: "Run",
    ran: "HTML ran",
    formatted: "HTML formatted",
    copied: "HTML copied",
    download: "Download",
    downloaded: "Downloaded preview.html",
    openTab: "Open in new tab",
    opened: "Preview opened in a new tab",
    cleared: "Content cleared",
    preview: "Preview",
    autoRun: "Auto run",
    resize: "Drag to resize the code and preview panels",
    sandboxNote: "Preview runs in a sandboxed iframe",
    saveFailed: "Couldn't save the draft (browser storage is full or blocked)",
    sample: {
      lead: "Edit the source on the left to see the result instantly.",
      button: "Try JavaScript",
      clicked: "JavaScript ran!",
    },
  },

  compare: {
    kicker: "Text compare",
    title: "Compare content",
    intro: "Paste two versions to quickly find the lines that were added, removed or changed.",
    statsLabel: "Change summary",
    stats: {
      same: (n: number) => `${n} same`,
      added: (n: number) => `+${n} added`,
      removed: (n: number) => `−${n} removed`,
      modified: (n: number) => `~${n} changed`,
    },
    original: "Original",
    changed: "New version",
    originalLabel: "Original content",
    changedLabel: "New content",
    originalPlaceholder: "Paste the original content...",
    changedPlaceholder: "Paste the new content...",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Couldn't copy",
    swap: "Swap both texts",
    clear: "Clear both texts",
    result: "Line-by-line result",
    linesAnalysed: (n: string) => `${n} lines analysed`,
    legend: { removed: "Removed", modified: "Changed", added: "Added" },
    approximate: "The content is too large for an exact comparison; lines are paired by position.",
    truncated: (shown: string, total: string) => `Showing ${shown} of ${total} lines.`,
    sampleLeft: `Welcome to GoingTool.
This is a content comparison tool.
Every change will be clearly highlighted.
You can paste any text.`,
    sampleRight: `Welcome to GoingTool.
This is a visual content compare tool.
Every change will be highlighted in colour.
You can paste text, source code or notes.`,
  },

  dayCounter: {
    kicker: "Date distance",
    title: "Count the days between two dates",
    intro: "Pick any two dates to see the exact distance in days, weeks, and months/years.",
    formLabel: "Day counter",
    start: "Start date",
    end: "End date",
    pick: (label: string) => `Choose ${label.toLowerCase()}`,
    swap: "Swap start and end dates",
    swapTitle: "Swap the two dates",
    includeEnd: "Include both the start and the end date",
    quickPicks: "Quick picks",
    plus7: "+7 days",
    plus30: "+30 days",
    plus1y: "+1 year",
    custom: "Custom offset",
    amount: "Amount to add",
    amountPlaceholder: "Number",
    unit: "Time unit",
    units: { days: "Days", months: "Months", years: "Years" },
    apply: "Apply",
    fromStart: "Counted from the selected start date",
    range: (from: string, to: string) => `${from} to ${to}`,
    days: (n: string) => `${n} ${n === "1" ? "day" : "days"}`,
    includeNote: (raw: string) => `The plain distance is ${raw}; 1 day is added as selected.`,
    excludeNote: "The end date is not double-counted, as in a normal distance between two dates.",
    endsToday: "Ends today",
    endPassed: (n: string) => `The end date was ${n} ${n === "1" ? "day" : "days"} ago`,
    endAhead: (n: string) => `${n} ${n === "1" ? "day" : "days"} until the end date`,
    weeks: "Weeks",
    weeksValue: (weeks: string, days: number) => `${weeks} ${weeks === "1" ? "week" : "weeks"} ${days} ${days === 1 ? "day" : "days"}`,
    monthsYears: "Months / years",
    monthsYearsValue: (y: number, m: number, d: number) =>
      `${y} ${y === 1 ? "year" : "years"} ${m} ${m === 1 ? "month" : "months"} ${d} ${d === 1 ? "day" : "days"}`,
    midpoint: "Midpoint",
    vsToday: "Compared with today",
  },

  lunar: {
    kicker: "Quick lookup",
    title: "Lunar ↔ solar date converter",
    converterLabel: "Lunar and solar date conversion",
    solarToLunar: "Solar to lunar",
    solarDate: "Solar date",
    openPicker: "Open the solar date picker",
    pickSolar: "Choose a solar date",
    invalidSolar: "Invalid solar date",
    lunarToSolar: "Lunar to solar",
    day: "Day",
    month: "Month",
    year: "Year",
    leapMonth: "Leap month",
    leapSuffix: " (leap)",
    invalidLunar: "Invalid lunar date",
    dayCanChi: "Day",
    monthCanChi: "Month",
    moonPhase: "Moon phase",
    goodHours: "Auspicious hours",
    calendarKicker: "Vietnamese lunar calendar",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    monthTitle: (month: number, year: number) =>
      `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month - 1]} ${year}`,
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    phases: { new: "New moon", firstQuarter: "First quarter", full: "Full moon", lastQuarter: "Last quarter", waning: "End of the lunar cycle" },
  },

  notFound: {
    title: "Page not found",
    body: "The page you're looking for doesn't exist or has moved.",
    home: "Back to JSON Parser",
  },
};

/** Shape of a dictionary: same keys and function signatures as English, any string values. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? Widen<U>[]
      : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

export default en as Dictionary;
