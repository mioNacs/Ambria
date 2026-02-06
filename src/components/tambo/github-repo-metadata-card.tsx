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
        "w-full rounded-xl border border-muted-foreground/20 bg-card p-4",
        "shadow-sm shadow-black/5 dark:shadow-black/30",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-foreground">
            {fullName ?? "Repository"}
          </div>
          {description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}

          {(topics?.length ?? 0) > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(topics ?? []).slice(0, 10).map((topic) => (
                <span
                  key={topic}
                  className="rounded-md border border-muted-foreground/20 bg-muted/60 px-2 py-0.5 text-xs text-foreground/80"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {archived ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-1 text-foreground/80">
              <Archive className="size-3.5" /> Archived
            </span>
          ) : null}
          {disabled ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-1 text-foreground/80">
              Disabled
            </span>
          ) : null}
          {typeof isPrivate === "boolean" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-1 text-foreground/80">
              {isPrivate ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              {isPrivate ? "Private" : "Public"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Star className="size-4" />} label="Stars" value={stars} />
        <Stat icon={<GitFork className="size-4" />} label="Forks" value={forks} />
        <Stat icon={<Users className="size-4" />} label="Watchers" value={watchers} />
        <Stat
          icon={<GitPullRequest className="size-4" />}
          label="Open issues"
          value={openIssues}
        />
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Primary language</div>
          <div className="font-medium text-foreground">{language ?? "—"}</div>
        </div>
        <div className="rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">License</div>
          <div className="font-medium text-foreground">{license ?? "—"}</div>
        </div>
        <div className="rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Default branch</div>
          <div className="font-medium text-foreground">{defaultBranch ?? "—"}</div>
        </div>
        <div className="rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Homepage</div>
          {homepage ? (
            <a
              href={homepage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <span className="truncate">{homepage}</span>
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <div className="font-medium text-foreground">—</div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2">
          <div className="font-medium text-foreground">Created</div>
          <div>{formatDate(createdAt)}</div>
        </div>
        <div className="rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2">
          <div className="font-medium text-foreground">Updated</div>
          <div>{formatDate(updatedAt)}</div>
        </div>
        <div className="rounded-md border border-muted-foreground/20 bg-muted/20 px-3 py-2">
          <div className="font-medium text-foreground">Last push</div>
          <div>{formatDate(pushedAt)}</div>
        </div>
      </div>
    </div>
  );
}
