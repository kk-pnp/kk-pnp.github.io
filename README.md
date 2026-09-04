# Kleine Fluchten – One-Shot-Übersicht

Eine statische Website für Pen-and-Paper-One-Shots. Jeder One-Shot liegt in einer eigenen JSON-Datei; daraus werden die Übersicht und die Detailseiten automatisch erzeugt.

Alle erzeugten Seiten enthalten `noindex, nofollow`, damit Suchmaschinen die private Übersicht nicht in ihre Suchergebnisse aufnehmen und ihren Links nicht folgen sollen.

## Inhalte bearbeiten

- Seitentitel und kurze Beschreibung: `content/site.json`
- One-Shots: je eine Datei unter `content/oneshots/`
- Gestaltung: `src/styles.css`

Für ein neues Abenteuer eine vorhandene JSON-Datei kopieren, umbenennen und die Werte anpassen. Der Dateiname ist frei wählbar; `slug` muss eindeutig sein und darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.

Ein optionaler Hinweis wie „Coming Soon“ erscheint auf der Übersicht und der Detailseite:

```json
"tag": "Coming Soon"
```

Ein `shortPitch` kann optional als Zitat gestaltet werden. Sobald `shortPitchAuthor` gesetzt ist, erscheinen Text und Urheber automatisch im Zitatlayout:

```json
"shortPitch": "Die älteste und stärkste Emotion der Menschheit ist die Angst.",
"shortPitchAuthor": "H. P. Lovecraft"
```

Ohne `shortPitchAuthor` wird `shortPitch` weiterhin als normaler Untertext dargestellt.

Die Reihenfolge und Kartenbreite lassen sich ebenfalls pro Abenteuer festlegen:

```json
"order": 3,
"layout": "wide"
```

`layout` kann `standard` oder `wide` sein. Die Links zum vorherigen und nächsten Abenteuer folgen automatisch der mit `order` festgelegten Reihenfolge.

### Aufbau einer Abenteuerseite

Die ausführlichen Inhalte einer Seite werden mit diesen Feldern gepflegt:

```json
"playerView": {
  "who": "Wer bin ich?",
  "do": "Was mache ich?",
  "can": "Was kann ich?"
},
"playedWith": "Kurze Erklärung des Regelsystems.",
"expectations": [
  {
    "heading": "Optionale Zwischenüberschrift",
    "text": "Ein oder mehrere Absätze darüber, was die Gruppe erwartet."
  }
],
"fitsIf": [
  "du diese Art von Abenteuer magst",
  "du dich auf diesen Spielstil einlassen möchtest"
]
```

Unter `expectations` können beliebig viele Blöcke ergänzt werden. `heading` ist optional; `text` ist immer erforderlich. Innerhalb längerer Texte erzeugt eine Leerzeile einen neuen Absatz. Die Zwischenüberschriften erscheinen in der Akzentfarbe der jeweiligen Seite. Eine Überschrift, die exakt `Trigger Warning` lautet, wird automatisch rot dargestellt.

Die Box „Auf einen Blick“ zeigt automatisch `system`, `duration` und `players`. Darunter erscheinen die zwei bis vier Einträge aus `fitsIf`. Inhaltshinweise gehören als eigener Block unter `expectations`.

### Projekt- und Playtestseiten

Eine Seite, die kein einzelnes Abenteuer vorstellt, kann eine eigene Projektstruktur verwenden:

```json
"pageType": "playtest",
"tag": "Playtester gesucht",
"projectSections": [
  {
    "heading": "Worum geht es?",
    "text": "Beschreibung des Projekts."
  }
],
"playtestCall": {
  "heading": "Playtester gesucht",
  "text": "Aufruf an interessierte Testspielerinnen und Testspieler."
}
```

Bei diesem Seitentyp werden die normalen Felder `playerView`, `playedWith`, `expectations` und `fitsIf` nicht benötigt. In der Übersicht zeigt die Karte statt Dauer und Gruppengröße nur das Feld `system` an.

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

## Hintergrund der Detailseite bestimmen

Jeder One-Shot kann eine eigene helle oder dunkle Detailseite bekommen:

```json
"pageTheme": {
  "background": "#efe5d0",
  "mode": "light"
}
```

- `background`: sechsstellige Hex-Farbe, zum Beispiel `#efe5d0` oder `#071820`
- `mode`: `light` für dunkle Schrift auf hellem Grund oder `dark` für helle Schrift auf dunklem Grund

Wenn `pageTheme` fehlt, verwendet die Seite automatisch ein dunkles Standarddesign.

## Lokal prüfen

Voraussetzung: Node.js 20 oder neuer.

Für eine automatische Live-Vorschau:

```powershell
npm run dev
```

Danach `http://localhost:4173` im Browser öffnen. Änderungen an den JSON-Dateien, am CSS oder an Bildern werden automatisch gebaut und die geöffnete Seite lädt anschließend neu. Die Vorschau wird mit `Strg+C` beendet.

Für eine einmalige Prüfung und einen einzelnen Build:

```powershell
npm run check
npm run build
```

Die fertige Website liegt danach in `dist/`. Für eine lokale Vorschau kann dort ein beliebiger kleiner Webserver gestartet werden.

## Veröffentlichung

Bei jedem Push auf `main` baut GitHub Actions die Website und veröffentlicht sie über GitHub Pages. Im Repository muss unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** gewählt sein.

## Git-Hinweis für dieses Repository

Das eigentliche Repository ist `C:\Users\user\Documents\dev\kk-pnp.github.io`. Der versehentlich in `C:\Users\user\Documents\dev` angelegte zusätzliche `.git`-Ordner gehört nicht zu dieser Website.
