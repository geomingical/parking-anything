import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

import { CANONICAL_FRAME_NAMES } from "./capture-hero-frames-contract.mjs";

const execFileAsync = promisify(execFile);
const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptsDir, "..");
const videoDir = resolve(projectDir, "..");
const teaserDir = resolve(projectDir, "../parking-anything-teaser");
const generatorPath = resolve(scriptsDir, "capture-hero-frames.mjs");
const expectedFiles = [...CANONICAL_FRAME_NAMES, "contact-sheet.jpg"].sort();

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, path));
    if (entry.isFile()) files.push(relative(root, path));
  }
  return files.sort();
}

async function hashTree(root) {
  const aggregate = createHash("sha256");
  for (const file of await walkFiles(root)) {
    aggregate.update(file);
    aggregate.update("\0");
    aggregate.update(await readFile(resolve(root, file)));
    aggregate.update("\0");
  }
  return aggregate.digest("hex");
}

async function artifactManifest(snapshotsDir) {
  const files = (await readdir(snapshotsDir)).sort();
  assert.deepEqual(files, expectedFiles);
  const manifest = [];
  for (const file of files) {
    const path = resolve(snapshotsDir, file);
    assert.equal((await stat(path)).isFile(), true, `${file} must be a file`);
    const metadata = await sharp(path).metadata();
    assert.deepEqual([metadata.width, metadata.height], [1920, 1080], `${file} dimensions`);
    manifest.push([file, createHash("sha256").update(await readFile(path)).digest("hex")]);
  }
  return manifest;
}

function contentType(path) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".wav": "audio/wav",
  })[extname(path)] || "application/octet-stream";
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const requestedPath = resolve(videoDir, pathname.replace(/^\/+/, ""));
      if (!requestedPath.startsWith(`${videoDir}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentType(requestedPath),
      });
      createReadStream(requestedPath).on("error", () => response.destroy()).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  return server;
}

test("canonical generator is idempotent and leaves the full teaser tree unchanged", { timeout: 60_000 }, async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "parking-anything-video-evidence-"));
  const snapshotsDir = resolve(temporaryRoot, "snapshots");
  const teaserBefore = await hashTree(teaserDir);
  const server = await startStaticServer();
  const address = server.address();
  assert(address && typeof address !== "string");
  const environment = {
    ...process.env,
    PARKING_ANYTHING_CAPTURE_OUTPUT_DIR: snapshotsDir,
    PARKING_ANYTHING_CAPTURE_SERVER_URL: `http://127.0.0.1:${address.port}/parking-anything-build-week/index.html`,
  };

  try {
    await execFileAsync(process.execPath, [generatorPath], {
      cwd: projectDir,
      env: environment,
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
    const firstManifest = await artifactManifest(snapshotsDir);

    await execFileAsync(process.execPath, [generatorPath], {
      cwd: projectDir,
      env: environment,
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
    const secondManifest = await artifactManifest(snapshotsDir);
    const teaserAfter = await hashTree(teaserDir);

    assert.deepEqual(secondManifest, firstManifest, "two generator runs must be byte-identical");
    assert.equal(teaserAfter, teaserBefore, "generator must not mutate the teaser tree");
    console.log(JSON.stringify({
      artifactCount: secondManifest.length,
      frameCount: CANONICAL_FRAME_NAMES.length,
      dimensions: "1920x1080",
      manifestSha256: createHash("sha256").update(JSON.stringify(secondManifest)).digest("hex"),
      teaserTreeSha256: teaserAfter,
    }));
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
