# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server (hot reload)
reflex run

# Initialize the project (first time setup)
reflex init
```

The app requires a `.env` file in the project root with:
```
API_BASE_URL=<backend URL>
```

## Architecture Overview

This is a **Reflex** (Python-based full-stack framework) admin panel frontend. Reflex compiles Python into a React/Next.js app served by a Python backend. Pages, state, and components are all written in Python.

- **Reflex version**: `0.8.24.post1` (see `requirements.txt`).
- **Config**: `rxconfig.py` — app name `Panel_Admin_frontend`, plugins `SitemapPlugin` + `TailwindV4Plugin`.
- **Backend contract**: Django REST style. List endpoints are paginated with `?page=&page_size=&format=json` and return `{count, next, previous, results}`. Count-only queries use `limit=1` and read `count`.

### Modules & Routes

| Module | Route(s) | Table state | Detail state |
|--------|----------|-------------|--------------|
| Dashboard / Landing | `/` | `IndexState` (+ `index_*_state.py`) | — |
| Clientes | `/client`, `/client/detail`, `/client/add` | `ClientTableState` | `ClientDetailState`, `ClientAddState` |
| Servicios | `/service`, `/service/detail`, `/service/add` | `ServiceTableState` | `ServiceDetailState` |
| Órdenes de trabajo | `/orders`, `/order/detail`, `/order/add` | `OrdersTableState` | `OrderDetailState`, `OrdersAddState` |
| Pagos | `/payment` | `PaymentTableState` | — |
| Transferencias | `/transfers` | `TransferTableState` | `TransferAssignClientState` |
| Direcciones | `/direction/detail`, `/direction/add` | `DirectionTableState` | `DirectionDetailState` |
| Métricas | `/metrics`, ticket mensual | — | — |
| Login / 404 | `/login`, not-found | `AuthState` | — |

Pages are registered in `Panel_Admin_frontend.py` via `app.add_page(...)`.

### Directory Structure

```
Panel_Admin_frontend/
├── Panel_Admin_frontend.py   # App entry point — registers all pages
├── template.py               # Shared layout (sidebar + content wrapper)
├── config/                   # Settings (API_BASE_URL) and per-entity filter/field configs
├── dtos/                     # Pydantic models used as typed state containers
├── states/                   # Reflex state classes (all business logic and API calls)
├── pages/                    # Page components decorated with @rx.page(route=...)
├── components/               # Reusable UI components (forms, tables, buttons, etc.)
└── utils/                    # Generic form utilities (field generation, normalization)
```

### State Hierarchy

All state classes ultimately inherit from `rx.State`:

```
rx.State
└── AuthState (login_state.py)       — JWT tokens in LocalStorage, login/logout/refresh
    └── APIState (api_state.py)      — fetch_with_auth(): makes HTTP calls, auto-refreshes on 401
        ├── PaginatedState           — page, page_size, total_count, _has_more
        │   └── BaseTableState       — _perform_load(), caching, transform_item()
        │       └── FilterableTableState — filter_values, active_filter_keys
        │           └── <Entity>TableState (e.g., ClientTableState)
        ├── GenericDetailState       — _load_by_id(), _update_field(), _toggle_bool()
        │   └── <Entity>DetailState (e.g., ClientDetailState, DirectionDetailState)
        ├── IndexState               — dashboard aggregator (SWR ClassVar cache)
        └── DropdownState / ClientDropdownState / OrderDropdownState — relational selects
```

`CacheSignalState` is a separate `rx.State` that tracks mutation timestamps per endpoint. Table states check it to invalidate their in-memory cache after a write operation.

`AuthState` itself extends `rx.State` directly and is the root of the hierarchy. It is the **only** state that bypasses the shared `APIState._http_client` (using it would be a circular import, since `APIState` is its child). Instead it owns its **own persistent client** at `ClassVar` level via `get_auth_client()` (`max_connections=5`, `max_keepalive_connections=3`, 10s timeout) — `do_login`/`verify_token`/`do_refresh` reuse it for keep-alive. `verify_token` also decodes the JWT `exp` claim **locally** (`_decode_jwt_exp`, stdlib `base64`+`json` only, no signature check) and only hits `POST /token/verify/` as a fallback when the token is unreadable — fresh token returns without network, near-expiry/expired calls `do_refresh()` directly. Signature validation still belongs to the backend (enforced on every real request via `fetch_with_auth`'s 401 handling).

### Data Flow Pattern

1. **DTOs** (`dtos/`) are Pydantic `BaseModel` subclasses that hold entity data as typed state vars.
2. **Table states** extend `FilterableTableState`, override `get_endpoint()`, `transform_item()`, `set_items()`, and `get_filter_config()`. They call `_perform_load()` which fetches paginated data from the API.
3. **Detail states** extend `GenericDetailState`, override `get_entity_name()`, `get_dto_class()`, `get_endpoint()`. They implement `save_entity()` (PUT) and `add_entity()` (POST), and call `CacheSignalState.invalidate()` after mutations.
4. **Pages** use `@rx.page(route=..., on_load=[AuthState.verify_token, ...])` and wrap content with `template()`.
5. **Config files** in `config/` define filter configurations (type, label, options) and field groupings for detail forms.

### Adding a New Entity

1. Create a DTO in `dtos/<entity>/`.
2. Create a table state in `states/<entity>/` extending `FilterableTableState`.
3. Create a detail state in `states/<entity>/` extending `GenericDetailState`; implement `save_entity()` and `add_entity()`.
4. Create a filter config in `config/` if the table needs filters.
5. Create page components in `pages/` using `template()` and `@rx.page()`.
6. Register the pages in `Panel_Admin_frontend.py`.

### Key Patterns

- **Authentication guard**: Every protected page includes `AuthState.verify_token` in `on_load`.
- **Cache invalidation**: After any write (POST/PUT/DELETE), call `yield CacheSignalState.invalidate("/endpoint/")` so sibling table states reload on next access.
- **Form fields**: `generate_auto_fields(DTOClass, exclude=[...], overrides={...})` in `utils/generic_form_utils.py` auto-generates field configs from DTO annotations.
- **Field updates**: Use `_update_field()` for text/dates, `_update_value()` for type-coerced numbers, `_toggle_bool()` for booleans.
- **Navigation to detail views**: Set entity on state first, then `rx.redirect("/route")`. Detail pages call `redirect_if_empty()` on load to guard against direct URL access.
- **Network error surfacing**: `APIState` holds an `api_error: str` state var. `fetch_with_auth()` clears it before each request and sets it in its two `except` blocks (network / unexpected). `template.py`'s `error_banner()` renders a dismissible red `rx.callout` (`rx.cond(APIState.api_error != "", ...)`, close button → `clear_api_error()`) above every protected page's content. The banner auto-clears on the next successful request. Set `api_error` only for transport failures, not business-logic errors (those use per-page `error`/`error_message` vars).

---

### Dashboard / Landing (`/`)

`IndexState.load_stats()` fans out to 5 sub-states (`IndexClientState`, `IndexOrdersState`, `IndexServiceState`, `IndexPaymentState`, `IndexTransferState`). Each sub-state issues **one count request per metric** (`limit=1`, read `count`), throttled by a global `asyncio.Semaphore(10)` (`states/index/dashboard_semaphore.py`). This totals **~37 HTTP requests** for a cold dashboard load. (The semaphore was raised 5→10 as a temporary patch — the pool allows 20 — with a `# TODO: bajar a 1 cuando exista /dashboard/stats/`.)

- Results are cached at **`ClassVar`** level with a 120s **stale-while-revalidate** TTL (stale numbers paint instantly, then refresh in the background under a lock).
- The cache is dropped when any tracked entity (`clientes`/`ordenes`/`servicios`/`pagos`/`transferencias`) is mutated, via `CacheSignalState`.
- ⚠️ This N+1 pattern is the app's main performance bottleneck. See `rework.md` (git-ignored planning doc) for the proposed `/dashboard/stats/` aggregation endpoint and migration plan.

### Relational Catalogs (dropdowns)

`ClientDropdownState` and `OrderDropdownState` (and the older `DropdownState`) load select options for relational fields. Each `load_*()` **paginates in a `while has_more` loop** to pull the full catalog, and `load_all_*_dropdowns()` runs them in parallel via `asyncio.gather`.

- ✅ These catalogs are **cached** with a `ClassVar` timestamp dict + 10-minute TTL (`_dropdown_cache_ts` / `_DROPDOWN_TTL = 600`), one key per catalog. Each `load_*()` opens with a freshness guard (`if now - ts < TTL: return`) and writes the timestamp **after** a successful load. This avoids re-fetching near-static reference data on every detail-page `on_load`. An aggregated `/catalogos/*` endpoint is still desirable but no longer a bottleneck (see `rework.md` §9).
  - **Exception:** `DropdownState.load_direcciones_by_cliente(cliente_id)` is **not cached** — it depends on the active client and must always fetch.
  - Each state exposes `@classmethod invalidate_dropdown_cache()` (clears the dict). It is **not wired to anything yet** — available for future use (e.g. an admin editing a catalog).
- When adding a relational dropdown, follow the `_load_paginated()` + `[[id, label], ...]` pattern, load it from the detail state's `on_load` (never from a UI component), and add a cache guard + timestamp write unless it depends on per-request input.

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
- `"boolean"` — `rx.select` with "Si" / "No"; triggers search immediately; normalized to `True/False` Python internally

**Which types wait for confirmation** is controlled by `get_wait_types()` in the concrete table state.
Default wait types: `["search", "number"]`. Override in the subclass to change behavior.

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
- `smart_group_fields()` in `utils/generic_form_utils.py` automatically groups consecutive boolean fields into a single `boolean_group` rendered as a switch grid
- Number fields must use `update_value()` (handles int/float casting); text fields use `update_field()`
- **Form UI components** follow the same wrapper pattern as filters:
  - `components/forms/generic_form.py` — generic, receives callbacks as arguments
  - `components/forms/<entity>_form.py` — thin wrapper injecting the concrete state's callbacks

---

### Relational Dropdowns

`DropdownState` (in `states/relations/dropdown_state.py`) centralizes loading of select options for relational fields (elementos, direcciones, sectores).

- Options are stored as `list[list[str]]` with format `[[id, label], ...]`
- Loading is internally paginated (iterates while `has_more` is true)
- Load methods: `load_elementos()`, `load_direcciones_by_cliente(cliente_id)`, `load_sectores()`
- Always `yield DropdownState.load_xxx()` from the detail state's load/init methods, not from UI components

---

### Date Handling

- API responses often return datetime strings in ISO format (`"2025-12-30T15:00:00"`).
- Always truncate to `YYYY-MM-DD` before storing in the DTO.
- Do this in `transform_item()` for table states, or in `hook_process_data()` for detail states.
- HTML date inputs require exactly `YYYY-MM-DD`; truncate in `hook_process_data()` if the field length > 10.

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
2. Reload any related state that might display stale data (e.g., after saving a service, reload the parent client detail)

```python
# Example from ServiceDetailState.save_entity()
yield CacheSignalState.invalidate(self.get_endpoint())
yield ClientDetailState.reload_cliente()
```

---

### Pydantic v1/v2 Compatibility

Always use this pattern when accessing DTO fields programmatically — the project supports both Pydantic versions:

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
10. Panel_Admin_frontend.py                    — register new pages
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
