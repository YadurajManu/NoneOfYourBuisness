import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, RefreshCw, Send, Sparkles, Square, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { streamAiChat } from "@/lib/api/client";
import { useAuth } from "@/portal/auth-context";
import type { UserRole } from "@/lib/api/types";

export type AssistantVariant = "clinical" | "patient" | "family";

type ChatRole = "user" | "assistant";

interface UiMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface AssistantPanelProps {
  patientId?: string | null;
  patientName?: string | null;
  variant?: AssistantVariant;
  className?: string;
}

const VARIANT_COPY: Record<
  AssistantVariant,
  { eyebrow: string; heading: string; blurb: string; placeholder: string }
> = {
  clinical: {
    eyebrow: "AI Assistant",
    heading: "Clinical Copilot",
    blurb:
      "Grounded on this patient's live record — alerts, medications, orders, events, and uploaded reports.",
    placeholder: "Ask about trends, medications, overdue orders…",
  },
  patient: {
    eyebrow: "AI Assistant",
    heading: "Your Care Companion",
    blurb:
      "Ask anything about your care journey in plain language. I read from your own records.",
    placeholder: "e.g. What are my current medications?",
  },
  family: {
    eyebrow: "AI Assistant",
    heading: "Family Companion",
    blurb:
      "A gentle, plain-language guide to your loved one's care — based on what the care team has shared with you.",
    placeholder: "e.g. How is my father doing right now?",
  },
};

function suggestionsFor(
  variant: AssistantVariant,
  role: UserRole,
  hasPatient: boolean,
): string[] {
  if (!hasPatient && variant === "clinical") {
    return [
      "What can you help me with?",
      "How does the 10-stage lifecycle work?",
      "Summarize what to do when I open a patient.",
    ];
  }
  if (variant === "family") {
    return [
      "How is my loved one doing right now?",
      "What are the doctors focusing on?",
      "Explain the latest update in simple terms.",
    ];
  }
  if (variant === "patient") {
    return [
      "What are my current medications?",
      "What stage of care am I in and what's next?",
      "Explain my latest report simply.",
    ];
  }
  // clinical, with patient
  if (role === "CARE_COORDINATOR" || role === "ADMIN") {
    return [
      "What's outstanding for this patient?",
      "Any orders or tasks overdue?",
      "What's blocking progression to the next stage?",
    ];
  }
  return [
    "Summarize this patient's current status.",
    "Any critical alerts or abnormal findings?",
    "Review active medications for interactions.",
  ];
}

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AssistantPanel({
  patientId = null,
  patientName = null,
  variant = "clinical",
  className,
}: AssistantPanelProps) {
  const { user } = useAuth();
  const role = (user?.role ?? "DOCTOR") as UserRole;
  const copy = VARIANT_COPY[variant];

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  const suggestions = useMemo(
    () => suggestionsFor(variant, role, Boolean(patientId)),
    [variant, role, patientId],
  );

  // Reset the thread when the grounded patient changes.
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
    setStreaming(false);
    streamingIdRef.current = null;
  }, [patientId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;

      setError(null);
      const userMessage: UiMessage = {
        id: createId(),
        role: "user",
        content: text,
      };
      const assistantId = createId();
      streamingIdRef.current = assistantId;
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const appendToken = (token: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + token } : m,
          ),
        );
      };

      void streamAiChat(
        { message: text, patientId, conversationId },
        {
          signal: controller.signal,
          onToken: appendToken,
          onDone: (meta) => {
            if (meta.conversationId) setConversationId(meta.conversationId);
            setStreaming(false);
            streamingIdRef.current = null;
          },
          onError: (message) => {
            setError(message);
            setStreaming(false);
            // Drop the empty assistant bubble if nothing streamed.
            setMessages((prev) =>
              prev.filter(
                (m) => !(m.id === assistantId && m.content.length === 0),
              ),
            );
            streamingIdRef.current = null;
          },
        },
      );
    },
    [streaming, patientId, conversationId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    streamingIdRef.current = null;
  }, []);

  const resetThread = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
    setStreaming(false);
    streamingIdRef.current = null;
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <section
      className={cn(
        "relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,31,44,0.98),rgba(14,23,35,0.98))] shadow-[var(--shadow-clinical)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--brand-accent-rgb),0.14),transparent_34%)]" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-primary/70">
              <Sparkles className="h-3 w-3" /> {copy.eyebrow}
            </p>
            <h2 className="font-display text-lg font-semibold tracking-[-0.03em] text-foreground">
              {copy.heading}
            </h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              {copy.blurb}
            </p>
          </div>
        </div>
        {!isEmpty ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetThread}
            className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> New
          </Button>
        ) : null}
      </div>

      {patientName ? (
        <div className="relative flex items-center gap-2 border-b border-white/6 bg-white/[0.02] px-5 py-2 text-[11px] text-muted-foreground sm:px-6">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Grounded on{" "}
          <span className="font-medium text-foreground/90">{patientName}</span>'s
          live record
        </div>
      ) : null}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col justify-end gap-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
              {variant === "family"
                ? "Hi — I'm here to help you understand how your loved one is doing, in plain and caring language. Ask me anything below."
                : variant === "patient"
                  ? "Hi — I'm your care companion. I can explain your records, medications, and what's coming next. What would you like to know?"
                  : "Ask me anything about this patient. I read the live record — alerts, meds, orders, events, and AI-extracted reports."}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user";
            const isActive =
              streaming && streamingIdRef.current === m.id && !isUser;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3",
                  isUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                    isUser
                      ? "border-white/10 bg-white/[0.05] text-foreground/70"
                      : "border-primary/30 bg-primary/10 text-primary",
                  )}
                >
                  {isUser ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6",
                    isUser
                      ? "bg-primary/15 text-foreground"
                      : "border border-white/8 bg-white/[0.03] text-foreground/90",
                  )}
                >
                  {m.content}
                  {isActive ? (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
                  ) : null}
                  {isActive && m.content.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error */}
      {error ? (
        <div className="relative mx-5 mb-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive sm:mx-6">
          {error}
        </div>
      ) : null}

      {/* Composer */}
      <div className="relative border-t border-white/6 px-5 py-4 sm:px-6">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-primary/40">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={copy.placeholder}
            rows={1}
            className="max-h-32 min-h-[40px] resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
          />
          {streaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={stop}
              className="h-10 w-10 shrink-0"
              aria-label="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="h-10 w-10 shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground/70">
          AI can make mistakes and does not replace professional medical advice.
          For anything urgent, contact your care team or emergency services.
        </p>
      </div>
    </section>
  );
}
