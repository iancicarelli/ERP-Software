import reflex as rx
from typing import List, Any, Dict
from ...dtos.work_orders.orders_table_dto import OrderDTO
from ..table.filterable_table_state import FilterableTableState, helper_compute_filters
from ...config.order.order_filter_config import ORDER_FILTER_CONFIG
from ...config.settings import API_BASE_URL
from .order_actions_state import OrderActionsState


class OrderTableState(FilterableTableState):

    def get_cache_ttl(self) -> int:
        return 45
    ordenes: list[OrderDTO] = []
    hidden_columns: list[str] = []
    page_size: int = 10

    def get_endpoint(self) -> str:
        return "/ordenes/"

    def get_filter_config(self) -> dict:
        return ORDER_FILTER_CONFIG

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
    def order_filters_list(self) -> List[Dict[str, Any]]:
        return helper_compute_filters(
            self.active_filter_keys,
            self.filter_values,
            ORDER_FILTER_CONFIG,
        )

    def set_items(self, items: list[OrderDTO]):
        self.ordenes = items

    def clear_items(self):
        self.ordenes = []

    # =========================================================
    # BULK SELECTION
    # =========================================================

    @rx.var
    def current_page_ids(self) -> list[int]:
        return [item.id for item in self.ordenes]

    def add_current_page(self):
        yield OrderActionsState.add_page(self.current_page_ids)

    def remove_current_page(self):
        yield OrderActionsState.remove_page(self.current_page_ids)

    async def trigger_select_all(self):
        """
        Fetches all matching IDs from the backend in a single request
        using the active filters, then populates selected_ids.
        """
        yield OrderActionsState.set_loading_all_ids(True)
        try:
            params = await self.get_filters()
            params["format"] = "json"
            url = f"{API_BASE_URL}/ordenes/all-ids/"
            response = await self.fetch_with_auth(url=url, method="GET", params=params)
            if response is None or response.status_code != 200:
                return
            data = response.json()
            ids = data.get("ids", [])
            yield OrderActionsState.select_all_matching(ids)
        finally:
            yield OrderActionsState.set_loading_all_ids(False)

    def toggle_column(self, column_name: str):
        if column_name in self.hidden_columns:
            self.hidden_columns.remove(column_name)
        else:
            self.hidden_columns.append(column_name)

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

    def transform_item(self, item: dict) -> OrderDTO:
        for fecha_field in ["fecha_programado", "fecha_instalado", "fecha_contrato"]:
            valor = item.get(fecha_field)
            if valor and isinstance(valor, str) and "T" in valor:
                item[fecha_field] = valor.split("T")[0]

        n1 = item.get("nombre1", "")
        a1 = item.get("apellido1", "")
        a2 = item.get("apellido2") or ""
        item["nombre_completo"] = f"{n1} {a1} {a2}".strip()
        item["estado_estado"] = self._resolver_estado(item)

        if hasattr(OrderDTO, "model_fields"):
            model_fields = OrderDTO.model_fields.keys()
        else:
            model_fields = getattr(OrderDTO, "__fields__", {}).keys()

        for field in model_fields:
            if field not in item:
                item[field] = item.get(field)

        return OrderDTO(**item)

    def _resolver_estado(self, item: dict) -> str:
        return item.get("estado_estado") or item.get("estado") or "pendiente"
