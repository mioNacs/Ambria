"use client";

import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { Check, Copy, X } from "lucide-react";
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
      .optional()
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
      .describe("Max code block height in pixels (default 420)")
      .default(420),
  })
  .partial()
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

  return (
    <div className="flex items-center justify-between gap-4 rounded-t-md bg-muted/30 px-3 py-2">
      <div className="truncate font-mono text-xs text-muted-foreground">
        {language ?? "text"}
      </div>
      <button
        type="button"
        onClick={copyToClipboard}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted/40"
      >
        <Icon className={cn("size-3.5", iconColor)} />
        {copied ? "Copied" : "Copy"}
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
  maxHeight = 420,
  className,
  ...props
}: GitHubFileViewerProps) {
  const deferredContent = React.useDeferredValue(content ?? "");
  const inferredLanguage = language ?? inferHljsLanguage(path);

  const highlightedHtml = React.useMemo(() => {
    if (!deferredContent) return "";
    try {
      if (inferredLanguage) {
        return hljs.highlight(deferredContent, { language: inferredLanguage }).value;
      }
      return hljs.highlightAuto(deferredContent).value;
    } catch {
      return deferredContent;
    }
  }, [deferredContent, inferredLanguage]);

  const detailsParts: string[] = [];
  if (typeof size === "number") detailsParts.push(`${size.toLocaleString("en-US")}B`);
  if (encoding) detailsParts.push(encoding);
  const detailsText = detailsParts.join(" • ");

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-background p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground">{title}</div>
          {path ? (
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {path}
            </div>
          ) : null}
          {detailsText ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {detailsText}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <CodeHeader language={inferredLanguage} code={content} />
        <div
          className={cn(
            "overflow-auto bg-background",
            "[&::-webkit-scrollbar]:w-[6px]",
            "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-md",
            "[&::-webkit-scrollbar:horizontal]:h-[4px]",
          )}
          style={{ maxHeight }}
        >
          <pre className="p-3 text-xs leading-relaxed">
            <code
              className={cn("hljs", inferredLanguage && `language-${inferredLanguage}`)}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(highlightedHtml || ""),
              }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}
