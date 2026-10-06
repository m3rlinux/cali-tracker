# Archivio lezioni guidate

Questo archivio conserva le **scalette Classe** nell'ordine in cui sono state create. Serve per progettare lezioni successive con una progressione riconoscibile; non è letto dall'app, non contiene risultati individuali e non entra nel deploy GitHub Pages. La cartella resta visibile nel repository Git.

| N. | Scaletta | Stato / data | Continuità didattica |
| --- | --- | --- | --- |
| 1 | [Prima classe, 5 partecipanti](001-classe-5.json) | Svolta; data non comunicata | Due gruppi 3+2; rematore e goblet squat, piegamenti e stacco rumeno; finale affondi, mountain climber, bear crawl. L'istruttore ha riferito che è piaciuta. |
| 2 | [Classe full, 8 partecipanti](002-full-8-2026-10-07.json) | Prevista per 2026-10-07; svolgimento da confermare | Tre gruppi 3+3+2; rematore, stacco monopodalico e pike, poi piegamenti, pistol squat su box e hollow. Finale rivisto su tre giri. |

## Quando si progetta una nuova lezione

1. Leggere questo indice e le scalette JSON nell'ordine indicato. Confrontare schemi motori, difficoltà, esercizi, tempi, gruppi e finale; proporre continuità e una variazione gestibile.
2. Modificare `wod.json` per il WOD attivo. Per una lezione nuova, creare uno snapshot numerato con `metadata` e la sola `class_lesson`. Se la lezione è ancora pianificata, aggiornare il suo snapshot quando cambia il WOD; dopo lo svolgimento non sovrascriverlo.
3. Aggiornare la tabella e registrare il feedback effettivo del coach. Segnare una lezione come `completed` e valorizzare `performed_on` solo quando lo svolgimento e la data sono confermati. Non inventare progressi, presenze o carichi.
4. Tenere `wod-archive/` fuori dalla lista `cp` in `.github/workflows/pages.yml` e dagli `ASSETS` di `sw.js`. Solo `wod.json` è il WOD caricato da ★ Oggi.

Il numero di sequenza indica l'ordine delle proposte, non una data di svolgimento certa.
