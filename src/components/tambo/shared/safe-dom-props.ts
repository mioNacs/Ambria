import type * as React from "react";

const allowedLiteralKeys = new Set([
  "id",
  "role",
  "title",
  "style",
  "tabIndex",
]);

export function pickSafeDomProps(
  props: Record<string, unknown>,
): React.HTMLAttributes<HTMLDivElement> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (allowedLiteralKeys.has(key)) {
      safe[key] = value;
      continue;
    }

    if (key.startsWith("aria-") || key.startsWith("data-")) {
      safe[key] = value;
    }
  }

  return safe as React.HTMLAttributes<HTMLDivElement>;
}
