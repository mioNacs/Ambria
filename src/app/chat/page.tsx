"use client";

import { ApiKeyCheck } from "@/components/ApiKeyCheck";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";

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

  if (!apiKey) {
    return (
      <div className="min-h-screen p-6">
        <ApiKeyCheck />
      </div>
    );
  }

  return (
    <TamboProvider
      apiKey={apiKey}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
    >
      <div className="h-[100dvh] overflow-hidden">
        <MessageThreadFull />
      </div>
    </TamboProvider>
  );
}
