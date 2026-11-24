# DataLens

A privacy-first CSV explorer. Drop a spreadsheet in the browser and get a sortable table, summary statistics and a grouped bar chart instantly.

## Features

- **CSV parsing** with quoted fields, escaped quotes, CRLF and BOM handling
- **Summary cards** — rows, columns, detected numeric fields and totals
- **Search across all columns**, click-to-sort headers and incremental "show more"
- **Grouped bar chart** — pick any numeric column, grouped by the first text column
- **Drag & drop** or file picker, plus a built-in sample dataset
- **Dark mode** and responsive layout
- **100% local** — no upload, no account, no dependencies

## Run it

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

Opening `index.html` directly also works in most browsers.

## Privacy & limits

The last loaded CSV is stored in `localStorage` so it survives a reload. Large files may exceed browser storage limits — in that case the data still works for the current session and simply is not persisted. Nothing is ever sent to a server.

## Stack

HTML5, CSS custom properties and vanilla JavaScript (including a small in-file CSV parser).

## License

MIT — see [LICENSE](LICENSE).
