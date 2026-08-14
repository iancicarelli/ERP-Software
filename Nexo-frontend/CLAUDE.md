# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where this fits

`Nexo-frontend/` is one service of a three-service monorepo:

```
ERP-Software/                 ← repo root, docker-compose lives here
├── Nexo-frontend/            ← THIS package — Reflex admin panel
├── Nexo-backend/             ← NestJS 11 + Prisma 6 + PostgreSQL 16
└── ROADMAP.md                ← build plan, API contract, phase status
```

**`ROADMAP.md` at the repo root is the source of truth for the API contract** (§3) and for
what the backend does and does not implement yet (§5). Read it before assuming an endpoint
exists — several modules the frontend calls are still unbuilt.

## Commands

The normal way to run everything is from the **repo root**, not from here:

```bash
docker compose up            # db + backend + frontend, hot-reload on all three
docker compose up -d --build frontend   # rebuild after touching requirements.txt
```

Standalone (needs a backend reachable at `API_BASE_URL`):

```bash
pip install -r requirements.txt
reflex init                  # first time only
reflex run
```

Configuration comes from the **root** `.env` (`Nexo/Nexo.py` calls `load_dotenv` on
`parents[1]/.env` before importing Reflex). The only variable this package reads is:

```
API_BASE_URL=http://backend:3001/api      # inside compose; http://localhost:3001/api outside
```

`config/settings.py` falls back to `http://localhost:8000/api` when unset — a leftover
default from the old Django backend. If requests fail with connection errors, that fallback
is usually why.

## Architecture Overview

This is a **Reflex** (Python-based full-stack framework) admin panel. Reflex compiles Python
into a React/Next.js app served by a Python backend. Pages, state, and components are all
written in Python.

- **Reflex version**: `0.8.24.post1` (see `requirements.txt`).
- **Config**: `rxconfig.py` — app name **`Nexo`**, plugins `SitemapPlugin` + `TailwindV4Plugin`.
- **Backend contract**: **NestJS with a Django-REST-Framework compatibility layer.** The
  frontend was written against a Django backend and the new backend reproduces its shapes
  rather than the reverse: list endpoints are paginated with `?page=&page_size=` and return
  `{count, next, previous, results}`; validation errors come back as `{field: [messages]}`;
  everything else as `{detail: "…"}`. Count-only queries use `limit=1` and read `count`.
  `format=json` is accepted and ignored. Field names are `snake_case` throughout, **except**
  the payment filters, which are camelCase (`entryDate_after`, `fiscalYear`) — that is
  deliberate, the frontend sends them that way.

### Modules & Routes

| Module | Route(s) | Table state | Detail state |
|--------|----------|-------------|--------------|
| Dashboard / Landing | `/` | `IndexState` (+ `index_*_state.py`) | — |
| Management menu | `/management` | — | — |
| Clientes | `/client`, `/client/detail`, `/client/add` | `ClientTableState` | `ClientDetailState`, `ClientAddState` |
| Servicios | `/service`, `/service/detail`, `/service/add` | `ServiceTableState` | `ServiceDetailState` |
| Órdenes de trabajo | `/orders`, `/order/detail`, `/order/add` | `OrdersTableState` | `OrderDetailState`, `OrdersAddState`, `OrderNotasState` |
| Pagos | `/payments` | `PaymentTableState` | — |
| Transferencias | `/transfers` | `TransferTableState` | `TransferAssignClientState` |
| Direcciones | `/direction/detail`, `/direction/add` | `DirectionTableState` | `DirectionDetailState` |
| Métricas | `/metrics`, `/tickets` | — | — |
| Login / 404 | `/login`, `/404` | `AuthState` | — |

Pages are registered in **`Nexo/Nexo.py`** via `app.add_page(...)`.

`/metrics` and `/tickets` are **placeholders**. The previous version embedded Grafana panels
with hardcoded URLs; those were removed and nothing replaced them yet (ROADMAP Fase 12).

### Directory Structure

```
Nexo/
├── Nexo.py                   # App entry point — loads root .env, registers all pages
├── template.py               # Shared layout (sidebar + content wrapper + error banner)
├── config/                   # settings.py (API_BASE_URL) and per-entity filter/detail configs
│   └── utils/                # Static lookup tables kept client-side (bancos, elementos_map…)
├── dtos/                     # Pydantic models used as typed state containers
├── states/                   # Reflex state classes (all business logic and API calls)
├── pages/                    # Page components decorated with @rx.page(route=...)
├── components/               # Reusable UI components (forms, tables, filters, buttons…)
└── utils/                    # generic_form_utils.py — field generation, normalization
```

`states/` is organized by role, not only by entity:

```
states/
├── api/         api_state.py            — fetch_with_auth(), shared httpx client
├── login/       login_state.py          — AuthState, JWT in LocalStorage
├── base/        base_actions_state.py   — selection + bulk-action scaffolding
├── clients/     page_state.py           — PaginatedState (shared, despite living here)
├── table/       table_state.py, filterable_table_state.py
├── detail/      generic_detail_state.py
├── cache/       cache_signal_state.py
├── filters/     filter_state.py         — sector/zona filter options
├── relations/   dropdown_state.py, client_dropdown_state.py, order_dropdown_state.py
├── index/       index_state.py + 5 sub-states + dashboard_semaphore.py
└── <entity>/    clients, service, work_orders, payments, transfers, addresses
```

⚠️ `PaginatedState` lives in `states/clients/page_state.py` for historical reasons but is
shared by every table state. Don't let the path mislead you.

### State Hierarchy

All state classes ultimately inherit from `rx.State`:

```
rx.State
└── AuthState (login/login_state.py)   — JWT tokens in LocalStorage, login/logout/refresh
    └── APIState (api/api_state.py)    — fetch_with_auth(): HTTP calls, auto-refresh on 401
        ├── PaginatedState             — page, page_size, total_count, _has_more
        │   └── BaseTableState         — _perform_load(), caching, transform_item()
        │       └── FilterableTableState — filter_values, active_filter_keys
        │           └── <Entity>TableState (e.g., ClientTableState)
        ├── GenericDetailState         — _load_by_id(), _update_field(), _toggle_bool()
        │   └── <Entity>DetailState (e.g., ClientDetailState, DirectionDetailState)
        ├── BaseActionsState           — selected_ids, select_all_mode, bulk payloads
        │   └── <Entity>ActionsState (client, order, payment, transfer)
        ├── FilterState                — sector/zona options for filter dropdowns
        ├── IndexState                 — dashboard aggregator (SWR ClassVar cache)
        └── DropdownState / ClientDropdownState / OrderDropdownState — relational selects
```

`CacheSignalState` is a separate `rx.State` that tracks mutation timestamps per endpoint.
Table states check it to invalidate their in-memory cache after a write operation.

`AuthState` itself extends `rx.State` directly and is the root of the hierarchy. It is the
**only** state that bypasses the shared `APIState._http_client` (using it would be a circular
import, since `APIState` is its child). Instead it owns its **own persistent client** at
`ClassVar` level via `get_auth_client()` (`max_connections=5`, `max_keepalive_connections=3`,
10s timeout) — `do_login`/`verify_token`/`do_refresh` reuse it for keep-alive. `verify_token`
also decodes the JWT `exp` claim **locally** (`_decode_jwt_exp`, stdlib `base64`+`json` only,
no signature check) and only hits `POST /token/verify/` as a fallback when the token is
unreadable — a fresh token returns without network, near-expiry/expired calls `do_refresh()`
directly. Signature validation belongs to the backend (enforced on every real request via
`fetch_with_auth`'s 401 handling).

⚠️ **The 401-vs-403 contract.** `fetch_with_auth()` only triggers the auto-refresh on **401**.
The backend's `JwtAuthGuard` therefore raises `UnauthorizedException` explicitly on every
rejection path instead of returning `false` (which would make Nest emit 403). If a protected
page starts rendering empty instead of refreshing, check the status code before touching the
frontend — see ROADMAP §3.3.

### Data Flow Pattern

1. **DTOs** (`dtos/`) are Pydantic `BaseModel` subclasses that hold entity data as typed state vars.
2. **Table states** extend `FilterableTableState`, override `get_endpoint()`, `transform_item()`,
   `set_items()`, and `get_filter_config()`. They call `_perform_load()` which fetches paginated
   data from the API.
3. **Detail states** extend `GenericDetailState`, override `get_entity_name()`, `get_dto_class()`,
   `get_endpoint()`. They implement `save_entity()` (PUT) and `add_entity()` (POST), and call
   `CacheSignalState.invalidate()` after mutations.
4. **Pages** use `@rx.page(route=..., on_load=[AuthState.verify_token, ...])` and wrap content
   with `template()`.
5. **Config files** in `config/` define filter configurations (type, label, options) and field
   groupings for detail forms.

### Adding a New Entity

1. Create a DTO in `dtos/<entity>/`.
2. Create a table state in `states/<entity>/` extending `FilterableTableState`.
3. Create a detail state in `states/<entity>/` extending `GenericDetailState`; implement
   `save_entity()` and `add_entity()`.
4. Create a filter config in `config/` if the table needs filters.
5. Create page components in `pages/` using `template()` and `@rx.page()`.
6. Register the pages in `Nexo/Nexo.py`.

### Key Patterns

- **Authentication guard**: Every protected page includes `AuthState.verify_token` in `on_load`.
  `AUTH_BYPASS` in `login_state.py` must stay `False` — it exists only for offline UI work.
- **Cache invalidation**: After any write (POST/PUT/DELETE), call
  `yield CacheSignalState.invalidate("/endpoint/")` so sibling table states reload on next access.
- **Form fields**: `generate_auto_fields(DTOClass, exclude=[...], overrides={...})` in
  `utils/generic_form_utils.py` auto-generates field configs from DTO annotations.
- **Field updates**: Use `_update_field()` for text/dates, `_update_value()` for type-coerced
  numbers, `_toggle_bool()` for booleans.
- **Navigation to detail views**: Set entity on state first, then `rx.redirect("/route")`.
  Detail pages call `redirect_if_empty()` on load to guard against direct URL access.
- **Network error surfacing**: `APIState` holds an `api_error: str` state var.
  `fetch_with_auth()` clears it before each request and sets it in its two `except` blocks
  (network / unexpected). `template.py`'s `error_banner()` renders a dismissible red
  `rx.callout` (`rx.cond(APIState.api_error != "", ...)`, close button → `clear_api_error()`)
  above every protected page's content. The banner auto-clears on the next successful request.
  Set `api_error` only for transport failures, not business-logic errors (those use per-page
  `error`/`error_message` vars).

---

### Dashboard / Landing (`/`)

`IndexState.load_stats()` fans out to 5 sub-states (`IndexClientState`, `IndexOrdersState`,
`IndexServiceState`, `IndexPaymentState`, `IndexTransferState`). Each sub-state issues **one
count request per metric** (`limit=1`, read `count`), throttled by a global
`asyncio.Semaphore(10)` (`states/index/dashboard_semaphore.py`). This totals **~37 HTTP
requests** for a cold dashboard load. (The semaphore was raised 5→10 as a temporary patch —
the pool allows 20 — with a `# TODO: bajar a 1 cuando exista /dashboard/stats/`.)

- Results are cached at **`ClassVar`** level with a 120s **stale-while-revalidate** TTL (stale
  numbers paint instantly, then refresh in the background under a lock).
- The cache is dropped when any tracked entity (`clientes`/`ordenes`/`servicios`/`pagos`/
  `transferencias`) is mutated, via `CacheSignalState`.
- ⚠️ This N+1 pattern is the app's main performance bottleneck. **ROADMAP Fase 10** replaces it
  with a single `/api/dashboard/stats/` endpoint and collapses the 5 sub-states; the semaphore
  goes back to 1 at that point.
- Until Fase 8 lands, the payments / transfers tables are empty, so the dashboard numbers that
  count over those two entities legitimately read 0. Clients, services and work orders are live.

### Filter Options — `FilterState`

`states/filters/filter_state.py` loads the **sector** and **zona** option lists used by the
filter UI of four modules (clientes, pagos, transferencias, órdenes). It replaced the static
lists that used to live in `config/utils/sector_config.py` and `zona_config.py`.

- **One pair of endpoints for everything**: `/sectores/` and `/zonas/`. Orders used to have a
  second pair (`/sectores-ordenes/`, `/zonas-ordenes/`); the backend unified both tables
  (ROADMAP **D3**) and those routes do not exist, so `load_all()` makes **2 calls, not 4**.
  A filter config asking for `options_source: "sector_ordenes"` is a bug — it must be `"sector"`.
- Options are exposed both as state vars (`sector_options`, `zona_options`) **and** mirrored
  into a `ClassVar` dict (`_options_cache`). The mirror exists because
  `helper_compute_filters()` runs inside a **synchronous** `@rx.var` on each sibling
  `*TableState`, and a synchronous var cannot await a cross-state read. Read it with
  `FilterState.get_options(source)`; never touch `_options_cache` directly.
- Cache TTL is **30 minutes** (`_FILTER_TTL`), timestamp written **only after a successful
  load** — a failed request must not poison the cache with an empty list.
- `load_all()` opens with an `if not self.access_token: return` guard. `on_load` events are
  serialized per session so `verify_token` has normally already run; the guard is the safety
  net against a residual race.
- `invalidate_filter_cache(key=None)` clears one key or all of them.

### Relational Dropdowns

`DropdownState`, `ClientDropdownState` and `OrderDropdownState` (`states/relations/`) load
select options for relational fields. Each `load_*()` **paginates in a `while has_more` loop**
to pull the full catalog, and the `load_all_*_dropdowns()` helpers run them in parallel via
`asyncio.gather`.

- Options are stored as `list[list[str]]` with the format `[[id, label], ...]`.
- ✅ Catalogs are **cached** with a `ClassVar` timestamp dict + 10-minute TTL
  (`_dropdown_cache_ts` / `_DROPDOWN_TTL = 600`), one key per catalog. Each `load_*()` opens
  with a freshness guard (`if now - ts < TTL: return`) and writes the timestamp **after** a
  successful load. This avoids re-fetching near-static reference data on every detail-page
  `on_load`.
  - **Exception:** `DropdownState.load_direcciones_by_cliente(cliente_id)` is **not cached** —
    it depends on the active client and must always fetch.
  - Each state exposes `@classmethod invalidate_dropdown_cache()` (clears the dict). It is
    **not wired to anything yet** — available for future use (e.g. an admin editing a catalog).
- `OrderDropdownState.load_sectores()` keeps the raw payload in `_sectores_raw` so that
  `filter_sectores_by_zona_id()` can narrow the sector select to the chosen zona. That works
  because `/sectores/` returns `zona` as the **numeric id** and `zona_str` as the label — the
  two are not interchangeable.
- When adding a relational dropdown, follow the `_load_paginated()` + `[[id, label], ...]`
  pattern, load it from the detail state's `on_load` (never from a UI component), and add a
  cache guard + timestamp write unless it depends on per-request input.

---

### Filter System

Each filterable module has a config file at `config/<entity>/<entity>_filter_config.py`.
The config is a `dict` where each key is the field name and the value defines its behavior:

```python
EXAMPLE_FILTER_CONFIG = {
    "nombre": {"label": "Name", "type": "search", "placeholder": "Search by name..."},
    "activo": {"label": "Active", "type": "boolean"},
    "fecha_creacion": {"label": "Created", "type": "date"},
    "monto": {"label": "Amount", "type": "number", "placeholder": "0"},
    "estado": {"label": "Status", "type": "list", "options": ["activo", "inactivo"]},
}
```

**Supported types and their behavior:**
- `"search"` / `"text"` — text input; triggers search on Enter or blur (not on every keystroke)
- `"number"` — numeric input; triggers search on Enter or blur
- `"date"` — date picker; triggers search immediately on change
- `"list"` — `rx.select` with predefined options; triggers search immediately on select
- `"boolean"` — `rx.select` with "Si" / "No"; triggers search immediately; normalized to
  `True/False` Python internally

Entries with `options_source` pull their options at runtime from `FilterState` instead of
listing them inline. The only valid sources are `"sector"` and `"zona"` (see D3 above).

⚠️ **Two order filters are wired to the wrong catalog** (ROADMAP risk **R9**, found while
building Fase 7). In `config/order/order_filter_config.py`:

| Filter | `options` it shows | Table the backend filters | Overlap |
|--------|--------------------|---------------------------|---------|
| `causa_causa` | `CAUSAS_BAJA` — a *client's* cancellation reasons | `causas_orden` | **none** |
| `servicio_servicio` | `ELEMENTOS` — UPPERCASE | `servicios_orden` — Capitalized | partial |

The backend declares both as `icontains`, which rescues the casing mismatch, but no amount of
case-insensitivity fixes `causa_causa`: they are two different catalogs. The fix belongs here —
point those `options` at `/causas-ordenes/` and `/servicios-ordenes/`, which exist since Fase 4a
and are already loaded by `OrderDropdownState` — and is blocked on a business question: which
list of causes operations actually uses. Do not "fix" it by editing the static list without
asking.

**Which types wait for confirmation** is controlled by `get_wait_types()` in the concrete
table state. Default wait types: `["search", "number"]`. Override in the subclass to change
behavior.

**Boolean normalization**: "Si" / "true" / "yes" / "1" → `True`; "No" / "false" / "0" → `False`.
This happens in `_normalize_value()` inside `FilterableTableState`.

**Filter UI components** follow the wrapper pattern:
- `components/filters/generic_filter_ui.py` — generic, receives `state` and `config_dict` as arguments
- `components/filters/<entity>_filter_ui.py` — thin wrapper that passes the concrete state and its config

Never build a filter UI component from scratch. Always wrap the generic one.

---

### Form System

Field configs for detail forms are defined as a list of dicts:

```python
fields = [
    {"key": "nombre", "label": "Name", "type": "text"},
    {"key": "monto", "label": "Amount", "type": "number"},
    {"key": "activo", "label": "Active", "type": "boolean"},
    {"key": "estado", "label": "Status", "type": "select", "options": ["activo", "inactivo"]},
    {"key": "id", "label": "ID", "type": "text", "readonly": True, "display": "text"},
    {"key": "fecha", "label": "Date", "type": "date"},
]
```

- `"readonly": True` + `"display": "text"` → renders as static text, not an input
- `smart_group_fields()` in `utils/generic_form_utils.py` automatically groups consecutive
  boolean fields into a single `boolean_group` rendered as a switch grid
- Number fields must use `update_value()` (handles int/float casting); text fields use `update_field()`
- **Form UI components** follow the same wrapper pattern as filters:
  - `components/forms/generic_form.py` — generic, receives callbacks as arguments
  - `components/forms/<entity>_form.py` — thin wrapper injecting the concrete state's callbacks

---

### Selection & Bulk Actions

`BaseActionsState` (`states/base/base_actions_state.py`) holds the selection scaffolding shared
by `ClientActionsState`, `OrderActionsState`, `PaymentActionsState` and `TransferActionsState`.
Each subclass declares a **module-level** `BULK_URL` constant (e.g.
`f"{API_BASE_URL}/clientes/bulk-action/"`) and implements `ejecutar_accion()`. The
`BaseActionsState` docstring says "at class level" — it is wrong, none of the four do that.

- `selected_ids` is the explicit selection; `select_all_mode` means "everything matching the
  current filters", resolved server-side via the entity's `all-ids/` endpoint.
- Any per-row toggle (`toggle_selection`, `add_page`, `remove_page`) **clears
  `select_all_mode`** — a mixed state would silently act on rows the user cannot see.
- ⚠️ `all-ids/` is unbounded today; with a large table it can return tens of thousands of ids
  (ROADMAP risk R7). The backend is expected to grow a hard cap.
- The bulk endpoints themselves are **ROADMAP Fase 9** — not implemented yet. CSV export reads
  the filename out of the `Content-Disposition` header, so that header is part of the contract.

---

### Date Handling

- API responses often return datetime strings in ISO format (`"2025-12-30T15:00:00"`).
- Always truncate to `YYYY-MM-DD` before storing in the DTO.
- Do this in `transform_item()` for table states, or in `hook_process_data()` for detail states.
- HTML date inputs require exactly `YYYY-MM-DD`; truncate in `hook_process_data()` if the
  field length > 10.

```python
def hook_process_data(self, data: dict) -> dict:
    for campo in DATE_FIELDS:
        val = data.get(campo)
        if val and isinstance(val, str) and len(val) > 10:
            data[campo] = val[:10]
    return data
```

---

### Cross-State Invalidation

After any mutation (POST/PUT/DELETE), two things must happen:

1. `yield CacheSignalState.invalidate("/endpoint/")` — invalidates cache for sibling table states
2. Reload any related state that might display stale data (e.g., after saving a service, reload
   the parent client detail)

```python
# Example from ServiceDetailState.save_entity()
yield CacheSignalState.invalidate(self.get_endpoint())
yield ClientDetailState.reload_cliente()
```

The client's `monto_total` is the case that makes step 2 non-optional: it is not recomputed
client-side, so the detail must be re-fetched after a service changes.

⚠️ `monto_total` is a **read-only derived field** (ROADMAP **D6**). The backend computes it as
the sum of the client's *active* services and recalculates it on every `PUT /clientes/{id}/`,
so anything the form sends under that key is discarded — silently, like `sector` and `zona`
under D4. Its entry in `config/client_detail_config.py` is therefore `readonly` +
`display: "text"`. `ClientDetailState.save_entity()` still includes it in the payload (it
forwards the object as received); that is harmless, and the PUT response carries the
recalculated value back into the DTO.

---

### Pydantic v1/v2 Compatibility

Always use this pattern when accessing DTO fields programmatically — the project supports both
Pydantic versions:

```python
if hasattr(dto_class, "model_fields"):
    fields = dto_class.model_fields  # Pydantic v2
else:
    fields = getattr(dto_class, "__fields__", {})  # Pydantic v1
```

---

### Anti-Patterns

- ❌ **Do not** make HTTP requests with `httpx` or `requests` directly — always use `self.fetch_with_auth()`
- ❌ **Do not** use Python `if/else` inside functions returning `rx.Component` for reactive logic — use `rx.cond()`
- ❌ **Do not** duplicate pagination logic — always inherit from `BaseTableState`
- ❌ **Do not** build filter or form components from scratch — wrap the generic ones
- ❌ **Do not** mutate DTOs directly from UI event handlers — always go through `update_field()` / `toggle_bool()` / `update_value()`
- ❌ **Do not** forget `CacheSignalState.invalidate()` after mutations — stale data will appear in sibling tables
- ❌ **Do not** put business logic in generic states or components — use hooks (`hook_pre_update`, `hook_post_update`, `hook_process_data`) or the concrete subclass
- ❌ **Do not** enable cache (`get_cache_ttl() > 0`) on entities that change frequently — default is `0` (no cache); only opt in for stable, read-heavy data
- ❌ **Do not** write a timestamp into any of the `ClassVar` caches before the request succeeded — a failed load would be cached as an empty list until the TTL expires
- ❌ **Do not** assume an endpoint exists because the frontend calls it — check ROADMAP §5 for phase status first

---

### New Module Checklist

When adding a new entity module (e.g., "Equipos"), create files in this order:

```
1. dtos/<entity>/<entity>_table_dto.py         — flat DTO for table rows
2. dtos/<entity>/<entity>_detail_dto.py        — full DTO for detail/edit view
3. config/<entity>/<entity>_filter_config.py   — filter config dict
4. states/<entity>/<entity>_table_state.py     — extends FilterableTableState
5. states/<entity>/<entity>_detail_state.py    — extends GenericDetailState
6. components/filters/<entity>_filter_ui.py    — wraps generic_filter_ui
7. components/forms/<entity>_form.py           — wraps generic_form
8. pages/<entity>/<entity>_table_page.py       — table page with @rx.page()
9. pages/<entity>/<entity>_detail_page.py      — detail page with @rx.page()
10. Nexo/Nexo.py                               — register new pages
```

**Minimal state templates:**

```python
# <Entity>TableState
class EquipoTableState(FilterableTableState):
    equipos: list[EquipoTableDTO] = []
    page_size: int = 10

    def get_endpoint(self) -> str: return "/equipos/"
    def get_filter_config(self) -> dict: return EQUIPO_FILTER_CONFIG
    def get_boolean_fields(self) -> set: return {"activo"}
    def set_items(self, items): self.equipos = items
    def clear_items(self): self.equipos = []

    def transform_item(self, item: dict) -> EquipoTableDTO:
        return EquipoTableDTO(
            id=item.get("id"),
            nombre=item.get("nombre", ""),
            activo=item.get("activo", False),
        )


# <Entity>DetailState
class EquipoDetailState(GenericDetailState):
    equipo: EquipoDetailDTO | None = None

    def get_entity_name(self) -> str: return "equipo"
    def get_dto_class(self): return EquipoDetailDTO
    def get_endpoint(self) -> str: return "/equipos/"

    def update_field(self, field, value): self._update_field(field, value)
    def toggle_bool(self, field, value): self._toggle_bool(field, value)
    def update_value(self, field, value): self._update_value(field, value)

    async def load_equipo_by_id(self, equipo_id: int):
        await self._load_by_id(equipo_id)

    async def save_entity(self):
        # PUT logic + CacheSignalState.invalidate()
        ...

    async def add_entity(self):
        # POST logic + CacheSignalState.invalidate()
        ...
```
