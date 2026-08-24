import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content", "oneshots");
const outputDir = path.join(root, "dist");
const checkOnly = process.argv.includes("--check");

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const requiredStrings = ["slug", "title", "shortPitch", "synopsis", "characters", "rules", "duration", "players", "experience"];
const allowedAccents = new Set(["gold", "cyan", "coral", "moss"]);

function validateAdventure(adventure, filename) {
  const errors = [];
  requiredStrings.forEach((field) => {
    if (typeof adventure[field] !== "string" || !adventure[field].trim()) errors.push(`"${field}" fehlt oder ist leer`);
  });
  if (!Array.isArray(adventure.mood) || adventure.mood.length === 0) errors.push('"mood" muss eine nicht-leere Liste sein');
  if (typeof adventure.beginnerFriendly !== "boolean") errors.push('"beginnerFriendly" muss true oder false sein');
  if (adventure.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adventure.slug)) errors.push('"slug" darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten');
  if (adventure.accent && !allowedAccents.has(adventure.accent)) errors.push(`"accent" muss ${[...allowedAccents].join(", ")} sein`);
  if (adventure.pageTheme !== undefined) {
    if (!adventure.pageTheme || typeof adventure.pageTheme !== "object" || Array.isArray(adventure.pageTheme)) {
      errors.push('"pageTheme" muss ein Objekt sein');
    } else {
      if (!/^#[0-9a-f]{6}$/i.test(adventure.pageTheme.background || "")) errors.push('"pageTheme.background" muss eine sechsstellige Hex-Farbe wie #efe5d0 sein');
      if (!["light", "dark"].includes(adventure.pageTheme.mode)) errors.push('"pageTheme.mode" muss "light" oder "dark" sein');
    }
  }
  if (errors.length) throw new Error(`${filename}:\n- ${errors.join("\n- ")}`);
}

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${path.relative(root, file)} enthält kein gültiges JSON:\n${error.message}`);
  }
}

function imageMarkup(adventure, className, prefix = ".") {
  if (!adventure.image?.src) return "";
  const src = `${prefix}/${adventure.image.src.replace(/^\.\//, "")}`.replaceAll("//", "/");
  const position = adventure.image.position ? ` style="object-position:${escapeHtml(adventure.image.position)}"` : "";
  return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(adventure.image.alt || "")}"${position}>`;
}

function renderCard(adventure) {
  const moods = adventure.mood.map((mood) => escapeHtml(mood)).join(" · ");
  return `
    <a class="card" data-accent="${escapeHtml(adventure.accent || "gold")}" href="./abenteuer/${encodeURIComponent(adventure.slug)}.html">
      ${imageMarkup(adventure, "card-image")}
      <div class="card-content">
        ${adventure.beginnerFriendly ? '<span class="badge">Ideal zum Einsteigen</span>' : ""}
        <h3>${escapeHtml(adventure.title)}</h3>
        <p class="pitch">${escapeHtml(adventure.shortPitch)}</p>
        <div class="card-meta"><span>${escapeHtml(adventure.duration)}</span><span>${escapeHtml(adventure.players)}</span></div>
        <div class="moods">${moods}</div>
      </div>
    </a>`;
}

function pageHead({ title, description, cssPath, image }) {
  const imageMeta = image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111411">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${imageMeta}
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssPath}">
</head>`;
}

function renderIndex(site, adventures) {
  return `${pageHead({ title: `${site.title} – ${site.tagline}`, description: site.description, cssPath: "./assets/styles.css" })}
<body>
  <header class="gallery-header shell">
    <p class="kicker">${escapeHtml(site.tagline)}</p>
    <h1>${escapeHtml(site.title)}</h1>
  </header>
  <main>
    <section class="shell" aria-label="Spielbare One-Shots">
      <div class="adventure-grid">${adventures.map(renderCard).join("\n")}</div>
    </section>
  </main>
</body>
</html>`;
}

function renderDetail(site, adventure) {
  const pageTheme = adventure.pageTheme || { background: "#111411", mode: "dark" };
  const facts = [
    ["Dauer", adventure.duration], ["Gruppe", adventure.players], ["Erfahrung", adventure.experience],
    ...(adventure.system ? [["Regelsystem", adventure.system]] : [])
  ];
  return `${pageHead({ title: `${adventure.title} – ${site.title}`, description: adventure.shortPitch, cssPath: "../assets/styles.css", image: adventure.image?.src ? `../${adventure.image.src.replace(/^\.\//, "")}` : undefined })}
<body class="detail-page theme-${pageTheme.mode}" style="--page-bg:${pageTheme.background}">
  <main>
    <section class="detail-hero" data-accent="${escapeHtml(adventure.accent || "gold")}">
      ${imageMarkup(adventure, "detail-image", "..")}
      <a class="back" href="../index.html">← Alle Abenteuer</a>
      <div class="detail-hero-content">
        ${adventure.beginnerFriendly ? '<span class="badge">Ideal zum Einsteigen</span>' : ""}
        <h1>${escapeHtml(adventure.title)}</h1><p class="pitch">${escapeHtml(adventure.shortPitch)}</p>
        <div class="moods">${adventure.mood.map(escapeHtml).join(" · ")}</div>
      </div>
    </section>
    <div class="detail-layout shell" data-accent="${escapeHtml(adventure.accent || "gold")}">
      <article class="story">
        <section><p class="kicker">Worum geht es?</p><h2>Der Abend beginnt …</h2><p>${escapeHtml(adventure.synopsis)}</p></section>
        <section><p class="kicker">Eure Figuren</p><h2>Wen spielt ihr?</h2><p>${escapeHtml(adventure.characters)}</p></section>
        <section><p class="kicker">Ganz ohne Vorwissen</p><h2>Wie funktionieren die Regeln?</h2><p>${escapeHtml(adventure.rules)}</p></section>
      </article>
      <aside class="facts"><h2>Auf einen Blick</h2><dl>${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>${adventure.contentNote ? `<p class="content-note"><strong>Hinweis:</strong> ${escapeHtml(adventure.contentNote)}</p>` : ""}</aside>
    </div>
  </main>
  <footer class="site-footer shell"><a class="contact-link" href="../index.html">← Zurück zur Übersicht</a></footer>
</body>
</html>`;
}

async function build() {
  const site = await loadJson(path.join(root, "content", "site.json"));
  const files = (await readdir(contentDir)).filter((file) => file.endsWith(".json")).sort();
  if (files.length === 0) throw new Error("Keine Abenteuer in content/oneshots gefunden.");

  const adventures = await Promise.all(files.map(async (filename) => {
    const adventure = await loadJson(path.join(contentDir, filename));
    validateAdventure(adventure, filename);
    return adventure;
  }));

  const slugs = adventures.map((item) => item.slug);
  const duplicate = slugs.find((slug, index) => slugs.indexOf(slug) !== index);
  if (duplicate) throw new Error(`Der slug "${duplicate}" wird mehrfach verwendet.`);

  if (checkOnly) {
    console.log(`✓ ${adventures.length} Abenteuer geprüft.`);
    return;
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(path.join(outputDir, "assets"), { recursive: true });
  await mkdir(path.join(outputDir, "abenteuer"), { recursive: true });
  await copyFile(path.join(root, "src", "styles.css"), path.join(outputDir, "assets", "styles.css"));
  const imageDir = path.join(root, "assets", "images");
  try {
    if ((await stat(imageDir)).isDirectory()) await cp(imageDir, path.join(outputDir, "assets", "images"), { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await writeFile(path.join(outputDir, "index.html"), renderIndex(site, adventures), "utf8");
  await Promise.all(adventures.map((adventure) => writeFile(path.join(outputDir, "abenteuer", `${adventure.slug}.html`), renderDetail(site, adventure), "utf8")));
  await writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");
  console.log(`✓ Website mit ${adventures.length} Abenteuern nach dist/ gebaut.`);
}

build().catch((error) => {
  console.error(`\nBuild fehlgeschlagen:\n${error.message}`);
  process.exitCode = 1;
});
