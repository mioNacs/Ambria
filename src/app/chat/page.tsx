"use client";

import { ApiKeyCheck } from "@/components/ApiKeyCheck";
import { AskAmbriaThreadHistory } from "@/components/chat/AskAmbriaThreadHistory";
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
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { components, tools } from "@/lib/tambo";
import { TamboProvider, type TamboTool, type Suggestion } from "@tambo-ai/react";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Home page component that renders the Tambo chat interface.
 *
 * @remarks
 * The `NEXT_PUBLIC_TAMBO_URL` environment variable specifies the URL of the Tambo server.
 * You do not need to set it if you are using the default Tambo server.
 * It is only required if you are running the API server locally.
 *
 * @see {@link https://github.com/tambo-ai/tambo/blob/main/CONTRIBUTING.md} for instructions on running the API server locally.
 */
export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

  // Load MCP server configurations
  const mcpServers = useMcpServers();

  const { session, isLoading: authLoading } = useAuth();
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();

  // Define a tool to list the user's workspaces
  const listWorkspacesTool: TamboTool = {
    name: "list_user_workspaces",
    description: "List all workspaces (repositories) available to the user. Use this to find out which projects the user has access to.",
    tool: async () => {
      return workspaces.map(w => ({
        id: w.id,
        owner: w.repo_owner,
        repo: w.repo_name,
        description: w.repo_description,
        language: w.repo_language,
        role: w.role
      }));
    },
    inputSchema: z.object({}), // No input needed
    outputSchema: z.array(z.object({
      id: z.string(),
      owner: z.string(),
      repo: z.string(),
      description: z.string().nullable(),
      language: z.string().nullable(),
      role: z.string(),
    })),
  };

  // Combine default tools with our dynamic tool
  const allTools = [...tools, listWorkspacesTool];

  if (!apiKey) {
    return (
      <div className="min-h-screen p-6">
        <ApiKeyCheck />
      </div>
    );
  }

  // Default suggestions
  const defaultSuggestions: Suggestion[] = [
    {
      id: "suggestion-1",
      title: "Get started",
      detailedSuggestion: "What can you help me with?",
      messageId: "welcome-query",
    },
    {
      id: "suggestion-2",
      title: "My Workspaces",
      detailedSuggestion: "List my workspaces and tell me about them.",
      messageId: "list-w-query",
    },
  ];

  if (authLoading || workspacesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <TamboProvider
      apiKey={apiKey}
      components={components}
      tools={allTools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
      userToken={session?.access_token}
      contextHelpers={{
        ask_ambria_context: () => ({
          instruction: "You are 'Ambria', an AI assistant powered by the user's workspaces. You have access to all the repositories listed in the 'list_user_workspaces' tool. When asked about a specific project or 'my projects', first check which workspaces are available. Use the provided GitHub tools with the user's token (injected via 'github_credentials') to read file content, search code, and answer questions. ALWAYS use the user's token for GitHub operations.",
          available_workspaces_summary: workspaces.map(w => `${w.repo_owner}/${w.repo_name} (${w.role})`).join(", "),
        }),
        github_credentials: () => ({
          instructions: "Use this token for ALL GitHub tool calls (getRepoTree, getFileContent, searchFiles, etc.). Do not ask the user for a token.",
          token: session?.provider_token ?? undefined,
        }),
      }}
    >
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <header className="bg-white/80 backdrop-blur border-b border-gray-200 px-4">
          <div className="mx-auto flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4"
                    />
                  </svg>
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-gray-900">Ask Ambria</div>
                  <div className="text-xs text-gray-500">
                    {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} connected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* New Sidebar */}
          <AskAmbriaThreadHistory />

          {/* Main Thread Area */}
          <ThreadContainer
            disableSidebarSpacing
            className="flex-1 min-w-0"
          >
            <ScrollableMessageContainer className="p-4">
              <ThreadContent>
                <ThreadContentMessages />
              </ThreadContent>
            </ScrollableMessageContainer>

            <MessageSuggestions>
              <MessageSuggestionsStatus />
            </MessageSuggestions>

            <div className="px-4 pb-4">
              <MessageInput>
                <MessageInputTextarea placeholder="Ask Ambria anything..." />
                <MessageInputToolbar>
                  <MessageInputFileButton />
                  <MessageInputMcpPromptButton />
                  <MessageInputMcpResourceButton />
                  <MessageInputSubmitButton />
                </MessageInputToolbar>
                <MessageInputError />
              </MessageInput>
            </div>

            <MessageSuggestions initialSuggestions={defaultSuggestions}>
              <MessageSuggestionsList />
            </MessageSuggestions>
          </ThreadContainer>
        </div>
      </div>
    </TamboProvider>
  );
}
