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
import type { Suggestion } from "@tambo-ai/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { NEW_THREAD_SHORTCUT } from "@/lib/shortcuts";

export interface WorkspaceChatProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: VariantProps<typeof messageVariants>["variant"];
    repoName?: string;
    workspaceId: string;
}

/**
 * A workspace-specific chat component with workspace-scoped thread history.
 * Each workspace gets its own isolated threads.
 */
export const WorkspaceChat = React.forwardRef<
    HTMLDivElement,
    WorkspaceChatProps
>(({ className, variant, repoName, workspaceId, ...props }, ref) => {
    const defaultSuggestions: Suggestion[] = [
        {
            id: "suggestion-1",
            title: "Find good first issues",
            detailedSuggestion: "What are some good first issues I can work on?",
            messageId: "good-first-issues",
        },
        {
            id: "suggestion-2",
            title: "Explore the codebase",
            detailedSuggestion: "Give me an overview of the codebase structure",
            messageId: "codebase-overview",
        },
        {
            id: "suggestion-3",
            title: "Contribution guide",
            detailedSuggestion: "How do I contribute to this project?",
            messageId: "contribution-guide",
        },
    ];

    return (
        <div className="flex h-full w-full" ref={ref} {...props}>
            {/* Workspace-scoped Thread History Sidebar */}
            <WorkspaceThreadHistory workspaceId={workspaceId} position="left" />

            {/* Main Chat Area */}
            <ThreadContainer
                disableSidebarSpacing
                className={className}
            >
                <ScrollableMessageContainer className="p-4">
                    <ThreadContent variant={variant}>
                        <ThreadContentMessages />
                    </ThreadContent>
                </ScrollableMessageContainer>

                {/* Message suggestions status */}
                <MessageSuggestions>
                    <MessageSuggestionsStatus />
                </MessageSuggestions>

                {/* Message input */}
                <div className="px-4 pb-4">
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
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate">Threads are scoped to this workspace.</span>
                        <span className="flex-shrink-0">{NEW_THREAD_SHORTCUT}</span>
                    </div>
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
