import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "dist");
const port = Number(process.env.PORT || 4173);
const reloadClients = new Set();
const watchers = [];

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", "build.mjs")], {
      cwd: root,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Build mit Status ${code} beendet.`)));
  });
}

let building = false;
let queued = false;

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  do {
    queued = false;
    try {
      await runBuild();
      reloadClients.forEach((client) => client.write("data: reload\n\n"));
    } catch (error) {
      console.error(`\n${error.message}`);
    }
  } while (queued);
  building = false;
}

await rebuild();

const reloadScript = '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>';
const server = createServer(async (request, response) => {
  if (request.url === "/__reload") {
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream"
    });
    response.write("data: connected\n\n");
    reloadClients.add(response);
    request.on("close", () => reloadClients.delete(response));
    return;
  }

  try {
    const requestPath = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    let target = path.resolve(outputDir, relativePath);
    if (target !== outputDir && !target.startsWith(`${outputDir}${path.sep}`)) {
      response.writeHead(403).end("Nicht erlaubt");
      return;
    }
    if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
    let body = await readFile(target);
    const extension = path.extname(target).toLowerCase();
    if (extension === ".html") {
      body = Buffer.from(body.toString("utf8").replace("</body>", `${reloadScript}</body>`));
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Nicht gefunden" : "Serverfehler");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\nLokale Vorschau: http://localhost:${port}`);
  console.log("Änderungen an JSON, CSS und Bildern werden automatisch übernommen. Beenden mit Strg+C.\n");
});

let rebuildTimer;
for (const directory of ["content", "src", "assets"]) {
  watchers.push(watch(path.join(root, directory), { recursive: true }, () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => void rebuild(), 150);
  }));
}

function stop() {
  clearTimeout(rebuildTimer);
  watchers.forEach((watcher) => watcher.close());
  reloadClients.forEach((client) => client.end());
  server.close(() => process.exit(0));
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
