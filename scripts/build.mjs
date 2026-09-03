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

const renderParagraphs = (value = "") => String(value)
  .trim()
  .split(/\r?\n\s*\r?\n/)
  .map((paragraph) => `<p>${escapeHtml(paragraph.replace(/\s*\r?\n\s*/g, " "))}</p>`)
  .join("");

const requiredStrings = ["slug", "title", "shortPitch", "playedWith", "duration", "players"];
const allowedAccents = new Set(["gold", "cyan", "coral", "moss"]);

function validateAdventure(adventure, filename) {
  const errors = [];
  requiredStrings.forEach((field) => {
    if (typeof adventure[field] !== "string" || !adventure[field].trim()) errors.push(`"${field}" fehlt oder ist leer`);
  });
  if (adventure.shortPitchAuthor !== undefined && (typeof adventure.shortPitchAuthor !== "string" || !adventure.shortPitchAuthor.trim())) {
    errors.push('"shortPitchAuthor" muss eine nicht-leere Zeichenkette sein');
  }
  if (!adventure.playerView || typeof adventure.playerView !== "object" || Array.isArray(adventure.playerView)) {
    errors.push('"playerView" muss ein Objekt sein');
  } else {
    [["who", "Wer bin ich?"], ["do", "Was mache ich?"], ["can", "Was kann ich?"]].forEach(([field, label]) => {
      if (typeof adventure.playerView[field] !== "string" || !adventure.playerView[field].trim()) errors.push(`"playerView.${field}" (${label}) fehlt oder ist leer`);
    });
  }
  if (!Array.isArray(adventure.expectations) || adventure.expectations.length === 0) {
    errors.push('"expectations" muss eine nicht-leere Liste sein');
  } else {
    adventure.expectations.forEach((section, index) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        errors.push(`"expectations[${index}]" muss ein Objekt sein`);
        return;
      }
      if (typeof section.text !== "string" || !section.text.trim()) errors.push(`"expectations[${index}].text" fehlt oder ist leer`);
      if (section.heading !== undefined && (typeof section.heading !== "string" || !section.heading.trim())) errors.push(`"expectations[${index}].heading" muss eine nicht-leere Zeichenkette sein`);
    });
  }
  if (!Array.isArray(adventure.fitsIf) || adventure.fitsIf.length < 2 || adventure.fitsIf.length > 4 || adventure.fitsIf.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push('"fitsIf" muss eine Liste aus zwei bis vier Texten sein');
  }
  if (adventure.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adventure.slug)) errors.push('"slug" darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten');
  if (adventure.accent && !allowedAccents.has(adventure.accent)) errors.push(`"accent" muss ${[...allowedAccents].join(", ")} sein`);
  if (adventure.tag !== undefined && (typeof adventure.tag !== "string" || !adventure.tag.trim())) errors.push('"tag" muss eine nicht-leere Zeichenkette sein');
  if (adventure.order !== undefined && (!Number.isInteger(adventure.order) || adventure.order < 1)) errors.push('"order" muss eine positive ganze Zahl sein');
  if (adventure.layout !== undefined && !["standard", "wide"].includes(adventure.layout)) errors.push('"layout" muss "standard" oder "wide" sein');
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

function badgeMarkup(adventure) {
  const badges = [];
  if (adventure.tag) badges.push(`<span class="badge badge-status">${escapeHtml(adventure.tag)}</span>`);
  return badges.length ? `<div class="badge-row">${badges.join("")}</div>` : "";
}

function shortPitchMarkup(adventure) {
  if (!adventure.shortPitchAuthor) return `<p class="pitch">${escapeHtml(adventure.shortPitch)}</p>`;
  return `<figure class="pitch pitch-quote"><blockquote>„${escapeHtml(adventure.shortPitch)}“</blockquote><figcaption>— ${escapeHtml(adventure.shortPitchAuthor)}</figcaption></figure>`;
}

function renderCard(adventure) {
  return `
    <a class="card" data-accent="${escapeHtml(adventure.accent || "gold")}" data-layout="${escapeHtml(adventure.layout || "standard")}" href="./abenteuer/${encodeURIComponent(adventure.slug)}.html">
      ${imageMarkup(adventure, "card-image")}
      <div class="card-content">
        ${badgeMarkup(adventure)}
        <h3>${escapeHtml(adventure.title)}</h3>
        ${shortPitchMarkup(adventure)}
        <div class="card-meta">${adventure.system ? `<span>${escapeHtml(adventure.system)}</span>` : ""}<span>${escapeHtml(adventure.duration)}</span><span>${escapeHtml(adventure.players)}</span></div>
      </div>
    </a>`;
}

function renderExpectations(expectations) {
  return expectations.map((section) => {
    const warningClass = section.heading?.trim() === "Trigger Warning" ? " is-trigger-warning" : "";
    return `<section class="expectation-block${warningClass}">${section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : ""}${renderParagraphs(section.text)}</section>`;
  }).join("");
}

function renderAdventureNavigation(previousAdventure, nextAdventure) {
  const previous = previousAdventure
    ? `<a class="adventure-nav-link adventure-nav-previous" rel="prev" href="./${encodeURIComponent(previousAdventure.slug)}.html"><span>← Vorheriges Abenteuer</span><strong>${escapeHtml(previousAdventure.title)}</strong></a>`
    : '<span class="adventure-nav-placeholder" aria-hidden="true"></span>';
  const next = nextAdventure
    ? `<a class="adventure-nav-link adventure-nav-next" rel="next" href="./${encodeURIComponent(nextAdventure.slug)}.html"><span>Nächstes Abenteuer →</span><strong>${escapeHtml(nextAdventure.title)}</strong></a>`
    : '<span class="adventure-nav-placeholder" aria-hidden="true"></span>';
  return `<nav class="adventure-nav shell" aria-label="Zwischen den Abenteuern wechseln">${previous}${next}</nav>`;
}

function pageHead({ title, description, cssPath, image }) {
  const imageMeta = image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "";
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
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

function renderDetail(site, adventure, previousAdventure, nextAdventure) {
  const pageTheme = adventure.pageTheme || { background: "#111411", mode: "dark" };
  const facts = [
    ...(adventure.system ? [["System", adventure.system]] : []),
    ["Dauer", adventure.duration], ["Gruppe", adventure.players]
  ];
  return `${pageHead({ title: `${adventure.title} – ${site.title}`, description: adventure.shortPitch, cssPath: "../assets/styles.css", image: adventure.image?.src ? `../${adventure.image.src.replace(/^\.\//, "")}` : undefined })}
<body class="detail-page theme-${pageTheme.mode}" style="--page-bg:${pageTheme.background}">
  <main>
    <section class="detail-hero" data-accent="${escapeHtml(adventure.accent || "gold")}">
      ${imageMarkup(adventure, "detail-image", "..")}
      <a class="back" href="../index.html">← Alle Abenteuer</a>
      <div class="detail-hero-content">
        ${badgeMarkup(adventure)}
        <h1>${escapeHtml(adventure.title)}</h1>${shortPitchMarkup(adventure)}
      </div>
    </section>
    <div class="detail-layout shell" data-accent="${escapeHtml(adventure.accent || "gold")}">
      <section class="you-panel">
        <p class="kicker">Deine Rolle im Abenteuer</p>
        <h2>Du in „${escapeHtml(adventure.title)}“</h2>
        <div class="you-grid">
          <section><h3>Wer bin ich?</h3>${renderParagraphs(adventure.playerView.who)}</section>
          <section><h3>Was mache ich?</h3>${renderParagraphs(adventure.playerView.do)}</section>
          <section><h3>Was kann ich?</h3>${renderParagraphs(adventure.playerView.can)}</section>
        </div>
      </section>
      <aside class="facts"><h2>Auf einen Blick</h2><dl>${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><section class="facts-fit"><h3>Passt gut zu dir, wenn …</h3><ul>${adventure.fitsIf.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section></aside>
      <article class="story">
        <section class="story-section played-with"><p class="kicker">Das Regelsystem</p><h2>Gespielt mit</h2><p class="system-name">${escapeHtml(adventure.system || "Wird noch ergänzt")}</p>${renderParagraphs(adventure.playedWith)}</section>
        <section class="story-section"><p class="kicker">Am Spieltisch</p><h2>Was erwartet euch?</h2><div class="expectations">${renderExpectations(adventure.expectations)}</div></section>
      </article>
    </div>
    ${renderAdventureNavigation(previousAdventure, nextAdventure)}
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

  adventures.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "de"));

  const slugs = adventures.map((item) => item.slug);
  const duplicate = slugs.find((slug, index) => slugs.indexOf(slug) !== index);
  if (duplicate) throw new Error(`Der slug "${duplicate}" wird mehrfach verwendet.`);
  const orders = adventures.filter((item) => item.order !== undefined).map((item) => item.order);
  const duplicateOrder = orders.find((order, index) => orders.indexOf(order) !== index);
  if (duplicateOrder !== undefined) throw new Error(`Die Reihenfolge "${duplicateOrder}" wird mehrfach verwendet.`);

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
  await Promise.all(adventures.map((adventure, index) => writeFile(
    path.join(outputDir, "abenteuer", `${adventure.slug}.html`),
    renderDetail(site, adventure, adventures[index - 1], adventures[index + 1]),
    "utf8"
  )));
  await writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");
  console.log(`✓ Website mit ${adventures.length} Abenteuern nach dist/ gebaut.`);
}

build().catch((error) => {
  console.error(`\nBuild fehlgeschlagen:\n${error.message}`);
  process.exitCode = 1;
});
