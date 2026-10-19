# Archivio lezioni guidate

Questo archivio conserva le **scalette Classe** nell'ordine in cui sono state create. Serve per progettare lezioni successive con una progressione riconoscibile; non è letto dall'app, non contiene risultati individuali e non entra nel deploy GitHub Pages. La cartella resta visibile nel repository Git.

| N. | Scaletta | Stato / data | Continuità didattica |
| --- | --- | --- | --- |
| 1 | [Prima classe, 5 partecipanti](001-classe-5.json) | Svolta; data non comunicata | Due gruppi 3+2; rematore e goblet squat, piegamenti e stacco rumeno; finale affondi, mountain climber, bear crawl. L'istruttore ha riferito che è piaciuta. |
| 2 | [Classe pianificata, 5 partecipanti](002-classe-5-2026-10-07.json) | Prevista per 2026-10-07; svolgimento e presenze da confermare | Tre gruppi 2+2+1; rematore, stacco monopodalico e pike, poi piegamenti, pistol squat su box e hollow. Timer sincronizzato: 2 serie per postazione, 90 s lavoro / 60 s recupero, 90 s cambio. Finale su tre giri. |
| 3 | [Classe pianificata, 7 partecipanti](003-classe-7.json) | Pianificata; data da confermare | Gruppi 3+2+2; continuita su rematore, piegamenti e anca, variazione con split squat e core laterale. Tre serie per postazione, 40 s lavoro / 60 s recupero, 60 s cambio. Finale torsione in ginocchio + squat, passo sotto + ponte a un braccio, calcio frontale. Nessun progresso individuale presunto. |
| 4 | [Lezione A, 3 partecipanti](004-classe-3-2026-10-19.json) | Prevista per 2026-10-19; svolgimento e presenze da confermare | Ripresa del pike della proposta 2 con entrata/uscita e spinta scapolare, tre esercizi handstand tutti insieme senza gruppi; continuità su rematore, piegamenti, anca e core. Una coppia e un singolo in rotazione su quattro postazioni X/Y, due serie per esercizio; aggiunti calf raise e scapular pull-up assistito, finale squat. Durata 50 minuti. Nessun progresso individuale presunto. |

## Quando si progetta una nuova lezione

1. Leggere questo indice e le scalette JSON nell'ordine indicato. Confrontare schemi motori, difficoltà, esercizi, tempi, gruppi e finale; proporre continuità e una variazione gestibile.
2. Modificare `wod.json` per il WOD attivo. Per una lezione nuova, creare uno snapshot numerato con `metadata` e la sola `class_lesson`. Se la lezione è ancora pianificata, aggiornare il suo snapshot quando cambia il WOD; dopo lo svolgimento non sovrascriverlo.
3. Aggiornare la tabella e registrare il feedback effettivo del coach. Segnare una lezione come `completed` e valorizzare `performed_on` solo quando lo svolgimento e la data sono confermati. Non inventare progressi, presenze o carichi.
4. Tenere `wod-archive/` fuori dalla lista `cp` in `.github/workflows/pages.yml` e dagli `ASSETS` di `sw.js`. Solo `wod.json` è il WOD caricato da ★ Oggi.

Il numero di sequenza indica l'ordine delle proposte, non una data di svolgimento certa.
