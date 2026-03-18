import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, MessageSquareText, SendHorizontal } from "lucide-react";
import { askFamilyQuestion, listFamilyPatients, listFamilyQuestions } from "@/lib/api/client";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

type FamilyQuestion = {
  id: string;
  question: string;
  context: string | null;
  status: string;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
  patientId: string;
  patientStage: number;
};

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function FamilyQuestionsPage() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");

  const patientsQuery = useQuery({
    queryKey: ["family", "patients"],
    queryFn: listFamilyPatients,
  });

  const questionsQuery = useQuery({
    queryKey: ["family", "questions"],
    queryFn: listFamilyQuestions,
  });

  const patientOptions = useMemo(() => {
    return asArray<Record<string, unknown>>(patientsQuery.data).map((row) => {
      const patient = (row.patient || {}) as Record<string, unknown>;
      return {
        id: String(patient.id || ""),
        stage: Number(patient.lifecycleStage || 0),
      };
    });
  }, [patientsQuery.data]);

  useEffect(() => {
    if (!patientId && patientOptions.length > 0) {
      setPatientId(patientOptions[0].id);
    }
  }, [patientId, patientOptions]);

  const questions = useMemo(() => {
    return asArray<Record<string, unknown>>(questionsQuery.data).map((row) => {
      const patient = (row.patient || {}) as Record<string, unknown>;

      return {
        id: String(row.id || ""),
        question: String(row.question || ""),
        context: row.context ? String(row.context) : null,
        status: String(row.status || "OPEN"),
        answer: row.answer ? String(row.answer) : null,
        createdAt: String(row.createdAt || ""),
        answeredAt: row.answeredAt ? String(row.answeredAt) : null,
        patientId: String(patient.id || ""),
        patientStage: Number(patient.lifecycleStage || 0),
      } as FamilyQuestion;
    });
  }, [questionsQuery.data]);

  const submit = useMutation({
    mutationFn: () => askFamilyQuestion(patientId, question.trim(), context.trim() || undefined),
    onSuccess: () => {
      setQuestion("");
      setContext("");
      qc.invalidateQueries({ queryKey: ["family", "questions"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit.mutate();
  }

  const openCount = questions.filter((item) => item.status === "OPEN").length;
  const answeredCount = questions.filter((item) => item.status === "ANSWERED").length;

  return (
    <PortalShell title="Family Questions">
      <Panel
        title="Care Team Question Desk"
        eyebrow="Family-to-Clinical Channel"
        description="Submit structured questions linked to a patient and track answer status without losing conversation context."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={onSubmit} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">New question</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                required
              >
                {patientOptions.length === 0 ? <option value="">No linked patients</option> : null}
                {patientOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    Patient {option.id.slice(0, 8)} • Stage {option.stage}
                  </option>
                ))}
              </select>

              <div className="flex items-center rounded-xl border border-white/10 bg-background/50 px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Family questions are visible to admin, doctor, and specialist teams.
              </div>
            </div>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What update or clarification do you need from the care team?"
              className="mt-3 min-h-[120px] w-full rounded-xl border border-white/10 bg-background/70 px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
              required
              maxLength={1000}
            />

            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional context (recent symptom changes, document reference, or timing concern)"
              className="mt-3 min-h-[90px] w-full rounded-xl border border-white/10 bg-background/70 px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
              maxLength={1200}
            />

            <button
              type="submit"
              disabled={!patientId || !question.trim() || submit.isPending}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
            >
              <SendHorizontal className="h-4 w-4" strokeWidth={1.8} />
              {submit.isPending ? "Submitting..." : "Submit to Care Team"}
            </button>
          </form>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              {
                label: "Total Questions",
                value: questions.length,
                note: "All submitted records",
                icon: MessageSquareText,
              },
              {
                label: "Open",
                value: openCount,
                note: "Awaiting care team response",
                icon: Clock3,
              },
              {
                label: "Answered",
                value: answeredCount,
                note: "Completed response thread",
                icon: CheckCircle2,
              },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 font-display text-4xl font-bold tracking-[-0.05em] text-foreground">{metric.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <metric.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Submitted Questions"
        eyebrow="Thread History"
        description="Review status and responses tied to each submitted question."
        className="mt-4"
      >
        <div className="space-y-3">
          {questions.length === 0 && !questionsQuery.isLoading ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              No questions submitted yet.
            </p>
          ) : null}

          {questions.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Patient {item.patientId.slice(0, 8)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Stage {item.patientStage}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                    item.status === "ANSWERED"
                      ? "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-200"
                      : "border-amber/25 bg-amber/[0.1] text-amber/90"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-foreground/90">{item.question}</p>
              {item.context ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Context: {item.context}</p> : null}

              <p className="mt-2 text-xs text-muted-foreground">Asked on {new Date(item.createdAt).toLocaleString()}</p>

              {item.answer ? (
                <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Care Team Answer</p>
                  <p className="mt-2 text-sm text-foreground/90">{item.answer}</p>
                  {item.answeredAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">Answered {new Date(item.answeredAt).toLocaleString()}</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>

      {patientsQuery.isError ? <p className="mt-4 text-secondary">Unable to load linked patients.</p> : null}
      {questionsQuery.isError ? <p className="mt-2 text-secondary">Unable to load questions.</p> : null}
      {submit.isError ? <p className="mt-2 text-secondary">Unable to submit question.</p> : null}
    </PortalShell>
  );
}
