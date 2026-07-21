import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_BEAT_ANCHORS,
  assertBeatBoundariesMatchTranscript,
  assertCaptionScriptMatches,
  buildBeatBoundaries,
  deriveCanonicalBeatBoundaries,
  findUniquePhraseStart,
  parseCaptionScript,
  validateAudioProvenance,
  validateBeatBoundaries,
  validateMeta,
  validateTranscript,
} from "./transcript-contract.mjs";

const word = (text, start, end) => ({ text, start, end });
const transcript = [word("One", 0, 1), word("Two", 1, 2), word("Three", 2, 3)];

function timedTranscript(phrases) {
  let time = 0;
  return phrases.flatMap((phrase) =>
    phrase.split(/\s+/).map((text) => {
      const entry = word(text, time, time + 1);
      time += 1;
      return entry;
    }),
  );
}

test("validateTranscript rejects empty, null, non-finite, and overlapping words", () => {
  assert.throws(() => validateTranscript([]), /non-empty array/);
  assert.throws(() => validateTranscript([word("one", null, 1)]), /word 0 start/);
  assert.throws(() => validateTranscript([word("one", "", 1)]), /word 0 start/);
  assert.throws(() => validateTranscript([word("one", 0, Number.NaN)]), /word 0 end/);
  assert.throws(() => validateTranscript([word("one", 0, 1), word("two", 0.5, 2)]), /overlaps/);
});

test("findUniquePhraseStart rejects duplicate anchors", () => {
  const duplicate = [
    word("Paste", 0, 1),
    word("a", 1, 2),
    word("link", 2, 3),
    word("Paste", 3, 4),
    word("a", 4, 5),
    word("link", 5, 6),
  ];
  assert.throws(() => findUniquePhraseStart(duplicate, "Paste a link"), /exactly once.*2/);
});

test("buildBeatBoundaries rejects anchors that are not strictly increasing", () => {
  const reversed = [word("Second", 0, 1), word("First", 1, 2)];
  assert.throws(() => buildBeatBoundaries(reversed, ["First", "Second"]), /strictly increasing/);
});

test("validateBeatBoundaries rejects discontinuous and invalid beats", () => {
  assert.throws(
    () => validateBeatBoundaries([{ start: 0, end: 1 }, { start: 1.1, end: 2 }], 2),
    /contiguous/,
  );
  assert.throws(() => validateBeatBoundaries([{ start: 0, end: 0 }], 0), /end/);
});

test("validateMeta rejects inconsistent duration and provenance", () => {
  const validMeta = {
    lastWordEndSeconds: 3,
    audioDurationSeconds: 3.1,
    beatBoundaries: [{ start: 0, end: 3 }],
  };
  assert.throws(
    () => validateMeta({ ...validMeta, lastWordEndSeconds: 2.9 }, transcript),
    /lastWordEndSeconds/,
  );
  assert.throws(
    () => validateMeta({ ...validMeta, audioDurationSeconds: 2.9 }, transcript),
    /audioDurationSeconds/,
  );
  const validAudioProvenance = {
    provider: "macOS say",
    voice: "Samantha",
    sourceRateWpm: 140,
    sourceDurationSeconds: 150.98825,
    tempoFactor: 1.011646566,
    transform: "ffmpeg atempo (pitch-preserving whole track)",
    effectiveRateWpm: 141.63,
    finalDurationSeconds: 3.1,
  };
  assert.throws(
    () => validateAudioProvenance({ ...validAudioProvenance, finalDurationSeconds: null }, 3.1),
    /audioProvenance\.finalDurationSeconds/,
  );
});

test("transcript-derived canonical beats reject a contiguous shifted boundary", () => {
  const canonicalTranscript = timedTranscript(CANONICAL_BEAT_ANCHORS);
  const expected = deriveCanonicalBeatBoundaries(canonicalTranscript);
  const staleButContiguous = expected.map((beat) => ({ ...beat }));
  staleButContiguous[4].end += 0.25;
  staleButContiguous[5].start += 0.25;

  validateBeatBoundaries(staleButContiguous, canonicalTranscript.at(-1).end);
  assert.throws(
    () => assertBeatBoundariesMatchTranscript(canonicalTranscript, staleButContiguous),
    /stale or misaligned/,
  );
});

test("caption wrapper parser rejects malformed and stale JavaScript", () => {
  const captions = [{ text: "effort tier", start: 0, end: 1 }];
  assert.deepEqual(parseCaptionScript(`window.__captionCues = ${JSON.stringify(captions)};`), captions);
  assert.throws(() => parseCaptionScript("window.__captionCues = []; alert('stale');"), /wrapper/);
  assert.throws(
    () => assertCaptionScriptMatches(captions, "window.__captionCues = [];"),
    /does not match/,
  );
});
