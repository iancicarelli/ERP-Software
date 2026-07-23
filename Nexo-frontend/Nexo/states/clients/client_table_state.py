import reflex as rx
from typing import Dict, Any, Set, List
from ...dtos.clients.client_table_dto import ClientDTO
from ..table.filterable_table_state import FilterableTableState, helper_compute_filters
from ...config.client_filter_config import CLIENT_FILTER_CONFIG
from ...config.settings import API_BASE_URL
from .client_actions_state import ClientActionsState


class ClientTableState(FilterableTableState):
    clientes: list[ClientDTO] = []

    def get_cache_ttl(self) -> int:
        return 300

    def get_endpoint(self) -> str:
        return "/clientes/"

    def get_filter_config(self) -> dict:
        return CLIENT_FILTER_CONFIG

    def get_boolean_fields(self) -> Set[str]:
        return {
            "activo", "por_instalar", "moroso", "analogo", "corte_poste",
            "baja_por_renuncia", "baja_por_morosidad", "donacion", "krill",
        }

    def add_filter(self, field: str):
        field = str(field)
        if field not in self.active_filter_keys:
            self.active_filter_keys.append(field)

    async def handle_key_down(self, key: str):
        if key == "Enter":
            await self.trigger_search()

    async def clear_all_filters(self):
        self.active_filter_keys = []
        self.filter_values = {}
        self.filters_cache = {}
        self.page = 1
        await self._perform_load()

    async def load_page(self):
        await self._perform_load()

    async def reset_and_reload(self):
        self.page = 1
        await self._perform_load()

    async def trigger_search(self, *args):
        self.filters_cache = self.filter_values
        self.page = 1
        await self._perform_load()

    async def remove_filter(self, field: str):
        if field in self.active_filter_keys:
            self.active_filter_keys.remove(field)
        await self.set_filter_value(field, None, reload_table=True)

    async def set_filter_value(self, field: str, value: Any, reload_table: bool = True):
        normalized = self._normalize_value(field, value)
        new_values = self.filter_values.copy()
        if normalized is None or normalized == "":
            new_values.pop(field, None)
        else:
            new_values[field] = normalized
        self.filter_values = new_values

        field_type = self.get_filter_config().get(field, {}).get("type", "search")
        should_reload = reload_table or field_type not in self.get_wait_types()
        if should_reload:
            self.filters_cache = new_values
            self.page = 1
            await self._perform_load()

    @rx.var
    def client_filters_list(self) -> List[Dict[str, Any]]:
        return helper_compute_filters(
            self.active_filter_keys,
            self.filter_values,
            CLIENT_FILTER_CONFIG,
        )

    async def update_filters_explicitly(self, new_filters: Dict[str, Any]):
        self.filters_cache = new_filters
        self.filter_values = new_filters
        self.page = 1
        await self._perform_load()

    async def get_filters(self) -> dict:
        params = {}
        for key, value in self.filters_cache.items():
            if value in (None, "", [], "None"):
                continue
            if value is True or value == "Si":
                params[key] = True
            elif value is False or value == "No":
                params[key] = False
            elif key in ["causa_baja", "causa_de_baja"]:
                params["causa_de_baja"] = value
            else:
                params[key] = value
        return params

    def set_items(self, items: list[ClientDTO]):
        self.clientes = items

    def clear_items(self):
        self.clientes = []

    # =========================================================
    # BULK SELECTION
    # =========================================================

    @rx.var
    def current_page_ids(self) -> list[int]:
        return [item.id for item in self.clientes]

    def add_current_page(self):
        yield ClientActionsState.add_page(self.current_page_ids)

    def remove_current_page(self):
        yield ClientActionsState.remove_page(self.current_page_ids)

    async def trigger_select_all(self):
        """
        Fetches all matching IDs from the backend in a single request
        using the active filters, then populates selected_ids.
        """
        yield ClientActionsState.set_loading_all_ids(True)
        try:
            params = await self.get_filters()
            params["format"] = "json"
            url = f"{API_BASE_URL}/clientes/all-ids/"
            response = await self.fetch_with_auth(url=url, method="GET", params=params)
            if response is None or response.status_code != 200:
                return
            data = response.json()
            ids = data.get("ids", [])
            yield ClientActionsState.select_all_matching(ids)
        finally:
            yield ClientActionsState.set_loading_all_ids(False)

    def transform_item(self, item: dict) -> ClientDTO:
        data = {
            "id": item.get("id"),
            "rut": item.get("rut", ""),
            "nombre_completo": f'{item.get("nombre1", "")} {item.get("apellido1", "")} {item.get("apellido2", "")}'.strip(),
            "estado": self._resolver_estado(item),
            "email": item.get("email") or "",
            "telefono": item.get("tel") or "",
            "sector": item.get("sector") or "",
        }
        model_fields = []
        if hasattr(ClientDTO, "model_fields"):
            model_fields = ClientDTO.model_fields.keys()
        else:
            model_fields = getattr(ClientDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue
            val = item.get(field_name)
            if val is None:
                val = ""
            data[field_name] = val

        return ClientDTO(**data)

    def _resolver_estado(self, item: dict) -> str:
        if item.get("activo"): return "activo"
        if item.get("por_instalar"): return "por_instalar"
        if item.get("moroso"): return "moroso"
        return "baja"

    async def next_page(self):
        if self._has_more:
            self.page += 1
            await self._perform_load()

    async def prev_page(self):
        if self.page > 1:
            self.page -= 1
            await self._perform_load()

    async def go_to_page(self, page: int):
        if page == self.page: return
        self.page = page
        await self._perform_load()
