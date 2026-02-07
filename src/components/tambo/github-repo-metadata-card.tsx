"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import {
  Archive,
  ExternalLink,
  GitFork,
  GitPullRequest,
  Lock,
  Star,
  Unlock,
  Users,
} from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubRepoMetadataCardSchema = z
  .object({
    fullName: z
      .string()
      .describe("Repository full name in the form 'owner/repo'"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Short repository description"),
    stars: z.number().describe("Star count"),
    forks: z.number().describe("Fork count"),
    watchers: z.number().describe("Watcher/subscriber count"),
    openIssues: z.number().describe("Open issues count"),
    topics: z
      .array(z.string())
      .describe("Repository topics/tags")
      .optional(),
    license: z.string().nullable().optional().describe("License name"),
    language: z
      .string()
      .nullable()
      .optional()
      .describe("Primary repository language"),
    defaultBranch: z
      .string()
      .optional()
      .describe("Default branch name (usually 'main' or 'master')"),
    isPrivate: z
      .boolean()
      .optional()
      .describe("Whether the repository is private"),
    homepage: z
      .string()
      .nullable()
      .optional()
      .describe("Repository homepage URL"),
    archived: z
      .boolean()
      .optional()
      .describe("Whether the repository is archived"),
    disabled: z
      .boolean()
      .optional()
      .describe("Whether the repository is disabled"),
    createdAt: z
      .string()
      .optional()
      .describe("Repository creation date (ISO string)"),
    updatedAt: z
      .string()
      .optional()
      .describe("Last updated date (ISO string)"),
    pushedAt: z
      .string()
      .optional()
      .describe("Last push date (ISO string)"),
  })
  .describe(
    "A summary card showing key GitHub repository metadata (stars, forks, topics, language, etc.)",
  );

export type GitHubRepoMetadataCardProps = z.infer<
  typeof githubRepoMetadataCardSchema
> & React.HTMLAttributes<HTMLDivElement>;

function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold text-foreground">
          {formatCompactNumber(value)}
        </div>
      </div>
    </div>
  );
}

export function GitHubRepoMetadataCard({
  fullName,
  description,
  stars,
  forks,
  watchers,
  openIssues,
  topics,
  license,
  language,
  defaultBranch,
  isPrivate,
  homepage,
  archived,
  disabled,
  createdAt,
  updatedAt,
  pushedAt,
  className,
  ...props
}: GitHubRepoMetadataCardProps) {
  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-violet-500/5 via-card to-blue-500/5",
        "border border-indigo-500/50",
        "shadow-sm shadow-indigo-500/5 dark:shadow-indigo-500/10",
        "group transition-all hover:shadow-md hover:shadow-indigo-500/10 hover:border-indigo-500/60",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      {/* Header with blurred background backdrop */}
      <div className="relative px-5 py-4 border-b border-indigo-500/20 bg-muted/30">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="truncate text-lg font-semibold text-foreground tracking-tight">
                {fullName ?? "Repository"}
              </div>
              
              <div className="flex items-center gap-1.5 ml-2">
                {typeof isPrivate === "boolean" && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                    isPrivate 
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" 
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                  )}>
                    {isPrivate ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                    {isPrivate ? "Private" : "Public"}
                  </span>
                )}
                {archived && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                    <Archive className="size-3" /> Archived
                  </span>
                )}
              </div>
            </div>

            {description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground/90 leading-relaxed max-w-2xl">
                {description}
              </p>
            ) : null}

            {(topics?.length ?? 0) > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(topics ?? []).slice(0, 8).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary/80 transition-colors hover:bg-primary/10"
                  >
                    #{topic}
                  </span>
                ))}
                {(topics?.length ?? 0) > 8 && (
                  <span className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground">
                    +{topics!.length - 8} more
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all group/stat">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1 group-hover/stat:text-indigo-500 transition-colors">
              <Star className="size-3.5" />
              <span className="text-xs font-medium">Stars</span>
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight">
              {formatCompactNumber(stars)}
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all group/stat">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1 group-hover/stat:text-indigo-500 transition-colors">
              <GitFork className="size-3.5" />
              <span className="text-xs font-medium">Forks</span>
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight">
              {formatCompactNumber(forks)}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all group/stat">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1 group-hover/stat:text-indigo-500 transition-colors">
              <Users className="size-3.5" />
              <span className="text-xs font-medium">Watchers</span>
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight">
              {formatCompactNumber(watchers)}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all group/stat">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1 group-hover/stat:text-indigo-500 transition-colors">
              <GitPullRequest className="size-3.5" />
              <span className="text-xs font-medium">Issues</span>
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight">
              {formatCompactNumber(openIssues)}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Primary Language</div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary/60" />
              <span className="font-medium text-foreground">{language ?? "—"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">License</div>
            <div className="font-medium text-foreground truncate" title={license ?? ""}>{license ?? "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Default Branch</div>
            <div className="font-mono text-xs font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded w-fit">
              {defaultBranch ?? "—"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Homepage</div>
            {homepage ? (
              <a
                href={homepage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors truncate max-w-full"
              >
                <span className="truncate">{homepage.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </div>
        </div>

        {/* Timestamps Footer */}
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3 pt-4 border-t border-muted-foreground/10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400/50" />
            <span>Created {formatDate(createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400/50" />
            <span>Updated {formatDate(updatedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            <span className="text-foreground/80">Pushed {formatDate(pushedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
