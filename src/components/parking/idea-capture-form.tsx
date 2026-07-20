"use client";

import { useState } from "react";

import type { ActionResult } from "@/hooks/use-parking-store";
import {
  IdeaParkingItemSchema,
  type ParkingItem,
} from "@/lib/parking/schemas";

type IdeaCaptureFormProps = {
  onPark(item: ParkingItem): ActionResult;
  onParked?(): void;
};

type FieldErrors = {
  title?: string;
  ideaText?: string;
  form?: string;
};

export function IdeaCaptureForm({ onPark, onParked }: IdeaCaptureFormProps) {
  const [title, setTitle] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <form
      className="mt-5 grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors: FieldErrors = {};
        if (!title.trim()) nextErrors.title = "Name the idea before parking it.";
        else if (title.length > 120) nextErrors.title = "Use 120 characters or fewer.";
        if (!ideaText.trim()) nextErrors.ideaText = "Describe the idea before parking it.";
        else if (ideaText.length > 2000) {
          nextErrors.ideaText = "Use 2,000 characters or fewer.";
        }
        if (nextErrors.title || nextErrors.ideaText) {
          setErrors(nextErrors);
          return;
        }

        const now = new Date().toISOString();
        const parsed = IdeaParkingItemSchema.safeParse({
          id: crypto.randomUUID(),
          kind: "idea",
          status: "parked",
          title,
          ideaText,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        });
        if (!parsed.success) {
          setErrors({ form: "This Idea could not be verified. Check the fields and try again." });
          return;
        }

        const result = onPark(parsed.data);
        if (!result.ok) {
          setErrors({ form: result.message });
          return;
        }

        setTitle("");
        setIdeaText("");
        setErrors({});
        onParked?.();
      }}
    >
      <div>
        <label htmlFor="idea-title" className="text-sm font-black">
          Idea title
        </label>
        <input
          id="idea-title"
          value={title}
          maxLength={120}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "idea-title-error" : undefined}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 h-12 w-full border-2 border-[var(--ink)] bg-white px-4"
        />
        {errors.title ? <p id="idea-title-error" className="mt-1 text-sm font-bold text-[var(--scrap)]">{errors.title}</p> : null}
      </div>
      <div>
        <label htmlFor="idea-text" className="text-sm font-black">
          Idea
        </label>
        <textarea
          id="idea-text"
          value={ideaText}
          maxLength={2000}
          rows={4}
          aria-invalid={Boolean(errors.ideaText)}
          aria-describedby={errors.ideaText ? "idea-text-error" : undefined}
          onChange={(event) => setIdeaText(event.target.value)}
          className="mt-1 w-full resize-y border-2 border-[var(--ink)] bg-white px-4 py-3"
        />
        {errors.ideaText ? <p id="idea-text-error" className="mt-1 text-sm font-bold text-[var(--scrap)]">{errors.ideaText}</p> : null}
      </div>
      {errors.form ? <p role="alert" className="text-sm font-bold text-[var(--scrap)]">{errors.form}</p> : null}
      <button type="submit" className="h-12 justify-self-start bg-[var(--safety)] px-6 text-sm font-black uppercase tracking-[0.08em]">
        Park Idea
      </button>
    </form>
  );
}
