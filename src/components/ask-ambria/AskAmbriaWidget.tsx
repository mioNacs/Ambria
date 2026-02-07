"use client";

import {
  MessageInput,
  MessageInputError,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { ThreadContainer } from "@/components/tambo/thread-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import { askAmbriaComponents, askAmbriaTools } from "@/lib/ask-ambria/tambo-registry";
import { searchOpenSourceProjects } from "@/services/ask-ambria/search-open-source-projects";
import { cn } from "@/lib/utils";
import type { InitialTamboThreadMessage, Suggestion } from "@tambo-ai/react";
import { TamboProvider } from "@tambo-ai/react";
import { MessageSquareText, X } from "lucide-react";
import * as React from "react";

const systemPrompt =
  "You are Ambria, a friendly open source mentor. Help users learn open source fundamentals and contribute confidently. When users ask for project recommendations: ask for their preferred tech stack (language) and skill level, then use the `searchOpenSourceProjects` tool. After the tool returns, render the `OpenSourceProjectList` component with `projects: <tool_result>.projects` (and optionally `title`). For common questions (what is open source, etiquette, finding projects, raising a good PR), prefer using the `OpenSourceGuide` component when it fits. Keep answers practical and concise.";

const initialMessages: InitialTamboThreadMessage[] = [
  {
    role: "system",
    content: [{ type: "text", text: systemPrompt }],
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Hi — I’m Ambria. Tell me what tech stack you want to use (or pick a quick prompt below) and I’ll help you find good beginner-friendly projects.",
      },
    ],
  },
];

const suggestionTemplates = {
  whatIsOpenSource: {
    id: "ask-ambria-what-is-open-source",
    title: "What is open source?",
    detailedSuggestion: "What is open source software?",
    messageId: "ask-ambria-what-is-open-source",
  },
  dosAndDonts: {
    id: "ask-ambria-dos-and-donts",
    title: "Do’s and don’ts",
    detailedSuggestion: "What are open source do’s and don’ts?",
    messageId: "ask-ambria-dos-and-donts",
  },
  recommendProjects: {
    id: "ask-ambria-recommend-projects",
    title: "Recommend projects",
    detailedSuggestion:
      "Find me some good open source projects to contribute to. Ask me my preferred tech stack and skill level first.",
    messageId: "ask-ambria-recommend-projects",
  },
  goodPr: {
    id: "ask-ambria-good-pr",
    title: "Raise a good PR",
    detailedSuggestion: "How do I raise a good pull request?",
    messageId: "ask-ambria-good-pr",
  },
} satisfies Record<string, Suggestion>;

const defaultSuggestions: Suggestion[] = [
  suggestionTemplates.whatIsOpenSource,
  suggestionTemplates.dosAndDonts,
  suggestionTemplates.recommendProjects,
  suggestionTemplates.goodPr,
];

function AskAmbriaChat() {
  return (
    <ThreadContainer disableSidebarSpacing className="flex min-h-0 flex-1">
      <ScrollableMessageContainer className="p-4">
        <ThreadContent>
          <ThreadContentMessages />
        </ThreadContent>
      </ScrollableMessageContainer>

      <div className="px-4 pb-3">
        <MessageInput>
          <MessageInputTextarea placeholder="Ask about open source, projects, or your first PR…" />
          <MessageInputToolbar>
            <MessageInputSubmitButton />
          </MessageInputToolbar>
          <MessageInputError />
        </MessageInput>
      </div>

      <MessageSuggestions initialSuggestions={defaultSuggestions}>
        <MessageSuggestionsStatus />
        <MessageSuggestionsList />
      </MessageSuggestions>
    </ThreadContainer>
  );
}

export interface AskAmbriaWidgetProps {
  contextKey: string;
  githubToken?: string;
}

type SearchOpenSourceProjectsInput = Omit<
  Parameters<typeof searchOpenSourceProjects>[0],
  "token"
>;

export function AskAmbriaWidget({ contextKey, githubToken }: AskAmbriaWidgetProps) {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;
  const [isOpen, setIsOpen] = React.useState(false);
  const openButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  const close = React.useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => openButtonRef.current?.focus());
  }, []);

  const tools = React.useMemo(() => {
    return askAmbriaTools.map((tool) => {
      if (tool.name !== "searchOpenSourceProjects") return tool;

      return {
        ...tool,
        tool: async (input: SearchOpenSourceProjectsInput) => {
          return await searchOpenSourceProjects({
            ...input,
            token: githubToken,
          });
        },
      };
    });
  }, [githubToken]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      '[contenteditable="true"], textarea, input, button, a[href], [tabindex]:not([tabindex="-1"])',
    );
    (focusTarget ?? dialogRef.current)?.focus();
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "AskAmbriaWidget: NEXT_PUBLIC_TAMBO_API_KEY is missing; widget will not render.",
      );
    }
    return null;
  }

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg",
          "hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50",
        )}
      >
        <MessageSquareText className="h-5 w-5" />
        Ask Ambria
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            role="presentation"
            aria-hidden="true"
            className="absolute inset-0 bg-black/40"
            onClick={close}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ask Ambria"
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;

              const isActuallyFocusable = (element: HTMLElement) => {
                if (element.hasAttribute("disabled")) return false;
                if (element.getAttribute("aria-hidden") === "true") return false;
                if (element.hasAttribute("hidden")) return false;
                if (element.hasAttribute("inert")) return false;

                const style = window.getComputedStyle(element);
                if (style.display === "none") return false;
                if (style.visibility === "hidden") return false;

                return true;
              };

              const focusables = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(
                  'button, [href], input, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
                ) ?? [],
              ).filter(isActuallyFocusable);

              if (focusables.length === 0) return;

              const active = document.activeElement as HTMLElement | null;
              const currentIndex = active ? focusables.indexOf(active) : -1;
              const nextIndex = event.shiftKey
                ? currentIndex <= 0
                  ? focusables.length - 1
                  : currentIndex - 1
                : currentIndex === focusables.length - 1
                  ? 0
                  : currentIndex + 1;

              event.preventDefault();
              focusables[nextIndex]?.focus();
            }}
            className={cn(
              "absolute bottom-6 right-6 flex h-[70vh] w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl",
              "sm:h-[620px]",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  Ask Ambria
                </div>
                <div className="text-xs text-gray-500">
                  Open source mentor
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <TamboProvider
                apiKey={apiKey}
                tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
                components={askAmbriaComponents}
                tools={tools}
                contextKey={contextKey}
                initialMessages={initialMessages}
                contextHelpers={{
                  open_source_mode: () => ({
                    assistantStyle:
                      "Be practical and encouraging. Prefer checklists, short examples, and next steps.",
                  }),
                }}
              >
                <AskAmbriaChat />
              </TamboProvider>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
