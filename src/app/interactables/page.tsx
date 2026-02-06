"use client";

import {
  MessageInput,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import { ApiKeyCheck } from "@/components/ApiKeyCheck";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SettingsPanel } from "./components/settings-panel";

export default function InteractablesPage() {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;
  const [isDesktopChatOpen, setIsDesktopChatOpen] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const mobileCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isMobileChatOpen) return;
    mobileCloseRef.current?.focus();
  }, [isMobileChatOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMobileChatOpen(false);
      }
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

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
    >
      <div className="flex min-h-[100dvh] bg-gray-50 flex-col lg:flex-row">
        {/* Desktop Chat Sidebar */}
        <div
          className={`${
            isDesktopChatOpen ? "w-80" : "w-0"
          } hidden lg:flex border-r border-gray-200 bg-white transition-all duration-300 flex-col relative`}
        >
          {isDesktopChatOpen && (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Chat Assistant
                </h2>
              </div>

              <ScrollableMessageContainer className="flex-1 p-4">
                <ThreadContent variant="default">
                  <ThreadContentMessages />
                </ThreadContent>
              </ScrollableMessageContainer>

              <div className="p-4 border-t border-gray-200">
                <MessageInput variant="bordered">
                  <MessageInputTextarea placeholder="Update the settings..." />
                  <MessageInputToolbar>
                    <MessageInputSubmitButton />
                  </MessageInputToolbar>
                </MessageInput>
              </div>
            </>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setIsDesktopChatOpen(!isDesktopChatOpen)}
            className="absolute -right-10 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50"
          >
            {isDesktopChatOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Mobile toolbar */}
        <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="text-sm font-semibold text-gray-900">Interactables</div>
            <button
              type="button"
              onClick={() => setIsMobileChatOpen(true)}
              className="px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 transition-colors"
            >
              Open chat
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-8">
            <SettingsPanel />
          </div>
        </div>

        {/* Mobile Chat Drawer */}
        {isMobileChatOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsMobileChatOpen(false)}
              aria-label="Close chat"
            />
            <div
              className="absolute inset-y-0 left-0 w-[min(24rem,90vw)] bg-white shadow-xl flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Chat assistant"
              onKeyDownCapture={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setIsMobileChatOpen(false);
                }
              }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Chat Assistant</h2>
                <button
                  ref={mobileCloseRef}
                  type="button"
                  onClick={() => setIsMobileChatOpen(false)}
                  className="p-2 -mr-1 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close chat"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <ScrollableMessageContainer className="flex-1 p-4">
                <ThreadContent variant="default">
                  <ThreadContentMessages />
                </ThreadContent>
              </ScrollableMessageContainer>

              <div className="p-4 border-t border-gray-200">
                <MessageInput variant="bordered">
                  <MessageInputTextarea placeholder="Update the settings..." />
                  <MessageInputToolbar>
                    <MessageInputSubmitButton />
                  </MessageInputToolbar>
                </MessageInput>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </TamboProvider>
  );
}
