"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import * as React from "react";
import { z } from "zod";

const openSourceGuideTopics = [
  "what_is_open_source",
  "dos_and_donts",
  "finding_projects",
  "raising_a_good_pr",
] as const;

type OpenSourceGuideTopic = (typeof openSourceGuideTopics)[number];

export const openSourceGuideSchema = z
  .object({
    topic: z
      .enum(openSourceGuideTopics)
      .describe(
        "Which open source topic to show (definition, etiquette, finding projects, or PR workflow)",
      ),
  })
  .describe(
    "A compact, structured guide for getting started with open source contributions.",
  );

export type OpenSourceGuideProps = z.infer<typeof openSourceGuideSchema> &
  React.HTMLAttributes<HTMLDivElement>;

const contentByTopic: Record<
  OpenSourceGuideTopic,
  {
    title: string;
    description: string;
    sections: Array<{ title: string; bullets: string[] }>;
  }
> = {
  what_is_open_source: {
    title: "What is open source?",
    description:
      "Open source software is software whose source code is available under a license that lets people use it, study it, modify it, and share it.",
    sections: [
      {
        title: "What to look for",
        bullets: [
          "A clear license (MIT, Apache-2.0, GPL, etc.)",
          "A CONTRIBUTING guide and/or README with setup steps",
          "A Code of Conduct (signals expectations for collaboration)",
        ],
      },
      {
        title: "How contributions usually work",
        bullets: [
          "Discuss the change first (issue/discussion) if it’s non-trivial",
          "Create a branch, make small focused commits, open a PR",
          "Respond to review feedback and keep the conversation respectful",
        ],
      },
    ],
  },
  dos_and_donts: {
    title: "Open source do’s and don’ts",
    description:
      "Good open source contributions are mostly about communication and reducing maintainer load.",
    sections: [
      {
        title: "Do",
        bullets: [
          "Read the README + CONTRIBUTING before doing work",
          "Ask clarifying questions early (and be specific)",
          "Keep changes small and explain the “why” in the PR description",
          "Follow the project’s code style and conventions",
        ],
      },
      {
        title: "Don’t",
        bullets: [
          "Open huge PRs with unrelated refactors",
          "Assume maintainers owe immediate responses",
          "Argue about preferences—align with the project’s existing patterns",
          "Take feedback personally (review is about the code, not you)",
        ],
      },
    ],
  },
  finding_projects: {
    title: "Finding a good open source project",
    description:
      "Pick a project that matches your interests, has active maintainers, and has a clear path for new contributors.",
    sections: [
      {
        title: "Signals a project is newcomer-friendly",
        bullets: [
          "Issues labeled “good first issue” or “help wanted”",
          "Recent commits/releases (the repo is active)",
          "Clear setup instructions and contributing guidelines",
        ],
      },
      {
        title: "Quick strategy",
        bullets: [
          "Start with docs or small bug fixes to learn the codebase",
          "Reproduce the issue locally before coding",
          "Share a short plan in the issue before opening the PR",
        ],
      },
    ],
  },
  raising_a_good_pr: {
    title: "How to raise a good PR",
    description:
      "A good PR is easy to review: focused scope, clear context, and proof it works.",
    sections: [
      {
        title: "Checklist",
        bullets: [
          "Explain what changed and why (link the issue/discussion)",
          "Keep it small: one feature/fix per PR",
          "Add tests or a clear verification note (commands + results)",
          "Update docs if behavior changed",
          "Be responsive and polite during review",
        ],
      },
      {
        title: "Reviewer-friendly details",
        bullets: [
          "Screenshots for UI changes",
          "Edge cases + tradeoffs called out in the description",
          "A clear follow-up plan if you intentionally deferred work",
        ],
      },
    ],
  },
};

export function OpenSourceGuide({
  className,
  topic,
  ...props
}: OpenSourceGuideProps) {
  const content = contentByTopic[topic];
  const domProps = pickSafeDomProps(props);

  return (
    <section
      {...domProps}
      className={cn(
        "rounded-xl border border-muted-foreground/20 bg-muted/20 p-4 text-foreground",
        className,
      )}
    >
      <header className="space-y-1">
        <h3 className="text-base font-semibold">{content.title}</h3>
        <p className="text-sm text-muted-foreground">{content.description}</p>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {content.sections.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-muted-foreground/15 bg-background/50 p-3"
          >
            <div className="text-sm font-semibold">{section.title}</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span aria-hidden className="text-foreground/70">
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
