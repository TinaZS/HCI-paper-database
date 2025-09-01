import React, { useMemo, useState, useEffect } from "react";
import Chatbot from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Chatbot config (unchanged API behavior) ---
  const config = useMemo(
    () => ({
      botName: "Research Bot",
      initialMessages: [
        {
          type: "bot",
          id: "1",
          message:
            "Hi! I can help answer your questions based on real academic papers. Ask me anything!",
        },
      ],
      customStyles: {
        botMessageBox: { backgroundColor: "#3B82F6" },
        chatButton: { backgroundColor: "#3B82F6" },
      },
    }),
    []
  );

  // Message Parser (unchanged)
  class MessageParser {
    constructor(actionProvider) {
      this.actionProvider = actionProvider;
    }
    parse(message) {
      this.actionProvider.handleUserMessage(message);
    }
  }

  // Action Provider (unchanged API pattern: loading → replace with result)
  class ActionProvider {
    constructor(createChatBotMessage, setStateFunc) {
      this.createChatBotMessage = createChatBotMessage;
      this.setState = setStateFunc;
    }
    async handleUserMessage(message) {
      const loading = this.createChatBotMessage("Thinking…");
      this.setState((p) => ({ ...p, messages: [...p.messages, loading] }));
      try {
        const res = await fetch("http://localhost:10000/rag_query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: message }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.setState((p) => ({
          ...p,
          messages: [
            ...p.messages.slice(0, -1),
            this.createChatBotMessage(data.answer || "No results found."),
          ],
        }));
      } catch {
        this.setState((p) => ({
          ...p,
          messages: [
            ...p.messages.slice(0, -1),
            this.createChatBotMessage("Sorry — server error. Try again."),
          ],
        }));
      }
    }
  }

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div
          className={`rounded-2xl shadow-2xl bg-white border border-gray-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
            ${isExpanded ? "w-[520px] h-[720px]" : "w-[380px] h-[560px]"}`}
          aria-label="Research chatbot window"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <span className="font-semibold">Ask about papers</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded((p) => !p)}
                className="px-2 py-1 rounded hover:bg-blue-500"
                aria-label={isExpanded ? "Shrink" : "Expand"}
                title={isExpanded ? "Shrink" : "Expand"}
              >
                {isExpanded ? "–" : "⤢"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xl hover:text-gray-200 leading-none"
                aria-label="Close chat"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-hidden">
            {/* Scoped overrides to make the chat fill space + wider bubbles */}
            <div className="chatbot-root h-full">
              <style>{`
                .chatbot-root .react-chatbot-kit-chat-container {
                  height: 100% !important; box-shadow: none !important;
                }
                .chatbot-root .react-chatbot-kit-chat-inner-container {
                  height: 100% !important; display: flex !important; flex-direction: column !important;
                }
                .chatbot-root .react-chatbot-kit-chat-message-container {
                  flex: 1 1 auto !important; overflow-y: auto !important; max-height: none !important;
                }
                /* Hide the gray library header to reclaim room */
                .chatbot-root .react-chatbot-kit-chat-header { display: none !important; }

                /* Use the horizontal space (fixes the empty right side) */
                .chatbot-root .react-chatbot-kit-chat-bot-message,
                .chatbot-root .react-chatbot-kit-user-chat-message {
                  max-width: 92% !important;
                }
                .chatbot-root .react-chatbot-kit-chat-bot-message { margin-right: 8px !important; }
                .chatbot-root .react-chatbot-kit-user-chat-message { margin-left: 8px !important; }

                /* Optional: tighter input bar */
                .chatbot-root .react-chatbot-kit-chat-input-container { padding: 8px 10px !important; }
              `}</style>

              <Chatbot
                config={config}
                messageParser={MessageParser}
                actionProvider={ActionProvider}
                placeholderText="Write your message here"
                headerText=""
                runInitialMessages
              />
            </div>
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 text-[11px] text-gray-500 bg-gray-50 border-t">
            Answers are based on your indexed papers.
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 text-white text-2xl shadow-lg hover:bg-blue-700 flex items-center justify-center"
          aria-label="Open research chatbot"
          title="Ask about papers"
        >
          💬
        </button>
      )}
    </div>
  );
}
