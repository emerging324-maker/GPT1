"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };
type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

const STORAGE_KEY = "sudharsangpt.conversations";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function titleFrom(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 40 ? clean.slice(0, 40) + "…" : clean || "New chat";
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        setConversations(parsed);
        if (parsed.length) setActiveId(parsed[0].id);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (conversations.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversations, activeId, isStreaming]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  function newChat() {
    const conv: Conversation = {
      id: uid(),
      title: "New chat",
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setSidebarOpen(false);
    setError(null);
  }

  function deleteChat(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      if (!next.length) localStorage.removeItem(STORAGE_KEY);
      return next;
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setError(null);
    setInput("");

    let convId = activeId;
    let workingConv = active;

    if (!workingConv) {
      workingConv = { id: uid(), title: "New chat", messages: [], createdAt: Date.now() };
      convId = workingConv.id;
      setConversations((prev) => [workingConv as Conversation, ...prev]);
      setActiveId(convId);
    }

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantMsg: Message = { id: uid(), role: "assistant", content: "" };

    const isFirstMessage = workingConv.messages.length === 0;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: isFirstMessage ? titleFrom(text) : c.title,
              messages: [...c.messages, userMsg, assistantMsg],
            }
          : c
      )
    );

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history = [...workingConv.messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: snapshot } : m
                  ),
                }
              : c
          )
        );
      }

      if (!acc.trim()) {
        throw new Error("No response received. Check your GEMINI_API_KEY and try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (message !== "The user aborted a request.") {
        setError(message);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id && !m.content
                      ? { ...m, content: "_Failed to respond._" }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-dvh bg-ink text-paper font-body overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed md:static z-30 h-dvh w-72 shrink-0 border-r border-line bg-panel transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col p-3">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              Sudharsan<span className="text-accent">GPT</span>
            </span>
          </div>

          <button
            onClick={newChat}
            className="mb-3 flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm text-paper/90 transition hover:border-accent/40 hover:bg-white/[0.03]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New chat
          </button>

          <div className="flex-1 space-y-0.5 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="px-2 py-4 text-xs text-mist">No conversations yet.</p>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm cursor-pointer transition ${
                  c.id === activeId ? "bg-white/[0.06] text-paper" : "text-mist hover:bg-white/[0.03] hover:text-paper"
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  className="ml-2 shrink-0 rounded p-1 opacity-0 transition hover:bg-white/10 group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-line px-2 pt-3 text-[11px] leading-relaxed text-mist">
            Built by VELTRIX · powered by Gemini
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <button
            className="rounded-md p-1.5 text-mist hover:bg-white/5 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-display text-sm font-medium text-paper/80">
            {active?.title ?? "SudharsanGPT"}
          </span>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!active || active.messages.length === 0 ? (
            <EmptyState onPick={(t) => setInput(t)} />
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-8">
              {active.messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLast={i === active.messages.length - 1}
                  isStreaming={isStreaming}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-auto mb-2 w-full max-w-3xl px-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-line px-4 pb-5 pt-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-panel px-3 py-2 focus-within:border-accent/50">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message SudharsanGPT…"
              rows={1}
              className="max-h-[200px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-paper placeholder:text-mist focus:outline-none"
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-paper transition hover:bg-white/20"
                aria-label="Stop generating"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition disabled:opacity-30 enabled:hover:brightness-110"
                aria-label="Send message"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-mist">
            SudharsanGPT can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const prompts = [
    "Explain a complex topic simply",
    "Draft an email for me",
    "Help me debug some code",
    "Brainstorm ideas for a project",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center animate-rise">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Sudharsan<span className="text-accent">GPT</span>
      </h1>
      <p className="mt-2 max-w-sm text-sm text-mist">
        Ask anything — write, code, plan, research, or just think out loud.
      </p>
      <div className="mt-7 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="rounded-xl border border-line bg-panel px-4 py-3 text-left text-sm text-paper/80 transition hover:border-accent/40 hover:bg-white/[0.03]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const showCursor = isLast && isStreaming && !isUser;

  return (
    <div className={`mb-6 flex gap-3 animate-rise ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser ? "bg-accent text-ink" : "bg-panel text-paper border border-line"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : message.content ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            {showCursor && <span className="ml-0.5 inline-block h-4 w-1.5 animate-blink bg-accent align-middle" />}
          </div>
        ) : (
          <TypingDots />
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-mist animate-blink"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
