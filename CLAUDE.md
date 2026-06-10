# Cali Tracker — Contesto per Claude Code

## Progetto
App web per tracciare le progressioni di allenamento calisthenico.
- **Autore:** Davide Gibilisco (GitHub: m3rlinux)
- **Repo:** https://github.com/m3rlinux/cali-tracker
- **Live:** https://m3rlinux.github.io/cali-tracker/
- **Licenza:** MIT
- **Versione corrente:** 2.7.11

## File del progetto
- `index.html` — app completa (single file, no build step)
- `exercises.json` — definizione esercizi, varianti e metriche
- `sw.js` — Service Worker per caching e auto-update
- `LICENSE` — MIT License
- `CLAUDE.md` — questo file

## Versioning
Segue **semver** (`MAJOR.MINOR.PATCH`):
- **MAJOR** — breaking change nei dati localStorage
- **MINOR** — nuove feature
- **PATCH** — bugfix e modifiche minori

**Regola critica:** ad ogni modifica incrementare `PATCH` in:
1. `const VERSION` in `index.html`
2. Header `Cali Tracker vX.Y.Z` nel commento in cima a `index.html`
3. `const CACHE_VERSION` in `sw.js` (sempre allineato alla versione app)

Se si aggiorna solo `exercises.json` senza toccare l'app, incrementare `CACHE_VERSION` in `sw.js` aggiungendo un suffisso (es. `2.7.7-a`).

## Architettura

### Storage
- Dati sessioni in `localStorage` con chiave `cali_sessions_[nome_utente]`
- Ogni sessione è un oggetto con chiavi `pXsY` (es. `p0s1`, `p1s2` ecc.)
- Struttura sessione: `{ date, p0s1: { variant, sets, hold_max? }, p1s1: {...}, ... }`
- `sets` per reps: `[[reps, cluster], ...]`
- `sets` per time: `[[secondi, null], ...]`
- `hold_max` presente solo per varianti isometriche

### exercises.json
Ogni gruppo esercizi ha:
```json
{
  "chiave_gruppo": {
    "label": "Nome visualizzato",
    "station": "pXsY",
    "variants": ["variante1", "variante2"],
    "metrics": { "variante_isometrica": "time" }
  }
}
```
- `station` determina l'ordine dello stepper (raggruppamento per `pX`, ordinamento per `sY`)
- Default metrica: `reps`. Solo le varianti esplicitamente in `metrics` sono `time`
- **Non cambiare mai i valori `station`** senza considerare che spezza lo storico delle sessioni precedenti

### Gruppi attuali
| station | gruppo | label |
|---------|--------|-------|
| p0s1 | handstand_skill | Reps Handstand |
| p0s2 | handstand_hold | Hold Handstand |
| p1s1 | tirata_verticale | Tirata verticale |
| p1s2 | gambe_anteriore | Gambe anteriore |
| p2s1 | spinta_orizzontale | Spinta orizzontale |
| p2s2 | core | Core |
| p3s1 | tirata_orizzontale | Tirata orizzontale |
| p3s2 | gambe_posteriore | Gambe posteriore |
| p4s1 | spinta_verticale | Spinta verticale |
| p4s2 | catena_posteriore | Catena posteriore |

### Colori pair
```css
--p0: #b090f0  (purple)
--p1: #ee412a  (red)
--p2: #47d2eb  (cyan)
--p3: #df60f0  (magenta)
--p4: #f09138  (orange)
```
Il verde (`--teal: #4dd9a0`) è riservato agli indicatori di progressione (frecce ↑ nei grafici, totale in target).

### Stepper dinamico
`buildSteps()` legge `exercises.json`, raggruppa per prefisso `pX`, ordina per `sY`, costruisce `STEPS[]`. Lo stepper UI è completamente dinamico.

### Metriche
- **reps**: input filate + cluster con pulsanti +/−. Label intensità sotto ogni set: `forza` (1–5), `ipertrofia` (6–20), `resistenza` (21+). Media rep/set nella barra totale.
- **time**: input secondi con pulsanti +/−. Hold max PR + target 65%. Totale colorato teal ≥50" / amber <50".

### Navigazione
- **Mobile**: swipe sinistra/destra per cambiare step
- **Desktop**: bottoni ‹ Indietro / Avanti › (rilevamento touch via `ontouchstart` + `pointer: fine`)
- Nessun navigatore sessioni — solo pulsante `+ Nuova` per nuova sessione
- ✎ nello storico apre la sessione in modalità modifica

### Service Worker
- Cache-first per `index.html`, network-first per `exercises.json`
- Quando SW si aggiorna, manda `SW_UPDATED` all'app
- L'app salva lo stato form in `sessionStorage` e ricarica
- Check aggiornamento SW anche al click di `+ Nuova`

## Convenzioni codice
- Tutto in un singolo file HTML (CSS + JS inline)
- Nessun framework, nessun build step
- Funzioni JS in snake_case, variabili camelCase
- Template literals per HTML generato
- `getData()` / `saveData()` per tutti gli accessi a localStorage
- `collectStep()` scrive in localStorage **solo** se la sessione ha già una data (evita salvataggi accidentali)

## Decisioni di design
- **Frecce ↑↓ nei grafici**: solo per cambio variante atletica (indice nella lista `variants`), mai per cambio `station`
- **Delta nello storico**: azzerato quando cambia variante o station (nessun confronto cross-variante)
- **Cluster nei grafici**: rimosso — informazione già leggibile dallo storico
- **Label intensità**: basata sulla media rep/set, non sul totale (10×4=forza, non ipertrofia)
- **Pre-carica valori**: nuova sessione eredita variante e valori dalla sessione precedente
- **Modifiche sessione**: stessa UI di inserimento, header ambra `✎ modifica`

## Flusso di sviluppo
1. Modifiche su `index.html` (e/o `sw.js`, `exercises.json`)
2. Incrementare versioni come da regola sopra
3. Push con Termux: `git add . && git commit -m "vX.Y.Z: descrizione" && git push`
4. Verifica deploy su GitHub Actions
5. Controllare versione live su `https://m3rlinux.github.io/cali-tracker/`
