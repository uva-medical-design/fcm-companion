"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Lightbulb, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { OSCEFeedbackResult } from "@/types";

export type ChatPhase = "door_prep" | "soap_note" | "feedback";

export interface OsceChatSessionContext {
  chief_complaint?: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  vitals?: Record<string, string>;
  current_entries: string;
  feedback_result?: OSCEFeedbackResult | null;
}

interface OsceChatPanelProps {
  sessionId: string;
  phase: ChatPhase;
  sessionContext: OsceChatSessionContext;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PHASE_LABELS: Record<ChatPhase, string> = {
  door_prep: "Door Prep Guide",
  soap_note: "SOAP Note Guide",
  feedback: "Review Guide",
};

const PROMPT_CHIPS: Record<ChatPhase, string[]> = {
  door_prep: [
    "Help me think about my differential",
    "What questions should I be considering?",
    "Am I missing any PE maneuvers?",
  ],
  soap_note: [
    "Help me connect findings to diagnoses",
    "Is my differential ordering right?",
    "What should I think about for my plan?",
  ],
  feedback: [
    "Explain why I missed a diagnosis",
    "Help me understand this feedback",
    "What should I study next?",
  ],
};

function ChatContent({
  phase,
  messages,
  input,
  loading,
  onSend,
  onChipClick,
  onInputChange,
}: {
  phase: ChatPhase;
  messages: Message[];
  input: string;
  loading: boolean;
  onSend: () => void;
  onChipClick: (chip: string) => void;
  onInputChange: (v: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full">
      {/* Subtitle */}
      <p className="text-[11px] text-muted-foreground px-3 pb-2 border-b">
        I&apos;ll ask questions to help you think — I won&apos;t give you the
        answers.
      </p>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center py-2">
              Not sure where to start? Try one of these:
            </p>
            <div className="flex flex-col gap-2">
              {PROMPT_CHIPS[phase].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChipClick(chip)}
                  className="text-left text-xs px-3 py-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 text-sm rounded-full border px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="rounded-full h-8 w-8 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function OsceChatPanel({
  sessionId,
  phase,
  sessionContext,
}: OsceChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: Message = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/osce-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            phase,
            message: trimmed,
            conversation_history: messages,
            current_entries: sessionContext.current_entries,
          }),
        });

        if (res.ok) {
          const { response } = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: response },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, I couldn't connect right now. Please try again.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't connect right now. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, phase, messages, sessionContext.current_entries, loading]
  );

  const handleChipClick = useCallback(
    (chip: string) => {
      sendMessage(chip);
    },
    [sendMessage]
  );

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-80 shrink-0 self-start sticky top-4 h-[calc(100vh-6rem)] rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{PHASE_LABELS[phase]}</span>
        </div>
        <ChatContent
          phase={phase}
          messages={messages}
          input={input}
          loading={loading}
          onSend={() => sendMessage(input)}
          onChipClick={handleChipClick}
          onInputChange={setInput}
        />
      </aside>

      {/* ── Mobile FAB (< md) ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-sm font-medium"
        aria-label="Open AI guide"
      >
        <Lightbulb className="h-4 w-4" />
        <span>Need a nudge?</span>
      </button>

      {/* ── Mobile bottom Sheet (< md) ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="bottom"
          className="h-[60vh] flex flex-col p-0 rounded-t-xl"
        >
          <SheetHeader className="px-3 pt-3 pb-0">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-primary" />
              {PHASE_LABELS[phase]}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <ChatContent
              phase={phase}
              messages={messages}
              input={input}
              loading={loading}
              onSend={() => sendMessage(input)}
              onChipClick={handleChipClick}
              onInputChange={setInput}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
