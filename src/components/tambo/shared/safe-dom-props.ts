import type * as React from "react";

const allowedLiteralKeys = new Set([
  "id",
  "role",
  "title",
  "style",
  "tabIndex",
]);

/**
* Picks a small allowlist of DOM props from a `div` props object.
*
* These Tambo components are often rendered from tool output, so we intentionally
* drop unknown keys to avoid leaking tool fields (e.g., `closedAt`, `updatedAt`)
* onto DOM nodes as invalid attributes.
*/
export function pickSafeDomProps(
  props: React.HTMLAttributes<HTMLDivElement>,
): React.HTMLAttributes<HTMLDivElement> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (allowedLiteralKeys.has(key)) {
      if (key === "style") {
        if (typeof value === "object" && value !== null) {
          safe[key] = value;
        }
      } else {
        safe[key] = value;
      }
      continue;
    }

    if (key.startsWith("aria-") || key.startsWith("data-")) {
      safe[key] = value;
    }
  }

  return safe as React.HTMLAttributes<HTMLDivElement>;
}
