"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/hooks/use-parking-store";
import { messageForFailedResponse, readJsonBody } from "@/lib/parking/analyze-url-client";
import {
  LINK_KINDS,
  displayFor,
  isLinkItem,
  reparkSuggestionFor,
  type LinkKindId,
} from "@/lib/parking/link-kinds";
import {
  AnalyzeUrlResponseSchema,
  type AnalyzeClassification,
  type AnalyzeUrlResult,
  type EffortTier,
  type ParkingItem,
} from "@/lib/parking/schemas";
import type { ParkingAction } from "@/lib/parking/transitions";

const STATUS_LABELS: Record<ParkingItem["status"], string> = {
  parked: "Parked",
  test_driving: "Test Driving",
  garaged: "Garaged",
  scrapped: "Scrapped",
};

type IdeaUpdate = {
  title: string;
  ideaText: string;
  effortTier?: EffortTier;
  suggestedTestTask?: string;
};

type ItemInspectorProps = {
  item: ParkingItem | null;
  open: boolean;
  onOpenChange(open: boolean): void;
  onApplyAction(action: ParkingAction): ActionResult;
  onUpdateEvidence(notes: string, resultUrl: string): ActionResult;
  onUpdateIdea(input: IdeaUpdate): ActionResult;
  onRepark(
    kind: LinkKindId,
    analysis: AnalyzeUrlResult,
    classification: AnalyzeClassification,
  ): ActionResult;
  autoFocusPlanning?: boolean;
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

export function ItemInspector({ item, ...props }: ItemInspectorProps) {
  if (!item) return null;
  return <ItemInspectorContent key={`${item.id}:${item.status}`} {...props} item={item} />;
}

type ContentProps = Omit<ItemInspectorProps, "item"> & { item: ParkingItem };

function ItemInspectorContent({ item, open, onOpenChange, onApplyAction, onUpdateEvidence, onUpdateIdea, onRepark, autoFocusPlanning = false }: ContentProps) {
  const [title, setTitle] = useState(item.title);
  const [ideaText, setIdeaText] = useState(item.kind === "idea" ? item.ideaText : "");
  const [effortTier, setEffortTier] = useState<EffortTier | "">(item.effortTier ?? "");
  const [suggestedTestTask, setSuggestedTestTask] = useState(item.suggestedTestTask ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [resultUrl, setResultUrl] = useState(item.resultUrl ?? "");
  const [decisionReason, setDecisionReason] = useState("");
  const [showTowConfirmation, setShowTowConfirmation] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [reparking, setReparking] = useState(false);
  const [reparkWarning, setReparkWarning] = useState<string | null>(null);
  const effortRef = useRef<HTMLSelectElement>(null);
  const taskRef = useRef<HTMLTextAreaElement>(null);
  const reparkController = useRef<AbortController | null>(null);
  const reparkLock = useRef(false);

  const terminal = item.status === "garaged" || item.status === "scrapped";
  // Read straight off the item, so the offer and the card's marker can never
  // disagree, and a terminal item is suppressed by the same rule as every
  // other action below.
  const suggestion = terminal ? null : reparkSuggestionFor(item);

  useEffect(
    () => () => {
      // Abort AND null the controller: aborting alone cannot stop a response
      // that already won the race past the network call, so a resumed async
      // function must see its controller no longer matches and bail before
      // writing to the store or to dead state.
      reparkController.current?.abort();
      reparkController.current = null;
    },
    [],
  );

  /*
   * Owns the re-park request end to end. The inspector is a modal, so at most
   * one of these can exist at a time across the whole app — the only
   * concurrency left is one user double-clicking, handled by the synchronous
   * lock below.
   */
  async function repark(kind: LinkKindId, url: string) {
    if (reparkLock.current) return;

    const controller = new AbortController();
    reparkController.current = controller;
    reparkLock.current = true;
    setReparking(true);
    setValidationMessage(null);
    setReparkWarning(null);

    try {
      const response = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind }),
        signal: controller.signal,
      });
      const body = await readJsonBody(response);
      if (!response.ok) {
        throw new Error(
          messageForFailedResponse(response, body, "The re-park could not be completed."),
        );
      }
      const parsed = AnalyzeUrlResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("The re-park response could not be verified.");

      if (reparkController.current !== controller) return;

      const saved = onRepark(kind, parsed.data.analysis, parsed.data.classification);
      if (!saved.ok) {
        setValidationMessage(saved.message);
        return;
      }
      // Held here rather than in the section below, which the store's own
      // update removes as soon as the model agrees with the new kind.
      setReparkWarning(parsed.data.warning ?? null);
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (reparkController.current !== controller) return;
      setValidationMessage(
        caught instanceof Error ? caught.message : "The re-park could not be completed.",
      );
    } finally {
      if (reparkController.current === controller) {
        reparkController.current = null;
        reparkLock.current = false;
        setReparking(false);
      }
    }
  }
  const ideaReady = item.kind !== "idea" || Boolean(item.effortTier && item.suggestedTestTask?.trim());
  const evidenceEditable =
    item.status === "test_driving" ||
    (item.kind === "idea" && item.status === "parked");

  function focusMissingPlanning() {
    setValidationMessage("Add an effort tier and first test task before starting a Test Drive.");
    if (!effortTier) effortRef.current?.focus();
    else taskRef.current?.focus();
  }

  function runAction(action: ParkingAction) {
    setValidationMessage(null);
    if (action.type === "start_test_drive" && !ideaReady) {
      focusMissingPlanning();
      return;
    }
    const result = onApplyAction(action);
    if (!result.ok) {
      setValidationMessage(result.message);
      return;
    }
    if (action.type !== "start_test_drive") onOpenChange(false);
  }

  function persistEvidenceIfChanged() {
    if (!evidenceEditable) return;
    const nextNotes = notes.trim();
    const nextResultUrl = resultUrl.trim();
    if (!validOptionalHttpUrl(nextResultUrl)) {
      setValidationMessage("Enter a valid HTTP(S) result URL.");
      return;
    }
    if (nextNotes !== (item.notes ?? "") || nextResultUrl !== (item.resultUrl ?? "")) {
      const result = onUpdateEvidence(nextNotes, nextResultUrl);
      if (!result.ok) setValidationMessage(result.message);
    }
  }

  function parkInGarage() {
    const nextNotes = notes.trim();
    const nextResultUrl = resultUrl.trim();
    if (!validOptionalHttpUrl(nextResultUrl)) {
      setValidationMessage("Enter a valid HTTP(S) result URL.");
      return;
    }
    runAction({ type: "park_in_garage", notes: nextNotes, resultUrl: nextResultUrl });
  }

  function saveIdea() {
    if (item.kind !== "idea") return;
    const result = onUpdateIdea({
      title,
      ideaText,
      effortTier: effortTier || undefined,
      suggestedTestTask: suggestedTestTask.trim() || undefined,
    });
    setValidationMessage(result.ok ? null : result.message);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content className="drawer-panel fixed inset-y-0 right-0 z-50 h-dvh w-full overflow-y-auto border-l-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[-12px_0_0_rgba(0,0,0,0.12)] sm:max-w-xl sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--garage)]">
                {displayFor(item.kind).label} ticket · {STATUS_LABELS[item.status]}
              </p>
              <Dialog.Title className="mt-2 text-2xl font-black tracking-[-0.03em]">{item.title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
                Review the test ticket, record evidence, and make the next deliberate decision.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild><button type="button" title="Close inspector" aria-label="Close inspector" className="pressable inline-flex size-10 shrink-0 items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white"><X aria-hidden="true" size={18} /></button></Dialog.Close>
          </div>

          {isLinkItem(item) ? (
            <>
              <dl className="divide-y divide-black/15 border-b border-black/15">
                <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-xs font-black uppercase text-[var(--muted-ink)]">Source</dt><dd className="min-w-0"><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 font-bold underline"><span className="truncate">Open original {LINK_KINDS[item.kind].noun}</span><ExternalLink aria-hidden="true" size={16} /></a></dd></div>
                <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="text-xs font-black uppercase text-[var(--muted-ink)]">Trial effort</dt><dd className="font-bold">{LINK_KINDS[item.kind].effortLabels[item.effortTier]}</dd></div>
              </dl>
              <section className="py-5"><h2 className="text-xs font-black uppercase text-[var(--muted-ink)]">{LINK_KINDS[item.kind].fieldLabels.summary}</h2><p className="mt-2 leading-7">{item.summary}</p></section>
              <section className="border-t border-black/15 py-5"><h2 className="text-xs font-black uppercase text-[var(--muted-ink)]">{LINK_KINDS[item.kind].fieldLabels.usefulnessHypothesis}</h2><p className="mt-2 leading-7">{item.usefulnessHypothesis}</p></section>
              <section className="border-y-2 border-[var(--ink)] bg-[var(--safety)] px-4 py-5"><h2 className="text-xs font-black uppercase">{LINK_KINDS[item.kind].fieldLabels.suggestedTestTask}</h2><p className="mt-2 text-lg font-bold leading-7">{item.suggestedTestTask}</p></section>
            </>
          ) : terminal ? (
            <section className="space-y-4 py-5"><div><h2 className="text-xs font-black uppercase text-[var(--muted-ink)]">Idea</h2><p className="mt-2 whitespace-pre-wrap leading-7">{item.ideaText}</p></div>{item.effortTier && item.suggestedTestTask ? <div><p className="font-bold">{displayFor(item.kind).effortLabels[item.effortTier]}</p><p className="mt-1">{item.suggestedTestTask}</p></div> : <p className="font-bold">Planning needed</p>}</section>
          ) : (
            <section className="space-y-4 py-5" aria-label="Idea planning">
              <div><label htmlFor="idea-inspector-title" className="text-sm font-black">Idea title</label><input id="idea-inspector-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-11 w-full border-2 border-[var(--ink)] bg-white px-3" /></div>
              <div><label htmlFor="idea-inspector-text" className="text-sm font-black">Idea</label><textarea id="idea-inspector-text" value={ideaText} maxLength={2000} rows={4} onChange={(event) => setIdeaText(event.target.value)} className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-3" /></div>
              {!item.effortTier || !item.suggestedTestTask ? <p className="font-bold text-[var(--garage)]">Planning needed</p> : null}
              <div><label htmlFor="idea-effort" className="text-sm font-black">Effort tier</label><select ref={effortRef} autoFocus={autoFocusPlanning && !effortTier} id="idea-effort" value={effortTier} onChange={(event) => setEffortTier(event.target.value as EffortTier | "")} className="mt-1 h-11 w-full border-2 border-[var(--ink)] bg-white px-3"><option value="">Select effort</option>{Object.entries(displayFor(item.kind).effortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label htmlFor="idea-test-task" className="text-sm font-black">First test task</label><textarea ref={taskRef} autoFocus={autoFocusPlanning && Boolean(effortTier) && !suggestedTestTask.trim()} id="idea-test-task" value={suggestedTestTask} maxLength={500} rows={3} onChange={(event) => setSuggestedTestTask(event.target.value)} className="mt-1 w-full border-2 border-[var(--ink)] bg-white p-3" /></div>
              <button type="button" onClick={saveIdea} className="pressable h-11 bg-[var(--safety)] px-4 font-black">Save planning</button>
            </section>
          )}

          {evidenceEditable ? (
            <section className="space-y-4 py-5">
              <div><label htmlFor="test-notes" className="text-sm font-black">Test notes</label><textarea id="test-notes" value={notes} maxLength={2000} rows={5} onChange={(event) => setNotes(event.target.value)} onBlur={persistEvidenceIfChanged} className="mt-2 w-full resize-y border-2 border-[var(--ink)] bg-white p-3" /></div>
              <div><label htmlFor="result-url" className="text-sm font-black">Result URL</label><input id="result-url" type="url" value={resultUrl} maxLength={2048} onChange={(event) => setResultUrl(event.target.value)} onBlur={persistEvidenceIfChanged} className="mt-2 h-11 w-full border-2 border-[var(--ink)] bg-white px-3" /></div>
            </section>
          ) : item.notes || item.resultUrl ? (
            <section className="space-y-3 border-b border-black/15 py-5"><h2 className="text-xs font-black uppercase text-[var(--muted-ink)]">Recorded evidence</h2>{item.notes ? <p className="whitespace-pre-wrap leading-7">{item.notes}</p> : null}{item.resultUrl ? <a href={item.resultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold underline">Open result <ExternalLink aria-hidden="true" size={16} /></a> : null}</section>
          ) : null}

          {suggestion ? (
            <section className="border-t border-black/15 py-5" aria-label="Kind check">
              <h2 className="text-xs font-black uppercase text-[var(--muted-ink)]">Kind check</h2>
              <p className="mt-2 font-bold">This looks more like a {LINK_KINDS[suggestion.kind].noun}.</p>
              {suggestion.rationale ? <p className="mt-1 leading-7 text-[var(--muted-ink)]">{suggestion.rationale}</p> : null}
              <button type="button" disabled={reparking} onClick={() => void repark(suggestion.kind, suggestion.url)} className="pressable mt-3 h-11 bg-[var(--garage)] px-4 font-black text-white disabled:cursor-wait disabled:opacity-70">
                {reparking ? "Re-parking…" : `Re-park as ${LINK_KINDS[suggestion.kind].label}`}
              </button>
            </section>
          ) : null}

          {item.finalDecisionReason ? <section className="border-b border-black/15 py-5"><h2 className="text-xs font-black uppercase text-[var(--scrap)]">Final decision reason</h2><p className="mt-2 leading-7">{item.finalDecisionReason}</p></section> : null}
          {reparkWarning ? <p role="status" className="mt-5 border-l-4 border-[var(--safety)] bg-white px-4 py-3 text-sm font-bold">{reparkWarning}</p> : null}
          {validationMessage ? <p role="alert" className="mt-5 border-l-4 border-[var(--scrap)] bg-red-50 px-4 py-3 text-sm font-bold">{validationMessage}</p> : null}

          {showTowConfirmation ? (
            <section className="mt-5 border-t-4 border-[var(--scrap)] pt-5"><label htmlFor="decision-reason" className="text-sm font-black">Decision reason</label><textarea id="decision-reason" value={decisionReason} maxLength={280} rows={3} onChange={(event) => setDecisionReason(event.target.value)} className="mt-2 w-full border-2 border-[var(--ink)] bg-white p-3" placeholder={`Why does this ${displayFor(item.kind).noun} no longer deserve a parking slot?`} /><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setShowTowConfirmation(false); setValidationMessage(null); }} className="pressable h-11 border-2 border-[var(--ink)] bg-white px-4 font-bold">Cancel</button><button type="button" onClick={() => runAction({ type: "tow_away", finalDecisionReason: decisionReason })} className="pressable h-11 bg-[var(--scrap)] px-4 font-black text-white">Confirm Tow Away</button></div></section>
          ) : !terminal ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t-2 border-[var(--ink)] pt-5">
              {item.status === "parked" ? <button type="button" onClick={() => runAction({ type: "start_test_drive" })} className="pressable h-11 bg-[var(--garage)] px-4 font-black text-white">Start Test Drive</button> : <><button type="button" onClick={() => runAction({ type: "return_to_lot" })} className="pressable h-11 border-2 border-[var(--ink)] bg-white px-4 font-bold">Return to Parking Lot</button><button type="button" onClick={parkInGarage} className="pressable h-11 bg-[var(--garage)] px-4 font-black text-white">Park in Garage</button></>}
              <button type="button" onClick={() => { setShowTowConfirmation(true); setValidationMessage(null); }} className="pressable h-11 bg-[var(--scrap)] px-4 font-black text-white">Tow Away</button>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
