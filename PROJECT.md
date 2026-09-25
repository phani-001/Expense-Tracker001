# Expense Tracker — Project Brief

## Purpose
A personal expense tracker where adding an expense is fast: scan a barcode or photograph an item, receipt, or shelf tag, review the auto-extracted details, and save. Manual entry is always available. A clean, responsive dashboard shows spending at a glance.

## My notes (fill in)
<!-- Problem being solved, who uses it, extra features, things already decided, things to avoid. -->
-

## Scope (v1)
- Add expense via: barcode scan (live camera), photo upload, or manual entry
- Extract item, price, quantity, category, purchase date, expiry date where possible
- Always show an editable review form before saving. Empty fields are highlighted.
- Dashboard, expense list with search and filters, expiry-soon list
- Edit and delete expenses

## Non-goals (v1)
Budgets and alerts, multi-currency, multi-user or login, receipt line-item splitting, export, recurring expenses.

## Capture flow
1. User opens **Add** and chooses Scan, Photo, or Manual.
2. **Scan:** the barcode is decoded in the browser. `GET /lookup/{barcode}` queries Open Food Facts for name, brand, category. Price and expiry stay blank.
3. **Photo:** the image is resized client-side (max 1280px, under 1MB) and sent to `POST /extract`, which calls a vision model and returns prefill JSON.
4. The review form opens prefilled. User edits and saves via `POST /expenses`.
5. **Manual:** the same form, empty.

### Extractor rules
- Return JSON only: `{item, price, quantity, category, expiry_date, purchase_date, confidence}`. Unknown fields are null.
- Never guess a price. Prefer the printed selling price or MRP.
- Parse date formats `DD/MM/YY`, `MM/YYYY`, and "best before N months" (only if the manufacture date is visible).
- Provider is swappable behind `services/extractor/base.py`. Default provider: Groq vision. Model ID from `.env`.

## Architecture
```
PWA (React) -> FastAPI -> SQLite
                 |-> Open Food Facts (barcode lookup, cached)
                 |-> Groq vision (image -> JSON)
```
Barcode decoding is client-side (`BarcodeDetector`, ZXing fallback).

## Data model
```
expenses
  id, item, price_paise, quantity, category_id,
  purchase_date, expiry_date NULL, barcode NULL,
  image_path NULL, source (scan|photo|manual),
  notes NULL, created_at, updated_at

categories
  id, name, color, icon
  seed: Groceries, Dining, Transport, Health, Household, Other

barcode_cache
  barcode, name, brand, category, fetched_at
```
Monthly totals and expiring-soon are computed queries, not stored.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/extract` | image -> prefill JSON |
| GET | `/lookup/{barcode}` | product info |
| GET, POST | `/expenses` | list (filter by date, category, search), create |
| PATCH, DELETE | `/expenses/{id}` | edit, delete |
| GET | `/stats/summary?month=` | totals, this vs last month |
| GET | `/stats/by-category?month=` | donut data |
| GET | `/stats/trend?range=` | daily or weekly series |
| GET | `/expenses/expiring?days=7` | expiring soon |
| GET, POST | `/categories` | list, add |

## Screens
1. **Dashboard:** stat cards (this month, vs last month, item count), category donut, spend trend, expiring-soon list, recent expenses.
2. **Add:** bottom sheet with Scan / Photo / Manual, then the review form.
3. **Expenses:** searchable list, category and date filters, edit and delete.
4. **Settings:** categories, currency, provider status.

Layout: mobile-first with a bottom nav and a centered floating Add button. Desktop uses a left sidebar and a two-column dashboard grid. Light and dark themes, one accent color.

## Folder structure
```
expense-tracker/
  GEMINI.md
  PROJECT.md
  backend/
    app/
      main.py, db.py, models.py, schemas.py
      routers/   expenses.py stats.py extract.py lookup.py categories.py
      services/  extractor/ (base.py, groq.py)  off.py
    uploads/     (gitignored)
    .env         (GROQ_API_KEY, GROQ_VISION_MODEL)
  frontend/
    src/  pages/ components/ lib/api.ts lib/scan.ts
  fixtures/      (sample photos for extractor testing)
```

## Build phases
1. Backend: models, CRUD, stats endpoints, tests
2. Frontend shell: dashboard, expense list, manual add form
3. Barcode scan and Open Food Facts lookup
4. Photo extraction via Groq, resize-before-upload, review form
5. PWA manifest, expiry list, loading and error states

## Decisions
- Single-user, no login
- INR stored as integer paise
- Original photos kept on local disk in `backend/uploads/` (toggleable later)
- Local development first. Phone camera testing needs HTTPS (tunnel or deploy).

## Open items
- Hosting target
- Anything added under "My notes"
