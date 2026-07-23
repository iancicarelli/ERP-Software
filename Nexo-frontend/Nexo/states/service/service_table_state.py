import reflex as rx
from typing import List, Set, Any, Dict
from ...dtos.service.service_table_dto import ServiceDTO
from ..table.filterable_table_state import FilterableTableState, helper_compute_filters
from ...config.service.service_filter_config import SERVICE_FILTER_CONFIG


class ServiceTableState(FilterableTableState):

    def get_cache_ttl(self) -> int:
        return 300
    servicios: list[ServiceDTO] = []
    page_size: int = 10

    def get_endpoint(self) -> str:
        return "/servicios/"

    def get_filter_config(self) -> dict:
        return SERVICE_FILTER_CONFIG

    # =========================================================
    # FILTER METHODS
    # =========================================================

    def get_boolean_fields(self) -> Set[str]:
        return {"activo"}

    def get_wait_types(self) -> List[str]:
        return ["search", "text", "rut", "number"]

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
    def service_filters_list(self) -> List[Dict[str, Any]]:
        return helper_compute_filters(
            self.active_filter_keys,
            self.filter_values,
            SERVICE_FILTER_CONFIG,
        )

    # =========================================================
    # TABLE METHODS
    # =========================================================

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

    async def reset_and_reload(self):
        self.page = 1
        await self._perform_load()

    def set_items(self, items: list[ServiceDTO]):
        self.servicios = items

    def clear_items(self):
        self.servicios = []

    def transform_item(self, item: dict) -> ServiceDTO:
        data = {
            "id": item.get("id"),
            "rut": item.get("cliente_rut", "S/I"),
            "cliente": item.get("cliente_str", ""),
            "elemento_elemento": item.get("elemento_elemento", ""),
            "calle": item.get("direccion_str", ""),
            "cantidad": item.get("cantidad", 0),
            "monto": item.get("monto", 0),
            "estado": self._resolver_estado(item),
        }

        if hasattr(ServiceDTO, "model_fields"):
            model_fields = ServiceDTO.model_fields.keys()
        else:
            model_fields = getattr(ServiceDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue
            val = item.get(field_name)
            data[field_name] = val if val is not None else ""

        return ServiceDTO(**data)

    def _resolver_estado(self, item: dict) -> str:
        if item.get("activo", False):
            return "activo"
        return "por instalar"
