/**
 * Publikasi folder statis ke here.now (tanpa dependency tambahan).
 *
 *   node scripts/herenow-publish.mjs landing --client opencode
 *
 * Alur: POST /api/v1/publish -> PUT tiap file -> POST finalize.
 * Tanpa API key, site bersifat anonim dan kedaluwarsa dalam 24 jam.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.HERENOW_BASE_URL ?? "https://here.now";
const dir = process.argv[2] ?? "landing";
const clientIndex = process.argv.indexOf("--client");
const client = clientIndex > -1 ? process.argv[clientIndex + 1] : "opencode";
const slugIndex = process.argv.indexOf("--slug");
const updateSlug = slugIndex > -1 ? process.argv[slugIndex + 1] : "";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

function walk(root, prefix = "") {
  const entries = [];
  for (const item of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (item.name === ".herenow" || item.name === "node_modules") continue;
      entries.push(...walk(root, relative));
    } else {
      entries.push(relative);
    }
  }
  return entries;
}

const root = path.resolve(dir);
if (!fs.existsSync(root)) {
  console.error(`Folder tidak ditemukan: ${root}`);
  process.exit(1);
}

const files = walk(root).map((relative) => {
  const full = path.join(root, relative);
  const stat = fs.statSync(full);
  return {
    path: relative,
    size: stat.size,
    contentType: CONTENT_TYPES[path.extname(relative).toLowerCase()] ?? "application/octet-stream",
    full,
  };
});

if (!files.some((file) => file.path === "index.html")) {
  console.error("index.html harus berada di akar folder yang dipublikasikan.");
  process.exit(1);
}

const headers = { "X-HereNow-Client": client };
const apiKey = process.env.HERENOW_API_KEY;
if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

// State lokal menyimpan claim token Site anonim agar bisa diperbarui tanpa
// membuat URL baru.
const statePath = path.join(process.cwd(), ".herenow", "state.json");
const previousState = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : { publishes: {} };
const previous = updateSlug ? previousState.publishes?.[updateSlug] : undefined;
const claimTokenForUpdate = previous?.claimToken;

console.log(
  updateSlug
    ? `Memperbarui site ${updateSlug} dengan ${files.length} file dari ${dir} ...`
    : `Mempublikasikan ${files.length} file dari ${dir} ...`,
);

const endpoint = updateSlug
  ? `${BASE}/api/v1/publish/${encodeURIComponent(updateSlug)}`
  : `${BASE}/api/v1/publish`;
const requestBody = {
  files: files.map(({ path: filePath, size, contentType }) => ({
    path: filePath,
    size,
    contentType,
  })),
  ...(updateSlug && claimTokenForUpdate ? { claimToken: claimTokenForUpdate } : {}),
  ...(updateSlug && previous?.versionId ? { baseVersionId: previous.versionId } : {}),
};

const createResponse = await fetch(endpoint, {
  method: updateSlug ? "PUT" : "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify(requestBody),
});

const created = await createResponse.json().catch(() => null);
if (!createResponse.ok) {
  console.error(
    updateSlug ? "Gagal memperbarui site:" : "Gagal membuat site:",
    createResponse.status,
    JSON.stringify(created, null, 2),
  );
  process.exit(1);
}

const upload = created.upload ?? created;
const uploads = upload.uploads ?? [];
const finalizeUrl = upload.finalizeUrl ?? created.finalizeUrl;
const versionId = upload.versionId ?? created.versionId;
const slug = upload.slug ?? created.slug ?? updateSlug;
// Site anonim: claimToken/claimUrl/expiresAt hanya dikembalikan sekali,
// pada respons pembuatan site (bukan pada finalize).
const claimToken = created.claimToken ?? upload.claimToken ?? claimTokenForUpdate;
const claimUrl = created.claimUrl ?? upload.claimUrl ?? previous?.claimUrl;
const expiresAt = created.expiresAt ?? upload.expiresAt ?? previous?.expiresAt;

if (!finalizeUrl || !versionId || uploads.length === 0) {
  console.error("Respons publish tidak dikenali:", JSON.stringify(created, null, 2));
  process.exit(1);
}

const uploadsByPath = new Map();
uploads.forEach((entry, index) => {
  const key = entry.path ?? files[index]?.path;
  if (key) uploadsByPath.set(key, entry);
});

for (const file of files) {
  const target = uploadsByPath.get(file.path);
  if (!target) {
    console.error(`Tidak ada URL upload untuk ${file.path}`);
    process.exit(1);
  }
  const response = await fetch(target.url, {
    method: "PUT",
    headers: { "content-type": target.contentType ?? file.contentType },
    body: fs.readFileSync(file.full),
  });
  if (!response.ok) {
    console.error(`Upload gagal (${file.path}): ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  console.log(`  upload ok: ${file.path}`);
}

const finalizeResponse = await fetch(finalizeUrl, {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ versionId }),
});
const final = await finalizeResponse.json().catch(() => null);
if (!finalizeResponse.ok) {
  console.error("Finalize gagal:", finalizeResponse.status, JSON.stringify(final, null, 2));
  process.exit(1);
}

const siteUrl = final.siteUrl ?? final.primaryUrl ?? previous?.siteUrl;
console.log("\n=== HASIL PUBLIKASI ===");
console.log(`mode=${updateSlug ? "update" : "create"}`);
console.log(`site_url=${siteUrl}`);
console.log(`primary_url=${final.primaryUrl ?? ""}`);
console.log(`claim_url=${claimUrl ?? ""}`);
console.log(`expires_at=${expiresAt ?? ""}`);
console.log(`anonymous=${created.anonymous ?? ""}`);
console.log(`slug=${slug ?? ""}`);
if (Array.isArray(final.urls)) {
  for (const item of final.urls) console.log(`url=${item.url ?? item}`);
}

fs.mkdirSync(path.join(process.cwd(), ".herenow"), { recursive: true });
const state = previousState;
if (slug) {
  state.publishes = state.publishes ?? {};
  state.publishes[slug] = {
    siteUrl,
    claimToken,
    claimUrl,
    expiresAt,
    versionId: final.versionId ?? versionId,
    publishedAt: new Date().toISOString(),
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}
