export type DiffKind = "same" | "added" | "removed" | "modified";

export type DiffRow = {
  kind: DiffKind;
  left: string;
  right: string;
  leftNumber?: number;
  rightNumber?: number;
};

export type DiffResult = {
  rows: DiffRow[];
  /** True when the inputs were too large for an exact LCS and lines were paired by position. */
  approximate: boolean;
  stats: Record<DiffKind, number>;
};

/** Upper bound on LCS table cells (~20 MB as Uint32). Larger inputs fall back to positional pairing. */
export const MAX_LCS_CELLS = 5_000_000;

function lcsRows(left: string[], right: string[], leftOffset: number, rightOffset: number): DiffRow[] {
  const width = right.length + 1;
  const table = new Uint32Array((left.length + 1) * width);

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        left[i] === right[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({ kind: "same", left: left[i], right: right[j], leftNumber: leftOffset + i + 1, rightNumber: rightOffset + j + 1 });
      i += 1;
      j += 1;
    } else if (j < right.length && (i === left.length || table[i * width + j + 1] >= table[(i + 1) * width + j])) {
      rows.push({ kind: "added", left: "", right: right[j], rightNumber: rightOffset + j + 1 });
      j += 1;
    } else {
      rows.push({ kind: "removed", left: left[i], right: "", leftNumber: leftOffset + i + 1 });
      i += 1;
    }
  }
  return rows;
}

function positionalRows(left: string[], right: string[], leftOffset: number, rightOffset: number): DiffRow[] {
  return Array.from({ length: Math.max(left.length, right.length) }, (_, index) => {
    const hasLeft = index < left.length;
    const hasRight = index < right.length;
    return {
      kind: !hasLeft ? "added" : !hasRight ? "removed" : left[index] === right[index] ? "same" : "modified",
      left: hasLeft ? left[index] : "",
      right: hasRight ? right[index] : "",
      leftNumber: hasLeft ? leftOffset + index + 1 : undefined,
      rightNumber: hasRight ? rightOffset + index + 1 : undefined,
    } satisfies DiffRow;
  });
}

/** Pairs an adjacent removed/added run into "modified" rows so changed lines sit side by side. */
function pairModifications(raw: DiffRow[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let index = 0;

  while (index < raw.length) {
    if (raw[index].kind !== "removed" && raw[index].kind !== "added") {
      rows.push(raw[index]);
      index += 1;
      continue;
    }

    const removed: DiffRow[] = [];
    const added: DiffRow[] = [];
    while (index < raw.length && (raw[index].kind === "removed" || raw[index].kind === "added")) {
      (raw[index].kind === "removed" ? removed : added).push(raw[index]);
      index += 1;
    }

    const paired = Math.min(removed.length, added.length);
    for (let k = 0; k < paired; k += 1) {
      rows.push({
        kind: "modified",
        left: removed[k].left,
        right: added[k].right,
        leftNumber: removed[k].leftNumber,
        rightNumber: added[k].rightNumber,
      });
    }
    rows.push(...removed.slice(paired), ...added.slice(paired));
  }

  return rows;
}

export function diffText(leftValue: string, rightValue: string): DiffResult {
  const left = leftValue.split("\n");
  const right = rightValue.split("\n");

  // Trim the common prefix and suffix so the LCS table only covers the changed middle.
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start += 1;
  let leftEnd = left.length;
  let rightEnd = right.length;
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
    leftEnd -= 1;
    rightEnd -= 1;
  }

  const leftMiddle = left.slice(start, leftEnd);
  const rightMiddle = right.slice(start, rightEnd);
  const approximate = (leftMiddle.length + 1) * (rightMiddle.length + 1) > MAX_LCS_CELLS;
  const middle = approximate
    ? positionalRows(leftMiddle, rightMiddle, start, start)
    : pairModifications(lcsRows(leftMiddle, rightMiddle, start, start));

  const same = (from: number, to: number, leftShift: number, rightShift: number) =>
    left.slice(from, to).map<DiffRow>((line, index) => ({
      kind: "same",
      left: line,
      right: line,
      leftNumber: from + index + 1 + leftShift,
      rightNumber: from + index + 1 + rightShift,
    }));

  const rows = [
    ...same(0, start, 0, 0),
    ...middle,
    ...same(leftEnd, left.length, 0, rightEnd - leftEnd),
  ];

  const stats = { same: 0, added: 0, removed: 0, modified: 0 };
  for (const row of rows) stats[row.kind] += 1;

  return { rows, approximate, stats };
}
