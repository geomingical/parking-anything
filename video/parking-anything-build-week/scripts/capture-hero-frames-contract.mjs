export const MAIN_SAMPLE_TIMES = Object.freeze([4, 23, 39, 53, 64, 80, 98, 110, 118, 128, 138, 142, 147, 149.4]);

export function canonicalFrameName(time, index) {
  return `frame-${String(index).padStart(2, "0")}-at-${time}s.png`;
}

export const CANONICAL_FRAME_NAMES = Object.freeze(
  MAIN_SAMPLE_TIMES.map((time, index) => canonicalFrameName(time, index)),
);

const GENERATED_ARTIFACT_PATTERNS = Object.freeze([
  /^frame-\d{2,}-at-\d+(?:\.\d+)?s\.png$/,
  /^parking-anything-main-\d+(?:\.\d+)?s\.png$/,
  /^contact-sheet(?:-\d+)?\.jpg$/,
]);

export function isKnownGeneratedArtifact(fileName) {
  return !fileName.includes("/") && GENERATED_ARTIFACT_PATTERNS.some((pattern) => pattern.test(fileName));
}

export function assertDisclosureMeasurement({
  yellowCount,
  yellowWidth,
  yellowHeight,
  darkCount,
  darkWidth,
  darkHeight,
}) {
  if (yellowCount < 12_000 || yellowWidth < 340 || yellowHeight < 44) {
    throw new Error(
      `Future disclosure yellow geometry collapsed (pixels=${yellowCount}, bounds=${yellowWidth}x${yellowHeight})`,
    );
  }
  if (darkCount < 900 || darkWidth < 290 || darkHeight < 13) {
    throw new Error(
      `Future disclosure rendered text pixels collapsed (pixels=${darkCount}, bounds=${darkWidth}x${darkHeight})`,
    );
  }
}
