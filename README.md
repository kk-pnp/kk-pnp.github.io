# Kleine Fluchten – One-Shot-Übersicht

Eine statische Website für Pen-and-Paper-One-Shots. Jeder One-Shot liegt in einer eigenen JSON-Datei; daraus werden die Übersicht und die Detailseiten automatisch erzeugt.

## Inhalte bearbeiten

- Allgemeine Texte und Kontaktlink: `content/site.json`
- One-Shots: je eine Datei unter `content/oneshots/`
- Gestaltung: `src/styles.css`

Für ein neues Abenteuer eine vorhandene JSON-Datei kopieren, umbenennen und die Werte anpassen. Der Dateiname ist frei wählbar; `slug` muss eindeutig sein und darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.

## Bilder ergänzen

1. Bild unter `assets/images/` ablegen, zum Beispiel `assets/images/letzte-laterne.webp`.
2. In der zugehörigen JSON-Datei `image` setzen:

```json
"image": {
  "src": "assets/images/letzte-laterne.webp",
  "alt": "Eine leuchtende Laterne vor einem Wald im Nebel",
  "position": "50% 45%"
}
```

Ohne Bild zeigt die Karte automatisch eine farbige, atmosphärische Fläche. Empfehlenswert sind WebP- oder AVIF-Dateien im Querformat mit etwa 1600 × 1000 Pixeln und unter 500 KB.

## Lokal prüfen

Voraussetzung: Node.js 20 oder neuer.

```powershell
npm run check
npm run build
```

Die fertige Website liegt danach in `dist/`. Für eine lokale Vorschau kann dort ein beliebiger kleiner Webserver gestartet werden.

## Veröffentlichung

Bei jedem Push auf `main` baut GitHub Actions die Website und veröffentlicht sie über GitHub Pages. Im Repository muss unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** gewählt sein.

## Git-Hinweis für dieses Repository

Das eigentliche Repository ist `C:\Users\user\Documents\dev\kk-pnp.github.io`. Der versehentlich in `C:\Users\user\Documents\dev` angelegte zusätzliche `.git`-Ordner gehört nicht zu dieser Website.
