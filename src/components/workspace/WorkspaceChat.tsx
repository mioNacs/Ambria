"use client";

import type { messageVariants } from "@/components/tambo/message";
import {
    MessageInput,
    MessageInputError,
    MessageInputFileButton,
    MessageInputMcpPromptButton,
    MessageInputMcpResourceButton,
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
import { WorkspaceThreadHistory } from "./WorkspaceThreadHistory";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@tambo-ai/react";
import type { WorkspaceRole } from "@/lib/tambo";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

const suggestionTemplates = {
    goodFirstIssues: {
        id: "suggestion-good-first-issues",
        title: "Find good first issues",
        detailedSuggestion: "What are some good first issues I can work on?",
        messageId: "good-first-issues",
    },
    exploreCodebase: {
        id: "suggestion-codebase-overview",
        title: "Explore the codebase",
        detailedSuggestion: "Give me an overview of the codebase structure",
        messageId: "codebase-overview",
    },
    contributionGuide: {
        id: "suggestion-contribution-guide",
        title: "Contribution guide",
        detailedSuggestion: "How do I contribute to this project?",
        messageId: "contribution-guide",
    },
    triageIssues: {
        id: "suggestion-triage-issues",
        title: "Triage new issues",
        detailedSuggestion: "Show me the newest open issues and what needs triage",
        messageId: "triage-issues",
    },
    reviewPullRequests: {
        id: "suggestion-review-pull-requests",
        title: "Review pull requests",
        detailedSuggestion: "List open pull requests and summarize what needs review",
        messageId: "review-pull-requests",
    },
    workflowRuns: {
        id: "suggestion-workflow-runs",
        title: "Check CI health",
        detailedSuggestion: "Show recent workflow runs and highlight failures",
        messageId: "workflow-runs",
    },
} satisfies Record<string, Suggestion>;

const suggestionKeysByRole: Record<WorkspaceRole, (keyof typeof suggestionTemplates)[]> = {
    contributor: ["goodFirstIssues", "exploreCodebase", "contributionGuide"],
    maintainer: ["triageIssues", "reviewPullRequests", "workflowRuns"],
    both: ["goodFirstIssues", "triageIssues", "reviewPullRequests"],
};

export interface WorkspaceChatProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: VariantProps<typeof messageVariants>["variant"];
    repoName?: string;
    workspaceId: string;
    role: WorkspaceRole;
}

/**
 * A workspace-specific chat component with workspace-scoped thread history.
 * Each workspace gets its own isolated threads.
 */
export const WorkspaceChat = React.forwardRef<
    HTMLDivElement,
    WorkspaceChatProps
>(({ className, variant, repoName, workspaceId, role, ...props }, ref) => {
    const defaultSuggestions: Suggestion[] = React.useMemo(
        () => suggestionKeysByRole[role].map((k) => suggestionTemplates[k]),
        [role],
    );

    return (
        <div className="flex h-full min-w-0 flex-1" ref={ref} {...props}>
            {/* Workspace-scoped Thread History Sidebar */}
            <div className="hidden lg:block">
                <WorkspaceThreadHistory workspaceId={workspaceId} position="left" />
            </div>

            {/* Main Chat Area */}
            <ThreadContainer
                disableSidebarSpacing
                className={cn("flex-1 min-w-0", className)}
            >
                <ScrollableMessageContainer className="p-3 sm:p-4">
                    <ThreadContent variant={variant}>
                        <ThreadContentMessages />
                    </ThreadContent>
                </ScrollableMessageContainer>

                {/* Message suggestions status */}
                <MessageSuggestions>
                    <MessageSuggestionsStatus />
                </MessageSuggestions>

                {/* Message input */}
                <div className="px-3 sm:px-4 pb-2">
                    <MessageInput>
                        <MessageInputTextarea placeholder={`Ask about ${repoName || 'this repository'}...`} />
                        <MessageInputToolbar>
                            <MessageInputFileButton />
                            <MessageInputMcpPromptButton />
                            <MessageInputMcpResourceButton />
                            <MessageInputSubmitButton />
                        </MessageInputToolbar>
                        <MessageInputError />
                    </MessageInput>
                </div>

                {/* Message suggestions */}
                <MessageSuggestions initialSuggestions={defaultSuggestions}>
                    <MessageSuggestionsList />
                </MessageSuggestions>
            </ThreadContainer>
        </div>
    );
});
WorkspaceChat.displayName = "WorkspaceChat";
