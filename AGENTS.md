# Repository Guidelines

## Project Structure & Module Organization

The ERP Parfum application lives in `sw-parfume-app/`. Paths below are relative to that directory.

- `app/Http/Controllers/` handles requests; `app/Services/` contains business logic; `app/Models/` contains Eloquent models.
- `routes/web.php` defines web routes. Database migrations and seeders live in `database/`.
- `resources/js/admin/` and `resources/js/public/` contain Inertia/React pages. Shared components live in `resources/js/components/`, Zustand stores in `resources/js/store/`, and frontend assets in `resources/js/assets/`.
- `tests/Feature/` covers application workflows; `tests/Unit/` contains unit tests. `public/build/` is generated output.

## Build, Test, and Development Commands

Run commands from `sw-parfume-app/`, always through `rtk` (use `rtk proxy` for unsupported commands).

- `rtk composer run setup`: installs dependencies, creates `.env`, generates the application key, runs migrations, and builds assets. Configure the local database first.
- `rtk npm run dev`: starts Laravel on port 8000 and Vite on port 5173.
- `rtk composer run dev`: starts Laravel, Vite, the queue listener, and log streaming.
- `rtk npm run build`: builds production frontend assets.
- `rtk php artisan test --filter=InventoryFlowTest`: runs focused tests.
- `rtk composer run test`: clears cached configuration and runs the complete PHP suite when needed.

## Coding Style & Naming Conventions

Follow `.editorconfig`: four spaces, UTF-8, LF endings, and a final newline; YAML uses two spaces. Use PascalCase for PHP classes and React components, and follow neighboring filename conventions. Format PHP with Laravel Pint: `rtk proxy vendor/bin/pint --dirty`.

Keep controllers thin and reuse existing shared React components through props. Preserve database prefixes: `tm_*` for master data, `tt_*` for transactions, and `tp_*` for system parameters.

## Testing Guidelines

PHPUnit 11 runs with SQLite in memory through `phpunit.xml`. Name tests `*Test.php` and cover changed behavior, especially inventory and transaction flows. Run relevant tests first. No numeric coverage threshold or frontend test script is configured.

## Commit & Pull Request Guidelines

History uses short action summaries, with occasional `feat:` prefixes and inconsistent capitalization. Prefer concise, scoped subjects such as `fix: correct bottle stock calculation`. PRs should describe the problem, affected modules, verification commands, and linked issues; include screenshots for UI changes and migration notes when applicable.

## Configuration & Agent Workflow

Use `.env.example` for local configuration; never commit secrets. Narrow searches before reading files, make minimal patches, and avoid dependency, cache, and generated directories. Inspect diff summaries before reviewing individual changed files.
