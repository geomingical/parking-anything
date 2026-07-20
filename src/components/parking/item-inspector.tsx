"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import { useState } from "react";

import type { ParkingItem } from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";

const STATUS_LABELS: Record<ParkingItem["status"], string> = {
  parked: "Parked",
  test_driving: "Test Driving",
  garaged: "Garaged",
  scrapped: "Scrapped",
};

const EFFORT_LABELS: Record<ParkingItem["effortTier"], string> = {
  quick_spin: "Quick spin",
  focused_session: "Focused session",
  weekend_project: "Weekend project",
};

type ActionResult = { ok: true } | { ok: false; message: string };

type ItemInspectorProps = {
  item: ParkingItem | null;
  open: boolean;
  onOpenChange(open: boolean): void;
  onApplyAction(action: ParkingAction): ActionResult;
  onUpdateEvidence(notes: string, repoUrl: string): void;
};

function validOptionalHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function ItemInspector({
  item,
  ...props
}: ItemInspectorProps) {
  if (!item) return null;

  return (
    <ItemInspectorContent
      key={`${item.id}:${item.status}`}
      {...props}
      item={item}
    />
  );
}

type ItemInspectorContentProps = Omit<ItemInspectorProps, "item"> & {
  item: ParkingItem;
};

function ItemInspectorContent({
  item,
  open,
  onOpenChange,
  onApplyAction,
  onUpdateEvidence,
}: ItemInspectorContentProps) {
  const [notes, setNotes] = useState(item.notes ?? "");
  const [repoUrl, setRepoUrl] = useState(item.repoUrl ?? "");
  const [decisionReason, setDecisionReason] = useState("");
  const [showTowConfirmation, setShowTowConfirmation] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function runAction(action: ParkingAction) {
    setValidationMessage(null);
    const result = onApplyAction(action);
    if (!result.ok) {
      setValidationMessage(result.message);
      return;
    }
    if (action.type !== "start_test_drive") {
      onOpenChange(false);
    }
  }

  function persistEvidenceIfChanged() {
    if (!item || item.status !== "test_driving") return;
    const nextNotes = notes.trim();
    const nextRepoUrl = repoUrl.trim();
    if (!validOptionalHttpUrl(nextRepoUrl)) {
      setValidationMessage("Enter a valid HTTP(S) result URL.");
      return;
    }
    if (nextNotes !== (item.notes ?? "") || nextRepoUrl !== (item.repoUrl ?? "")) {
      onUpdateEvidence(nextNotes, nextRepoUrl);
    }
  }

  function parkInGarage() {
    const nextNotes = notes.trim();
    const nextRepoUrl = repoUrl.trim();
    if (!validOptionalHttpUrl(nextRepoUrl)) {
      setValidationMessage("Enter a valid HTTP(S) result URL.");
      return;
    }
    runAction({ type: "park_in_garage", notes: nextNotes, repoUrl: nextRepoUrl });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 h-dvh w-full overflow-y-auto border-l-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[-12px_0_0_rgba(0,0,0,0.12)] sm:max-w-xl sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--garage)]">
                Parking ticket · {STATUS_LABELS[item.status]}
              </p>
              <Dialog.Title className="mt-2 text-2xl font-black tracking-[-0.03em]">
                {item.title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
                Review the generated test ticket, record evidence, and make the next deliberate
                decision.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                title="Close inspector"
                aria-label="Close inspector"
                className="inline-flex size-10 shrink-0 items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </Dialog.Close>
          </div>

          <dl className="divide-y divide-black/15 border-b border-black/15">
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-ink)]">
                Source
              </dt>
              <dd className="min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 font-bold underline decoration-2 underline-offset-4"
                >
                  <span className="truncate">Open original tool</span>
                  <ExternalLink aria-hidden="true" className="shrink-0" size={16} />
                </a>
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-ink)]">
                Trial effort
              </dt>
              <dd className="font-bold">{EFFORT_LABELS[item.effortTier]}</dd>
            </div>
          </dl>

          <section className="py-5">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-ink)]">
              What it appears to do
            </h2>
            <p className="mt-2 leading-7">{item.summary}</p>
          </section>

          <section className="border-t border-black/15 py-5">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-ink)]">
              Usefulness hypothesis
            </h2>
            <p className="mt-2 leading-7">{item.usefulnessHypothesis}</p>
          </section>

          <section className="border-y-2 border-[var(--ink)] bg-[var(--safety)] px-4 py-5">
            <h2 className="text-xs font-black uppercase tracking-[0.14em]">First test task</h2>
            <p className="mt-2 text-lg font-bold leading-7">{item.suggestedTestTask}</p>
          </section>

          {item.status === "test_driving" ? (
            <section className="space-y-4 py-5">
              <div>
                <label htmlFor="test-notes" className="text-sm font-black">
                  Test notes
                </label>
                <textarea
                  id="test-notes"
                  value={notes}
                  maxLength={2000}
                  rows={5}
                  onChange={(event) => setNotes(event.target.value)}
                  onBlur={persistEvidenceIfChanged}
                  className="mt-2 w-full resize-y border-2 border-[var(--ink)] bg-white p-3 leading-6"
                  placeholder="What did you try? What happened?"
                />
              </div>
              <div>
                <label htmlFor="result-url" className="text-sm font-black">
                  Result or repository URL
                </label>
                <input
                  id="result-url"
                  type="url"
                  value={repoUrl}
                  maxLength={2048}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  onBlur={persistEvidenceIfChanged}
                  className="mt-2 h-11 w-full border-2 border-[var(--ink)] bg-white px-3"
                  placeholder="https://github.com/you/result"
                />
              </div>
            </section>
          ) : item.notes || item.repoUrl ? (
            <section className="space-y-3 border-b border-black/15 py-5">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-ink)]">
                Recorded evidence
              </h2>
              {item.notes ? <p className="whitespace-pre-wrap leading-7">{item.notes}</p> : null}
              {item.repoUrl ? (
                <a
                  href={item.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-bold underline decoration-2 underline-offset-4"
                >
                  Open result <ExternalLink aria-hidden="true" size={16} />
                </a>
              ) : null}
            </section>
          ) : null}

          {item.finalDecisionReason ? (
            <section className="border-b border-black/15 py-5">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--scrap)]">
                Final decision reason
              </h2>
              <p className="mt-2 leading-7">{item.finalDecisionReason}</p>
            </section>
          ) : null}

          {validationMessage ? (
            <p role="alert" className="mt-5 border-l-4 border-[var(--scrap)] bg-red-50 px-4 py-3 text-sm font-bold">
              {validationMessage}
            </p>
          ) : null}

          {showTowConfirmation ? (
            <section className="mt-5 border-t-4 border-[var(--scrap)] pt-5">
              <label htmlFor="decision-reason" className="text-sm font-black">
                Decision reason
              </label>
              <textarea
                id="decision-reason"
                value={decisionReason}
                maxLength={280}
                rows={3}
                onChange={(event) => setDecisionReason(event.target.value)}
                className="mt-2 w-full resize-y border-2 border-[var(--ink)] bg-white p-3 leading-6"
                placeholder="Why does this tool no longer deserve a parking slot?"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTowConfirmation(false);
                    setValidationMessage(null);
                  }}
                  className="h-11 border-2 border-[var(--ink)] bg-white px-4 font-bold hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runAction({
                      type: "tow_away",
                      finalDecisionReason: decisionReason,
                    })
                  }
                  className="h-11 bg-[var(--scrap)] px-4 font-black text-white hover:bg-black"
                >
                  Confirm Tow Away
                </button>
              </div>
            </section>
          ) : null}

          {!showTowConfirmation && (item.status === "parked" || item.status === "test_driving") ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t-2 border-[var(--ink)] pt-5">
              {item.status === "parked" ? (
                <button
                  type="button"
                  onClick={() => runAction({ type: "start_test_drive" })}
                  className="h-11 bg-[var(--garage)] px-4 font-black text-white hover:bg-black"
                >
                  Start Test Drive
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => runAction({ type: "return_to_lot" })}
                    className="h-11 border-2 border-[var(--ink)] bg-white px-4 font-bold hover:bg-black hover:text-white"
                  >
                    Return to Parking Lot
                  </button>
                  <button
                    type="button"
                    onClick={parkInGarage}
                    className="h-11 bg-[var(--garage)] px-4 font-black text-white hover:bg-black"
                  >
                    Park in Garage
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowTowConfirmation(true);
                  setValidationMessage(null);
                }}
                className="h-11 bg-[var(--scrap)] px-4 font-black text-white hover:bg-black"
              >
                Tow Away
              </button>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
