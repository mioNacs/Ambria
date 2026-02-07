"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { Check, Copy, FileText, X } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubFileViewerSchema = z
  .object({
    title: z.string().optional().describe("Title displayed above the file"),
    path: z
      .string()
      .optional()
      .describe("Repository path to the file (e.g. 'src/index.ts')"),
    content: z
      .string()
      .describe("The file contents as UTF-8 text (may be truncated)"),
    size: z
      .number()
      .optional()
      .describe("File size in bytes (as reported by GitHub)"),
    encoding: z
      .string()
      .optional()
      .describe("Encoding of the content (usually 'utf-8')"),
    language: z
      .string()
      .optional()
      .describe(
        "Optional highlight.js language name (e.g., 'typescript', 'json', 'markdown')",
      ),
    maxHeight: z
      .number()
      .optional()
      .describe("Max code block height in pixels (defaults to 420 when omitted)"),
  })
  .describe(
    "Displays the contents of a repository file with syntax highlighting and a copy-to-clipboard button.",
  );

export type GitHubFileViewerProps = z.infer<typeof githubFileViewerSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function inferHljsLanguage(path?: string) {
  if (!path) return undefined;
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
    case "mdx":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "toml":
      return "toml";
    case "css":
      return "css";
    case "html":
      return "xml";
    case "sh":
    case "bash":
      return "bash";
    default:
      return undefined;
  }
}

function CodeHeader({
  language,
  code,
}: {
  language?: string;
  code?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = async () => {
    if (!code) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
      setCopied(false);
    }

    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      setError(false);
    }, 2000);
  };

  const Icon = copied ? Check : error ? X : Copy;
  const iconColor = copied
    ? "text-emerald-600"
    : error
      ? "text-destructive"
      : "text-muted-foreground";
  const label = error ? "Copy failed" : copied ? "Copied" : "Copy";
  const title = error
    ? "Copy is not available in this environment or was blocked."
    : "Copy file contents to clipboard";

  return (
    <div className="flex items-center justify-between gap-4 rounded-t-lg bg-muted/50 px-3 py-2">
      <div className="truncate font-mono text-xs text-muted-foreground">
        {language ?? "text"}
      </div>
      <button
        type="button"
        onClick={copyToClipboard}
        title={title}
        className={cn(
          "inline-flex items-center gap-1 rounded-md",
          "border border-muted-foreground/20 bg-card",
          "px-2 py-1 text-xs text-foreground",
          "hover:bg-muted/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <Icon className={cn("size-3.5", iconColor)} />
        {label}
      </button>
    </div>
  );
}

export function GitHubFileViewer({
  title = "File",
  path,
  content,
  size,
  encoding,
  language,
  maxHeight,
  className,
  ...props
}: GitHubFileViewerProps) {
  const deferredContent = React.useDeferredValue(content ?? "");
  const inferredLanguage = language ?? inferHljsLanguage(path);
  const resolvedMaxHeight = typeof maxHeight === "number" ? maxHeight : 420;

  const highlight = React.useMemo(() => {
    if (!deferredContent) {
      return { kind: "text" as const, text: "" };
    }

    try {
      const hasLanguage =
        inferredLanguage && Boolean(hljs.getLanguage(inferredLanguage));
      const html = hasLanguage
        ? hljs.highlight(deferredContent, { language: inferredLanguage }).value
        : hljs.highlightAuto(deferredContent).value;

      return { kind: "html" as const, html };
    } catch {
      return { kind: "text" as const, text: deferredContent };
    }
  }, [deferredContent, inferredLanguage]);

  const detailsParts: string[] = [];
  if (typeof size === "number") detailsParts.push(`${size.toLocaleString("en-US")}B`);
  if (encoding) detailsParts.push(encoding);
  const detailsText = detailsParts.join(" • ");

  const sanitizedHighlightHtml = React.useMemo(() => {
    if (highlight.kind !== "html") return "";

    // highlight.js produces HTML like `<span class="hljs-keyword">...</span>`.
    // We intentionally allow only highlight markup and strip everything else.
    return DOMPurify.sanitize(highlight.html, {
      ALLOWED_TAGS: ["span"],
      ALLOWED_ATTR: ["class"],
    });
  }, [highlight]);

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/5 via-card to-orange-500/5",
        "border border-orange-500/50",
        "shadow-sm shadow-orange-500/5 dark:shadow-orange-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="relative px-4 py-3 border-b border-orange-500/20 bg-muted/30 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-background/50 border border-muted-foreground/10">
              <FileText className="size-4 text-primary/70" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground tracking-tight">{title}</div>
              {path && (
                <div className="truncate font-mono text-[10px] text-muted-foreground/80 mt-0.5">
                  {path}
                </div>
              )}
            </div>
          </div>
          
          {detailsText && (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-background/50 border border-muted-foreground/10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
              <span className="text-[10px] font-medium text-muted-foreground">{detailsText}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-1 bg-muted/10">
        <div className="overflow-hidden rounded-lg border border-muted-foreground/10 shadow-sm">
          <CodeHeader language={inferredLanguage} code={content} />
          <div
            className={cn(
              "overflow-auto bg-background/80 backdrop-blur-sm",
              "[&::-webkit-scrollbar]:w-[6px]",
              "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
              "[&::-webkit-scrollbar:horizontal]:h-[6px]",
            )}
            style={{ maxHeight: resolvedMaxHeight }}
          >
            <pre className="p-4 text-xs leading-relaxed font-mono">
                {highlight.kind === "html" ? (
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-muted/20 border-r border-muted-foreground/10 text-[10px] text-muted-foreground/50 font-mono flex flex-col items-end pr-2 pt-4 select-none">
                    {Array.from({ length: content.split('\n').length }).map((_, i) => (
                      <div key={i} className="leading-relaxed h-[1.5em]">{i + 1}</div>
                    ))}
                  </div>
                  <code
                    className={cn(
                      "hljs block !bg-transparent !p-0 !pl-10 !pt-4 !pb-4",
                      inferredLanguage && `language-${inferredLanguage}`,
                    )}
                    dangerouslySetInnerHTML={{
                      __html: sanitizedHighlightHtml,
                    }}
                  />
                </div>
              ) : (
                <div className="relative">
                   <div className="absolute left-0 top-0 bottom-0 w-8 bg-muted/20 border-r border-muted-foreground/10 text-[10px] text-muted-foreground/50 font-mono flex flex-col items-end pr-2 pt-4 select-none">
                    {Array.from({ length: content.split('\n').length }).map((_, i) => (
                      <div key={i} className="leading-relaxed h-[1.5em]">{i + 1}</div>
                    ))}
                  </div>
                  <code
                    className={cn(
                      "hljs block !bg-transparent !p-0 !pl-10 !pt-4 !pb-4",
                      inferredLanguage && `language-${inferredLanguage}`,
                    )}
                  >
                    {highlight.text}
                  </code>
                </div>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
