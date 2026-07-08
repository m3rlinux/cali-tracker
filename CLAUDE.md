# Cali Tracker — Contesto per Claude Code

## Progetto
App web per tracciare le progressioni di allenamento calisthenico.
- **Autore:** Davide Gibilisco (GitHub: m3rlinux)
- **Repo:** https://github.com/m3rlinux/cali-tracker
- **Live:** https://m3rlinux.github.io/cali-tracker/
- **Licenza:** MIT
- **Versione corrente:** 3.24.2
- **fetchWod cache-bust**: `★ Oggi` scarica `wod.json?t=Date.now()` con `cache:'no-store'` → wod sempre fresco a prescindere dalla versione del SW; fallback a `wod.json` (cache SW) se offline
- **SW fetch JSON/manifest**: network-first con `fetch(req, {cache:'reload'})` per bypassare la cache HTTP del browser (GitHub Pages serve con `max-age=600`); senza, wod/exercises aggiornati arriverebbero solo dopo ~10 min. Con il fix `★ Oggi` prende sempre il wod fresco (vale dai dispositivi con SW ≥ 3.18.2)

### Stazioni opzionali
- Un gruppo in exercises.json con `"optional": true` (es. `handstand_s3`, station `p0s3`) compare in una coppia **solo se la sessione/wod lo contiene** (`isOptionalStation` / `stationActive` / `activeStations`); filtrato in `renderPairStep`, `pairTimingHTML`, `collectStep`. Le sessioni WOD sono escluse dall'ereditarietà, quindi p0s3 di fatto appare solo via wod
- **Gruppi `pool` (categorie)**: gruppi con `variants`/`metrics` e **nessuna `station`** (es. `tirata_verticale`, `handstand_skill`). Gli slot non hanno varianti proprie. In ogni slot: selettore **categoria** (`.category-select`) + menu **esercizio** filtrato (`getPickerCategories(px)` / `pool` in sessione). **P0**: `handstand_skill` + `handstand_hold` su tutti e tre gli slot (p0s1–p0s3). **P1–P4**: tutte le categorie del circuito (`getWorkCategories()`). Default categoria per slot nuovo: layout palestra originale (`DEFAULT_CATEGORY_LAYOUT`)
- **Lookup per variante (globale)**: `VARIANT_REGISTRY` + `findLastDataForVariant` / `findPrevExForVariant` — storico, ★ Oggi, delta e grafici seguono la **variante**, non lo slot: la stessa categoria può comparire su postazioni diverse senza perdere progressi

## File del progetto
- `index.html` — app completa (single file, no build step)
- `exercises.json` — definizione esercizi, varianti e metriche (file canonico, italiano)
- `exercises.en.json` — traduzioni inglesi di label e varianti (solo display)
- `wod.json` — sessione del giorno condivisa (template pre-caricabile)
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
- Struttura sessione: `{ date, p0s1: { variant, sets, hold_max? }, p1s1: { variant, pool?, sets, ... }, ... }` — su P1–P4 `pool` è la chiave categoria (es. `tirata_verticale`); se assente si inferisce dalla variante o dallo slot
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

### Lingue (exercises.en.json)
- `exercises.json` è il file **canonico**: i nomi variante salvati in localStorage sono sempre quelli italiani, qualunque lingua sia attiva
- `exercises.en.json` contiene solo `label` e `variants` per gruppo (niente `station` né `metrics`) ed è usato solo per la visualizzazione
- La traduzione delle varianti è **posizionale**: gli array `variants` IT e EN devono avere stessa lunghezza e stesso ordine. **Ogni modifica a `variants` in exercises.json va replicata nella stessa posizione in exercises.en.json**
- Selettore lingua: badge IT/EN nell'header (`toggleLang()`), scelta in localStorage `cali_lang`, helper `tVariant()` / `getGroupLabel()`

### Sessione del giorno (wod.json)
- Template condiviso per tutti gli utenti: `{ "set_time": 30, "force_num_sets": bool, "force_values": bool, "stations": { "pXsY": { "variant", "sets", "hold_max"? } } }`
- `force_num_sets: true` — le righe set sono esattamente quelle proposte dal WOD (anche meno del default; lo storico non estende; `+ set` resta disponibile). Assente/false: lo storico può estendere
- `force_values: true` — i valori pre-compilati sono i target del WOD anche dove c'è storico; `hold_max` (PR) e difficoltà restano comunque dell'utente. Assente/false: merge per indice (valori utente prima)
- I nomi variante devono essere quelli **canonici (italiani)** di exercises.json; varianti sconosciute vengono ignorate al caricamento
- Si carica col pulsante `★ Oggi` nella sess-bar: sostituisce il draft (con conferma se sporco), non salva nulla finché l'utente non preme Salva
- Se l'utente ha già usato la variante proposta per una station (ricerca a ritroso su **tutto lo storico**, `findLastDataForVariant`), i suoi dati prevalgono con **merge per indice dei set**: valore storico dove presente, target del WOD a riempire set vuoti o mancanti; i set dello storico non vengono mai tagliati (lunghezza = max). `hold_max` e difficoltà sempre dell'utente (il WOD riempie `hold_max` solo se assente). La nuova sessione normale invece pre-carica solo l'ultima salvata
- `set_time` personalizza il tempo per set mostrato nell'header del pair (default 30"); viene salvato con la sessione ed ereditato dai draft successivi
- `rest` (secondi): tempo di recupero mostrato nell'header del pair accanto al tempo di lavoro; opzionale, mostrato solo se presente. Salvato/ereditato come `set_time`
- `change_time` (secondi) + `mode` (`"alternato"` | `"sequenziale"`): metodo di esecuzione della coppia (`pairTimingHTML`). `alternato` = S1 lavoro › cambio › S2 lavoro › rest per N giri (sequenza a chip colorati, richiede 2 station); `sequenziale`/assente = N set di S1 poi N di S2 (riga compatta, comportamento storico). I tempi non sono timer attivi, solo indicazioni in header; l'input dei set è identico nei due metodi
- `modes` (oggetto keyed by px): override del metodo per zona. Valore = **stringa** (`"alternato"`/`"sequenziale"`, tutto il blocco) **o array** di N-1 valori (uno per giunzione tra esercizi consecutivi → metodo **misto**, es. `{"p0":["alternato","sequenziale"]}`)
- **Rendering a sotto-blocchi interlacciati** (`renderPairStep`): ogni sotto-blocco ha la sua **riga-chip** (`.chip-row`, sempre chip colorati) subito sopra le card a cui si riferisce. Superset (run collegati da `alternato`, anche 3) = UNA riga `×N giri · S1 › cambio › S2 › rest`; esercizio sequenziale = riga dedicata `×N set · lavoro › rest` sopra la sua card. Niente più riga compatta unica in cima
- **Tempi per esercizio**: una stazione del wod può avere `set_time`/`rest` propri (override dei globali), mostrati nella riga-chip del rispettivo blocco
- **wod.example.jsonc**: file di documentazione (NON caricato dall'app, JSON non ammette commenti) con tutti i parametri obbligatori/opzionali annotati; `wod.json` resta il file reale
- **Numero set di P0 (e di ogni station) dal wod**: con `force_num_sets` il conteggio righe segue i `sets` del wod (S3 su P0 appare solo se p0s1 ha 3 elementi). Default sessione nuova: p0s1 = 2, resto = 3 (`DEFAULT_SETS_BY_STATION`)
- Per cambiare l'allenamento del giorno: modificare wod.json e push (network-first, arriva subito a tutti)
- Le sessioni caricate da ★ Oggi si salvano con flag `wod: true`: appaiono nello storico col badge ★ WOD ma sono **escluse** da grafici progressi, delta, pre-compilazione (`getPrevSession`, `getLastSavedSession`, `findLastDataForVariant`) — pensato per i de-load. La numerazione resta unica. Il pulsante ★ nello storico (`toggleWodFlag`) converte WOD ↔ normale con conferma

### Rinominare una variante (migrazione)
I nomi variante sono chiavi nei dati localStorage: rinominarli in `exercises.json` spezza storico, delta e frecce. Per rinominare:
1. cambiare il nome in `exercises.json` (stessa posizione) e in `exercises.en.json`
2. aggiungere la coppia `'vecchio nome': 'nuovo nome'` in `LEGACY_VARIANT_MAP` (per station) in `index.html`
3. creare un nuovo flag di migrazione (es. `cali_variants_v4`) o azzerare quello esistente, e collegare la nuova mappa in `runVariantMigration()`
In v3.0.0 tutte le varianti sono state tradotte in italiano (flag `cali_variants_v3`); la migrazione gira su tutti gli utenti (`cali_sessions_*`), sugli import e sul draft temporaneo.

### Gruppi attuali
| station | gruppo | label |
|---------|--------|-------|
| p0s1 | handstand_s1 | Verticale 1 |
| p0s2 | handstand_s2 | Verticale 2 |
| p0s3 | handstand_s3 | Verticale 3 (opzionale) |
| — | handstand_skill / handstand_hold | pool varianti (skill / hold), senza station |
| p1s1 | p1_s1 | P1 — slot 1 |
| p1s2 | p1_s2 | P1 — slot 2 |
| — | tirata_verticale / gambe_anteriore | pool P1, senza station |
| p2s1 | p2_s1 | P2 — slot 1 |
| p2s2 | p2_s2 | P2 — slot 2 |
| — | spinta_orizzontale / core | pool P2, senza station |
| p3s1 | p3_s1 | P3 — slot 1 |
| p3s2 | p3_s2 | P3 — slot 2 |
| — | tirata_orizzontale / gambe_posteriore | pool P3, senza station |
| p4s1 | p4_s1 | P4 — slot 1 |
| p4s2 | p4_s2 | P4 — slot 2 |
| — | spinta_verticale / catena_posteriore | pool P4, senza station |

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

### Numero set dinamico
- Le righe set sono guidate dai dati: `numSetsFor(stationKey, exData)` = max(default station, set valorizzati nei dati, `num_sets`), cap `MAX_SETS` (6)
- Default per sessione vuota: `DEFAULT_SETS_BY_STATION` (p0s1: 2), tutto il resto `DEFAULT_NUM_SETS` (3) — vale anche per le isometrie (non più 6 righe fisse)
- Il WOD determina le righe tramite i set proposti; lo storico le estende dove ha più set reali
- Pulsante `+ set` sotto i set: incrementa `num_sets` nel draft (persiste con la sessione salvata)

### Metriche
- **reps**: input filate + cluster con pulsanti +/−. Label intensità sotto ogni set: `forza` (1–5), `ipertrofia` (6–20), `resistenza` (21+). Media rep/set nella barra totale.
- **time**: input secondi con pulsanti +/−. Hold max PR + target 65%. Totale colorato teal ≥50" / amber <50".

### Navigazione
- **Mobile**: swipe sinistra/destra per cambiare step (al cambio step si torna in cima alla pagina)
- **Desktop**: bottoni ‹ Indietro / Avanti › (rilevamento touch via `ontouchstart` + `pointer: fine`)
- **Chip P0…P4** (`renderStepDots`, ora chip toccabili): `jumpToStep(i)` salta a una postazione salvando prima lo step corrente
- **Anello P1–P4**: P0 (px `p0`) è fuori dall'anello, raggiungibile solo via chip; gli altri step formano un anello circolare (swipe avanti da P4 → P1). Logica in `ringInfo()` / `nextStep(cur, d)`; un separatore tra il chip P0 e P1 segna il confine. Pensato per la rotazione a postazioni in palestra
- **Salva ✓** è nella sess-bar accanto a ↺ Reset, sempre visibile da qualsiasi step (anche in modalità modifica)
- Nessun navigatore sessioni — solo pulsante ↺ Reset per ricominciare la sessione corrente
- ✎ nello storico apre la sessione in modalità modifica
- Voce `? Aiuto` nel menu utente: modale con guida rapida all'uso (`help-modal`); va tenuta aggiornata quando cambiano le funzionalità

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
- **Righe storico a due livelli**: variante in evidenza + nome gruppo piccolo sotto (niente "Gruppo (variante)" che andava a capo); colonna valori a destra con intensità/max in sub-riga. Una sola linea di separazione (le righe hanno border-bottom, gli header di pair nessun border)
- **Grafici progressi per variante**: mini-grafici di **densità** (intensità) raggruppati per categoria. Filtri: tutte / <b>anno</b> / <b>mese</b> / <b>attive</b>. Tap su un minigrafico → dettaglio con densità e lista delle sessioni filtrate (nessun scrub che blocca lo scrolling). Isometrie = Hold max, reps = Media reps/set.  
- **Delta nello storico**: confronta con l'ultima sessione precedente in cui è comparso lo **stesso esercizio** (qualsiasi slot), via `findPrevExForVariant`. La freccia ↑/↓ nello storico indica ancora il cambio esercizio **allo slot** rispetto alla sessione immediatamente precedente
- **Prefill / ★ Oggi**: `findLastDataForVariant` cerca la variante globalmente; al cambio variante nel form si caricano i dati storici (`onVariantChange`)
- **Label intensità**: basata sulla media rep/set, non sul totale (10×4=forza, non ipertrofia)
- **Pre-carica valori**: nuova sessione eredita variante e valori dalla sessione precedente
- **Modifiche sessione**: stessa UI di inserimento, header ambra `✎ modifica`

## Flusso di sviluppo
1. Modifiche su `index.html` (e/o `sw.js`, `exercises.json`) — **direttamente su `main`**, senza branch feature
2. Incrementare versioni come da regola sopra
3. Push: `git add . && git commit -m "vX.Y.Z: descrizione" && git push origin main`
4. Verifica deploy su GitHub Actions
5. Controllare versione live su `https://m3rlinux.github.io/cali-tracker/`
