# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STARWEK ERP PARFUM — a web ERP application for a perfume distributor/wholesaler. Built on a Laravel 12 + Inertia.js + React 19 stack. The app locale is Indonesian (`id`).

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | Inertia.js 2, React 19, Vite 7 |
| CSS | Tailwind CSS 4 |
| Icons | @tabler/icons-react |
| Client state | Zustand |
| Tables | @tanstack/react-table |
| Notifications | react-hot-toast |
| Animations | framer-motion |
| PDF export | barryvdh/laravel-dompdf |
| Excel export | maatwebsite/excel |
| JS routing | Ziggy |
| Async selects | react-select |

## Commands

```bash
# Full-stack dev (Laravel serve + queue listener + logs + Vite HMR)
composer run dev

# Frontend only
npm run dev

# Production build
npm run build

# PHP tests (SQLite :memory:)
composer run test

# Single test
php artisan test --filter=TestClassName

# Fresh migration + seed
php artisan migrate:fresh --seed

# PHP lint (Laravel Pint)
./vendor/bin/pint

# Install everything (composer + npm + migrate + build)
composer run setup
```

Tests use SQLite in-memory (`:memory:`) — no separate test database needed. The `composer run test` command clears config cache before running.

## High-Level Architecture

### Request Flow

```
Browser → Laravel route → Middleware stack → Controller → BusinessService → Eloquent Model → DB
                ↓
         Inertia::render('PageComponent', props)
                ↓
         React SPA (app.jsx → lazy-resolved page component)
```

Every page is rendered by Inertia on first visit; subsequent navigation is client-side SPA via Inertia links. The root Blade template is [resources/views/app.blade.php](resources/views/app.blade.php). No SSR — fully client-rendered.

### Route Organization

All admin routes live under `/admin` prefix with `auth` and `menu.access` middleware in [routes/web.php](routes/web.php). Key patterns:

- **Auth** — `guest` middleware for login; `POST /login` has signature + SQL/XSS guards + throttle:5,1
- **Master data** — polymorphic: `MasterController` handles 6 resource types (`brand`, `gudang`, `supplier`, `customer`, `sales`, `botol`) via `/{resource}` route param, each mapped in `BusinessService::MASTERS`
- **Barang Bibit** — separate controller due to complex create/update logic (bottle association, stock constraints)
- **Inventory** — `InventoryController` for stock view, low stock, and mutations
- **Transactions** — `TransactionController` for purchases (`/pembelian`) and sales (`/penjualan/{type}` where type = retail|grosir|sales)
- **Finance** — `FinanceController` for debts, receivables, and supplier receivables
- **Reports** — `ReportController` serves 10 report types via `/laporan/{type}`
- **Kas** — `KasController` for manual cash entries (in/out)
- **Utility** — `UtilityController` for store closing (tutup toko)

### The BusinessService (Critical File)

[app/Services/Business/BusinessService.php](app/Services/Business/BusinessService.php) is the **single source of all business logic** (~794 lines). It handles:

- Master data CRUD with auto-generated codes (e.g., `BRD-0001`, `SUP-0001`)
- Stock management with **bottle inventory tracking** (`replaceStock`, `createStockMutation`)
- Purchase orders with ML/Liter/Botol/Dus unit conversion, bottle purchases, debt creation
- Sales transactions (retail and grosir/sales) with automatic **COGS calculation** and profit tracking
- Cash ledger (`KasMutasi`) automatically updated on purchases, sales, debt payments, and manual entries
- Debt/receivable payments and status transitions (`BELUM_LUNAS → SEBAGIAN → LUNAS`)
- Store closing (tutup toko) with daily financial summary and system date advancement
- **Operational date** concept: `SystemDate` table (`tp_system`) stores the current business date which can differ from the actual calendar date — all transactions use `operationalDate()`

**When modifying any business flow, start here.** Controllers are thin wrappers that call into this service. The service methods use `DB::transaction()` for multi-table writes and `lockForUpdate()` for concurrent-safety on bottle stock.

### Controller Base Class

All controllers extend [app/Http/Controllers/Controller.php](app/Http/Controllers/Controller.php), which:

1. Injects `EncryptService` as `$this->encrypt` — needed for PII fields (email, phone)
2. Provides `uppercase(array $data)` — recursively uppercases all string values in validated input before passing to services

### EncryptService — PII Encryption

[app/Services/EncryptService.php](app/Services/EncryptService.php) encrypts and decrypts PII fields (email, phone) using a custom ASCII-shift cipher with a hardcoded key. **Important rules:**

- **ALWAYS** encrypt email and phone before storing in the database
- **ALWAYS** decrypt before displaying to the user
- Methods: `doEncrypt(mixed $data, array $ignore = [])` and `doDecrypt(mixed $data, array $ignore = [])`
- The key is hardcoded in the service — do not change it without re-encrypting all existing data
- `doDecrypt` auto-detects primitive types (int, float, bool, string) — decrypted numeric strings are cast back to their original type

### Database Table Conventions

| Prefix | Meaning | Example |
|--------|---------|---------|
| `tm_*` | Master/parameter tables | `tm_barang_bibit`, `tm_brand`, `tm_users` |
| `tt_*` | Transaction tables | `tt_stok_gudang`, `tt_pembelian`, `tt_mutasi_stok` |
| `tp_*` | System parameter tables | `tp_system` (operational date) |

All business models live in `App\Models\Business\*`. User model uses `tm_users` table in `App\Models\User`.

### Database Schema — Key Entities

```
tm_wangi          # Scent catalog (currently unused — id_wangi removed from barang_bibit)
tm_brand          # Brands
tm_botol          # Bottle types (varian_ml, isi_per_dus, pricing, stock_botol)
tm_gudang         # Warehouses
tm_supplier       # Suppliers (with pic_name)
tm_customer       # Customers (RETAIL or SALES type, with limit_piutang)
tm_sales          # Sales representatives
tm_barang_bibit   # Items/raw materials (links to brand + botol, has ML pricing tiers)
tm_users          # User accounts (with akses_menu JSON array)

tt_stok_gudang    # Per-warehouse, per-item stock (unique: id_gudang + id_barang)
tt_mutasi_stok    # Stock mutation log (MASUK/KELUAR with before/after snapshots)
tt_pembelian      # Purchase orders (with discount, jumlah_bayar, total_qty_botol)
tt_pembelian_detail # Purchase line items (tipe_item: BIBIT/ABSOLUTE/BOTOL)
tt_penjualan      # Sales orders (with manual_customer_name, total_modal, laba_kotor, discount)
tt_penjualan_detail # Sales line items (subtotal_modal, subtotal_jual, laba_kotor, discount)
tt_hutang         # Supplier debts (linked to pembelian, nullable since manual hutang exists)
tt_piutang        # Customer receivables (linked to penjualan)
tt_piutang_supplier # Supplier receivables (standalone, not linked to transactions)
tt_kas_mutasi     # Cash ledger (MASUK/KELUAR with running saldo_akhir)
tt_toko_closing   # Daily store closing records

tp_system         # SystemDate row (id=1, tanggal_system for operational date)
```

**Key relationship note:** `BarangBibit` was originally linked to `tm_wangi` via `id_wangi`, but this was removed in migration `2026_06_20`. The `tm_wangi` table still exists but is currently unused.

### Model Relationships

- `Pembelian` belongsTo `Supplier`, belongsTo `Gudang`; hasMany `PembelianDetail`; hasOne `Hutang`
- `Penjualan` belongsTo `Customer` (nullable), belongsTo `Sales` (nullable), belongsTo `Gudang`; hasMany `PenjualanDetail`; hasOne `Piutang`
- `BarangBibit` belongsTo `Brand`, belongsTo `Botol` (nullable); hasMany `StokGudang`
- `PembelianDetail` / `PenjualanDetail` — `id_barang` is nullable (item can be BOTOL type referencing `tm_botol` directly)

### Security Middleware Stack

Four custom middleware registered as aliases in [bootstrap/app.php](bootstrap/app.php):

1. **`request.signature`** (`VerifyRequestSignature`) — Validates `X-Timestamp`, `X-Nonce`, `X-Signature` headers. Uses SHA-256 HMAC with CSRF token binding and nonce replay protection (300s cache). 5-minute timestamp tolerance. The frontend auto-attaches these via an Axios interceptor in [resources/js/bootstrap.js](resources/js/bootstrap.js).

2. **`sql.injection.guard`** (`PreventSqlInjection`) — Regex-based SQL injection pattern detection on request input.

3. **`xss.guard`** (`PreventXss`) — Regex-based XSS pattern detection.

4. **`menu.access`** (`EnsureUserHasMenuAccess`) — Route-to-access-key mapping. Users have an `akses_menu` JSON array column; `superadmin` role bypasses all checks. The middleware maps route names to access keys (e.g., `business.penjualan.index` with type `grosir` → `penjualan-grosir`).

Patterns and whitelisted fields are in [config/security_guards.php](config/security_guards.php). **Edit patterns there, never hardcode in middleware.**

### Menu System

Sidebar menu defined in [resources/js/components/menu/index.jsx](resources/js/components/menu/index.jsx). Each menu item has an `accessKey` corresponding to values in the user's `akses_menu` array. The frontend filters the sidebar by matching these keys.

Available access keys (from seed data):
`dashboard`, `master-brand`, `barang-bibit`, `master-gudang`, `master-supplier`, `master-customer`, `master-sales`, `master-botol`, `users`, `user-access`, `stok-gudang`, `mutasi-stok`, `stok-menipis`, `pembelian`, `penjualan-retail`, `penjualan-grosir`, `hutang`, `piutang`, `piutang-supplier`, `laporan-*` (10 report types), `riwayat-pembelian`, `riwayat-penjualan`, `utility`.

### Payment Methods & Debt Lifecycle

| Method | Stored As | Cash Recorded | Debt Created |
|--------|-----------|--------------|--------------|
| `CASH` | CASH | Full amount immediately | No |
| `TRANSFER` | TRANSFER | Full amount immediately | No |
| `TEMPO` | TEMPO | None | Yes (full amount) |
| `DP` | TEMPO | Partial (jumlah_bayar) | Yes (remaining) |

Debt status transitions: `BELUM_LUNAS` → `SEBAGIAN` → `LUNAS` (tracked by `total_bayar` / `sisa_hutang` or `sisa_piutang`).

### Unit Conversion System

The `BusinessService` handles conversions between these units:
- `ML` (base unit for liquids, 1:1)
- `LITER` = 1000 ML
- `BOTOL` = the bottle's `varian_ml` capacity
- `DUS` = `isi_per_dus` × bottle count

Key methods: `convertToMl()`, `literToMl()`, `mlToLiterMl()`, `dusToBotol()`, `botolToDusBotol()`.

### Frontend Structure

```
resources/js/
├── app.jsx                  # Inertia app entry, lazy page resolution via import.meta.glob
├── bootstrap.js             # Axios setup + security header interceptor (SHA-256 signing)
├── admin/business/          # Page components (one per module)
│   ├── _components.jsx      # Shared UI: PageHeader, Card, Field, Select, SimpleTable, etc.
│   └── formatters.js        # IDR formatting, date formatting
├── admin/datamaster/users/  # User management (index, form, table, access)
├── components/
│   ├── common/              # DataTable, Modal, Button, ThemeSwitcher, Tooltip, IconPicker
│   ├── input/               # AsyncSelectInput, ImageUpload, RenderTextInput, RenderTextArea, ToggleCheckbox
│   ├── layouts/             # ProtectedLayout, PublicLayout, Sidebar, Navigation
│   ├── ui/                  # Avatar, Badge, Progress, Table
│   └── menu/index.jsx       # Sidebar menu definition
├── store/                   # Zustand: themeStore (dark/light), sidebarStore, modalStore, loadingStore
└── utils/                   # encrypt helpers, humanize numbers, isMobile detection, localStorage wrappers
```

Pages are resolved by Inertia using `resolvePageComponent` with `import.meta.glob` — the page component path maps directly from the Inertia render call (e.g., `Inertia::render('admin/business/MasterPage')` → `resources/js/admin/business/MasterPage.jsx`).

The Vite `@` alias points to `resources/js/`.

### Receipt Pattern

After creating a purchase or sale, `TransactionController` builds a `receipt` flash data payload via `receiptPayload()`. This is rendered in the frontend as a printable nota (receipt) with all line items, prices, discounts, and totals. The payload structure differs between pembelian and penjualan (different fields for supplier vs customer, buy vs sell prices, COGS).

### Report Export

[app/Exports/ReportExport.php](app/Exports/ReportExport.php) handles Excel and PDF exports for all report types. PDF templates live in [resources/views/exports/](resources/views/exports/).

## Key Business Rules

- **Bottle-stock coupling**: Each `BarangBibit` can be linked to a `Botol`. Stock movements in ML are tracked against bottle inventory — adding stock consumes empty bottles, removing stock returns them. Bottle changes are blocked when stock exists.
- **Unit conversion**: Purchases and sales support ML, Liter, BOTOL, and DUS units with automatic conversion.
- **System date**: All transactions use the operational date from `SystemDate` (row id=1 in `tp_system`), not `now()`. Store closing advances this date by one day.
- **Email/phone encryption**: Always encrypt PII fields via `EncryptService` before storing; decrypt before display.
- **Validation messages are in Indonesian** — each controller defines `validationMessages()` returning ID-locale error strings. All validated input is uppercased via `$this->uppercase()` before reaching the service layer.
- **Retail sales cannot use TEMPO/DP payment** — enforced in the controller, not the service.
- **Sales types**: `RETAIL` is the default; `GROSIR` and `SALES` are treated identically as "sales" in the UI routing (both map to the `grosir` access key).

## Test Accounts (from `DatabaseSeeder`)

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `sw` | `startw33k` | superadmin | All menus |
| `testuser` | `password` | admin | Limited subset (retail sales, customer master, etc.) |

The seeder also creates sample brands (Maison A, Aroma Lab), a warehouse (Gudang Utama), a supplier, two customers, one sales rep, two barang bibit items, and six bottle types (50ml–5L).

## Component Reuse Rules

Before creating a new component, check:
- `resources/js/components/common/`
- `resources/js/components/input/`
- `resources/js/components/layouts/`
- `resources/js/components/ui/`

If an existing component covers ≥70% of the need, extend via props rather than duplicating. New reusable components belong in the appropriate category folder.
