"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { ExternalLink, Star } from "lucide-react";
import * as React from "react";
import { z } from "zod";

const projectSchema = z.object({
  fullName: z
    .string()
    .describe("Repository full name in the form 'owner/repo'")
    .min(1),
  htmlUrl: z.string().url().describe("Link to the repository"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Short repository description"),
  stars: z.number().optional().describe("Star count"),
  language: z.string().nullable().optional().describe("Primary language"),
  topics: z.array(z.string()).optional().describe("Repository topics"),
});

export const openSourceProjectListSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Optional heading shown above the project list"),
    projects: z
      .array(projectSchema)
      .max(10)
      .describe("A curated list of repositories"),
  })
  .describe(
    "A list of recommended open source projects with links and quick stats.",
  );

export type OpenSourceProjectListProps = z.infer<
  typeof openSourceProjectListSchema
> &
  React.HTMLAttributes<HTMLDivElement>;

function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function OpenSourceProjectList({
  className,
  title,
  projects,
  ...props
}: OpenSourceProjectListProps) {
  const domProps = pickSafeDomProps(props);

  if (projects.length === 0) {
    return (
      <section
        {...domProps}
        className={cn(
          "rounded-xl border border-muted-foreground/20 bg-muted/20 p-4 text-foreground",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">
              {title ?? "Recommended projects"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No projects matched these filters. Try broadening your tech stack or
              interest.
            </p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section
      {...domProps}
      className={cn(
        "rounded-xl border border-muted-foreground/20 bg-muted/20 p-4 text-foreground",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            {title ?? "Recommended projects"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Look for an active repo with a clear CONTRIBUTING guide and issues you
            can reproduce.
          </p>
        </div>
      </header>

      <div className="mt-4 grid gap-3">
        {projects.map((project) => {
          const hasStars =
            typeof project.stars === "number" && !Number.isNaN(project.stars);

          return (
            <article
              key={project.fullName}
              className="rounded-lg border border-muted-foreground/15 bg-background/50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={project.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-semibold hover:underline"
                  >
                    <span className="truncate">{project.fullName}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>

                {hasStars && (
                  <div className="flex shrink-0 items-center gap-1 rounded-md border border-muted-foreground/20 bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5" />
                    <span className="tabular-nums">
                      {formatCompactNumber(project.stars)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {project.language && (
                  <span className="rounded-full border border-muted-foreground/20 bg-muted/30 px-2 py-0.5">
                    {project.language}
                  </span>
                )}
                {(project.topics ?? []).slice(0, 4).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-muted-foreground/20 bg-muted/10 px-2 py-0.5"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
