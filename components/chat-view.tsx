"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Pin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

type ChatMsg = {
  id: string;
  userId: string;
  user: string;
  text: string;
  pinned: boolean;
  timestamp: string; // ISO
};

type Props = {
  currentUser: { id: string; name: string };
  initial: ChatMsg[];
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function ChatView({ currentUser, initial }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(initial);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string>(
    initial.length > 0
      ? (initial[initial.length - 1]?.timestamp ?? new Date(0).toISOString())
      : new Date(0).toISOString()
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages?since=${encodeURIComponent(lastRef.current)}`
      );
      if (!res.ok) return;
      const fresh: ChatMsg[] = await res.json();
      if (!fresh.length) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const added = fresh.filter((m) => !ids.has(m.id));
        if (!added.length) return prev;
        lastRef.current = added[added.length - 1]?.timestamp ?? lastRef.current;
        return [...prev, ...added];
      });
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: ChatMsg = await res.json();
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(msg.id)) return prev;
          lastRef.current = msg.timestamp;
          return [...prev, msg];
        });
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <PageHeader title="Tchat" subtitle="Le vestiaire des darons" />

      {/* Message list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-sm text-[var(--color-muted)]">
              Aucun message pour l&apos;instant.
              <br />
              Sois le premier à tacler ! ⚽
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.userId === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`relative max-w-[85%] overflow-hidden p-3 transition-all duration-200 ${
                  msg.pinned
                    ? "border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5"
                    : isOwn
                      ? "border-[var(--color-pitch)]/20 bg-[var(--color-pitch)]/8"
                      : i % 2 === 0
                        ? "bg-[var(--color-surface)]"
                        : "bg-[var(--color-surface-2)]"
                }`}
              >
                {msg.pinned && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <Pin className="size-3 text-[var(--color-gold)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gold)]">
                      Épinglé
                    </span>
                  </div>
                )}

                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[var(--color-pitch-bright)]">
                    {isOwn ? "Moi" : msg.user}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)]">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                <p className="text-sm leading-relaxed">{msg.text}</p>
              </Card>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-border-subtle)] px-3 py-2">
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-cream)]"
          title="Emoji"
        >
          <Smile className="size-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Écris ton message..."
          className="h-9 flex-1 bg-transparent text-sm text-[var(--color-cream)] placeholder:text-[var(--color-muted)] focus:outline-none"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pitch)] text-white transition-all duration-200 hover:bg-[var(--color-pitch-bright)] disabled:opacity-30 disabled:hover:bg-[var(--color-pitch)]"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
