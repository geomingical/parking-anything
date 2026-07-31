import type { EffortTier, ParkingItem } from "./schemas";

/**
 * URL-based parkable kinds. `idea` is deliberately absent: it has no URL, so
 * content analysis can never reclassify it.
 */
export const LINK_KIND_IDS = ["ai_tool", "read"] as const;
export type LinkKindId = (typeof LINK_KIND_IDS)[number];

export type KindDisplay = {
  label: string;
  noun: string;
  accentVar: string;
  effortLabels: Record<EffortTier, string>;
};

export type LinkKind = KindDisplay & {
  captureLabel: string;
  framing: string;
  classifierHint: string;
  urlFieldLabel: string;
  urlPlaceholder: string;
  fieldLabels: {
    summary: string;
    suggestedTestTask: string;
    usefulnessHypothesis: string;
  };
};

// Finding 6: shared by ai_tool and the idea fallback below — they used to
// duplicate this record verbatim with nothing binding them together.
const DEFAULT_EFFORT_LABELS: Record<EffortTier, string> = {
  quick_spin: "Quick spin",
  focused_session: "Focused session",
  weekend_project: "Weekend project",
};

export const LINK_KINDS: Record<LinkKindId, LinkKind> = {
  ai_tool: {
    label: "Tool",
    noun: "tool",
    captureLabel: "Park tool",
    accentVar: "--kind-tool",
    urlFieldLabel: "AI tool URL",
    urlPlaceholder: "https://example.com/ai-tool",
    framing:
      "Turn one saved AI-tool URL into a concrete evaluation ticket. Describe what the tool appears to do, estimate realistic trial effort, and propose one specific test that can begin in 15 minutes.",
    classifierHint:
      "software you would operate: an app, service, API, model, or library",
    effortLabels: DEFAULT_EFFORT_LABELS,
    fieldLabels: {
      summary: "What it appears to do",
      suggestedTestTask: "First test task",
      usefulnessHypothesis: "Usefulness hypothesis",
    },
  },
  read: {
    label: "Read",
    noun: "read",
    captureLabel: "Park read",
    accentVar: "--kind-read",
    urlFieldLabel: "Read URL",
    urlPlaceholder: "https://example.com/article",
    framing:
      "Turn one saved article URL into a concrete reading ticket. Describe what the piece appears to argue, estimate realistic reading effort, and propose one specific question the read should answer.",
    classifierHint:
      "prose you would read for understanding rather than operate: an article, blog post, paper, essay, or narrative documentation page",
    effortLabels: {
      quick_spin: "Skim",
      focused_session: "Careful read",
      weekend_project: "Long read",
    },
    fieldLabels: {
      summary: "What it appears to argue",
      suggestedTestTask: "Question this should answer",
      usefulnessHypothesis: "Why it may be worth the time",
    },
  },
};

const IDEA_DISPLAY: KindDisplay = {
  label: "Idea",
  noun: "idea",
  accentVar: "--kind-idea",
  effortLabels: DEFAULT_EFFORT_LABELS,
};

export function isLinkKind(value: string): value is LinkKindId {
  return (LINK_KIND_IDS as readonly string[]).includes(value);
}

export function displayFor(kind: ParkingItem["kind"]): KindDisplay {
  return isLinkKind(kind) ? LINK_KINDS[kind] : IDEA_DISPLAY;
}
