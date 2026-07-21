import assert from "node:assert/strict";

export const CANONICAL_BEAT_ANCHORS = [
  "Saving a new tool",
  "Paste a public tool link",
  "Ideas enter the same lot",
  "Every Parkable begins",
  "Then make a deliberate call",
  "When the lot starts",
  "Codex built and tested",
  "Today the lot holds",
  "Parking Anything isn't another",
];

function assertFiniteNumber(value, label) {
  assert.equal(typeof value, "number", `${label} must be a finite number; got ${JSON.stringify(value)}`);
  assert.ok(Number.isFinite(value), `${label} must be a finite number; got ${value}`);
}

function normalizedTokens(phrase) {
  const tokens = phrase
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]+/g, ""))
    .filter(Boolean);
  assert.ok(tokens.length > 0, `anchor phrase must contain normalized tokens; got ${JSON.stringify(phrase)}`);
  return tokens;
}

export function validateTranscript(transcript) {
  assert.ok(Array.isArray(transcript) && transcript.length > 0, "transcript must be a non-empty array");
  transcript.forEach((word, index) => {
    assert.ok(word && typeof word === "object" && !Array.isArray(word), `word ${index} must be an object`);
    assert.equal(typeof word.text, "string", `word ${index} text must be a string; got ${JSON.stringify(word.text)}`);
    assert.ok(word.text.trim().length > 0, `word ${index} text must be non-empty; got ${JSON.stringify(word.text)}`);
    assertFiniteNumber(word.start, `word ${index} start`);
    assertFiniteNumber(word.end, `word ${index} end`);
    assert.ok(word.start >= 0, `word ${index} start must be non-negative; got ${word.start}`);
    assert.ok(word.end > word.start, `word ${index} end must be after start; got ${word.start}–${word.end}`);
    if (index > 0) {
      assert.ok(word.start >= transcript[index - 1].end, `word ${index} overlaps word ${index - 1}`);
    }
  });
  return transcript;
}

export function findUniquePhraseStart(transcript, phrase) {
  validateTranscript(transcript);
  const phraseTokens = normalizedTokens(phrase);
  const words = transcript.map((word) => word.text.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  const matches = [];
  for (let index = 0; index <= words.length - phraseTokens.length; index += 1) {
    if (phraseTokens.every((token, offset) => words[index + offset] === token)) matches.push(index);
  }
  assert.equal(matches.length, 1, `anchor phrase ${JSON.stringify(phrase)} must occur exactly once; found ${matches.length} matches`);
  return transcript[matches[0]].start;
}

export function validateBeatBoundaries(beatBoundaries, lastWordEndSeconds) {
  assert.ok(Array.isArray(beatBoundaries) && beatBoundaries.length > 0, "beatBoundaries must be a non-empty array");
  assertFiniteNumber(lastWordEndSeconds, "lastWordEndSeconds");
  beatBoundaries.forEach((beat, index) => {
    assert.ok(beat && typeof beat === "object" && !Array.isArray(beat), `beat ${index} must be an object`);
    assertFiniteNumber(beat.start, `beat ${index} start`);
    assertFiniteNumber(beat.end, `beat ${index} end`);
    assert.ok(beat.start >= 0, `beat ${index} start must be non-negative; got ${beat.start}`);
    assert.ok(beat.end > beat.start, `beat ${index} end must be after start; got ${beat.start}–${beat.end}`);
    if (index > 0) {
      assert.equal(beat.start, beatBoundaries[index - 1].end, `beat ${index} must be contiguous with beat ${index - 1}`);
    }
  });
  assert.equal(beatBoundaries.at(-1).end, lastWordEndSeconds, "final beat end must equal lastWordEndSeconds");
  return beatBoundaries;
}

export function buildBeatBoundaries(transcript, phrases) {
  validateTranscript(transcript);
  assert.ok(Array.isArray(phrases) && phrases.length > 0, "anchor phrases must be a non-empty array");
  const starts = phrases.map((phrase) => findUniquePhraseStart(transcript, phrase));
  starts.forEach((start, index) => {
    if (index > 0) assert.ok(start > starts[index - 1], `anchor starts must be strictly increasing at index ${index}`);
  });
  const lastWordEndSeconds = transcript.at(-1).end;
  const beatBoundaries = starts.map((start, index) => ({
    start,
    end: starts[index + 1] ?? lastWordEndSeconds,
  }));
  validateBeatBoundaries(beatBoundaries, lastWordEndSeconds);
  return beatBoundaries;
}

export function deriveCanonicalBeatBoundaries(transcript) {
  return buildBeatBoundaries(transcript, CANONICAL_BEAT_ANCHORS);
}

export function assertBeatBoundariesMatchTranscript(transcript, beatBoundaries) {
  validateTranscript(transcript);
  validateBeatBoundaries(beatBoundaries, transcript.at(-1).end);
  const expected = deriveCanonicalBeatBoundaries(transcript);
  assert.deepEqual(
    beatBoundaries,
    expected,
    `beatBoundaries are stale or misaligned with transcript-derived canonical anchors; expected=${JSON.stringify(expected)} actual=${JSON.stringify(beatBoundaries)}`,
  );
  return expected;
}

export function validateAudioProvenance(audioProvenance, audioDurationSeconds) {
  assert.ok(audioProvenance && typeof audioProvenance === "object" && !Array.isArray(audioProvenance), "audioProvenance must be an object");
  assert.equal(audioProvenance.provider, "macOS say", `audioProvenance.provider must be macOS say; got ${JSON.stringify(audioProvenance.provider)}`);
  assert.equal(audioProvenance.voice, "Samantha", `audioProvenance.voice must be Samantha; got ${JSON.stringify(audioProvenance.voice)}`);
  for (const field of ["sourceRateWpm", "sourceDurationSeconds", "tempoFactor", "effectiveRateWpm", "finalDurationSeconds"]) {
    assertFiniteNumber(audioProvenance[field], `audioProvenance.${field}`);
  }
  assert.equal(audioProvenance.sourceRateWpm, 140, "audioProvenance.sourceRateWpm must be 140");
  assert.equal(audioProvenance.sourceDurationSeconds, 150.98825, "audioProvenance.sourceDurationSeconds must be 150.98825");
  assert.equal(audioProvenance.tempoFactor, 1.011646566, "audioProvenance.tempoFactor must be 1.011646566");
  assert.equal(audioProvenance.transform, "ffmpeg atempo (pitch-preserving whole track)", "audioProvenance.transform must record the approved transform");
  assert.equal(audioProvenance.effectiveRateWpm, 141.63, "audioProvenance.effectiveRateWpm must be 141.63");
  assert.equal(audioProvenance.finalDurationSeconds, audioDurationSeconds, "audioProvenance.finalDurationSeconds must equal audioDurationSeconds");
  assert.ok(audioProvenance.finalDurationSeconds <= audioProvenance.sourceDurationSeconds, "audioProvenance final duration must not exceed source duration");
  return audioProvenance;
}

export function validateMeta(meta, transcript) {
  validateTranscript(transcript);
  assert.ok(meta && typeof meta === "object" && !Array.isArray(meta), "meta must be an object");
  assertFiniteNumber(meta.lastWordEndSeconds, "lastWordEndSeconds");
  assert.equal(meta.lastWordEndSeconds, transcript.at(-1).end, "lastWordEndSeconds must equal transcript final word end");
  assertFiniteNumber(meta.audioDurationSeconds, "audioDurationSeconds");
  assert.ok(meta.audioDurationSeconds > 0, `audioDurationSeconds must be positive; got ${meta.audioDurationSeconds}`);
  assert.ok(meta.audioDurationSeconds >= meta.lastWordEndSeconds, `audioDurationSeconds ${meta.audioDurationSeconds} must cover last word ${meta.lastWordEndSeconds}`);
  assert.ok(meta.audioDurationSeconds <= 149.5, `audioDurationSeconds must be <= 149.5; got ${meta.audioDurationSeconds}`);
  validateBeatBoundaries(meta.beatBoundaries, meta.lastWordEndSeconds);
  return meta;
}

export function parseCaptionScript(source) {
  assert.equal(typeof source, "string", `captions.js source must be a string; got ${typeof source}`);
  const match = source.match(/^window\.__captionCues\s*=\s*(\[[\s\S]*\]);\s*$/);
  assert.ok(match, "captions.js must be exactly a window.__captionCues JSON wrapper");
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    assert.fail(`captions.js wrapper contains invalid JSON: ${error.message}`);
  }
}

export function assertCaptionScriptMatches(captions, source) {
  assert.ok(Array.isArray(captions), "captions.json must be an array");
  const parsed = parseCaptionScript(source);
  assert.deepEqual(parsed, captions, "captions.js payload does not match captions.json");
  return parsed;
}
