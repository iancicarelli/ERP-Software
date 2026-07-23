import reflex as rx
from typing import List, Any, Dict
from ...dtos.transfers.transfers_table_dto import TransferenciaDTO
from ..table.filterable_table_state import FilterableTableState, helper_compute_filters
from ...config.transfer.transfer_filter_config import TRANSFER_FILTER_CONFIG
from ...config.settings import API_BASE_URL
from .transfer_actions_state import TransferActionsState


class TransferTableState(FilterableTableState):

    def get_cache_ttl(self) -> int:
        return 0
    transferencias: list[TransferenciaDTO] = []
    hidden_columns: List[str] = []

    def get_endpoint(self) -> str:
        return "/transferencias/"

    def get_filter_config(self) -> dict:
        return TRANSFER_FILTER_CONFIG

    # =========================================================
    # FILTER METHODS
    # =========================================================

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
    def transfer_filters_list(self) -> List[Dict[str, Any]]:
        return helper_compute_filters(
            self.active_filter_keys,
            self.filter_values,
            TRANSFER_FILTER_CONFIG,
        )

    # =========================================================
    # TABLE METHODS
    # =========================================================

    def toggle_column(self, column_name: str):
        if column_name in self.hidden_columns:
            self.hidden_columns.remove(column_name)
        else:
            self.hidden_columns.append(column_name)

    async def get_filters(self) -> dict:
        params = {}
        for key, value in self.filters_cache.items():
            if value in (None, "", [], "None"):
                continue
            # Lógica especial para estado
            if key in ["estado", "estado__not"]:
                params[key] = "Ok" if value in ["Ok", "Si"] else value
                continue
            if value is True or value == "Si":
                params[key] = True
            elif value is False or value == "No":
                params[key] = False
            else:
                params[key] = value
        return params

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

    def set_items(self, items: list[TransferenciaDTO]):
        self.transferencias = items

    def clear_items(self):
        self.transferencias = []

    # =========================================================
    # BULK SELECTION
    # =========================================================

    @rx.var
    def current_page_ids(self) -> list[int]:
        return [t.id for t in self.transferencias]

    def add_current_page(self):
        yield TransferActionsState.add_page(self.current_page_ids)

    def remove_current_page(self):
        yield TransferActionsState.remove_page(self.current_page_ids)

    async def trigger_select_all(self):
        """
        Fetches all matching IDs from the backend in a single request
        using the active filters, then populates selected_ids.
        """
        yield TransferActionsState.set_loading_all_ids(True)
        try:
            params = await self.get_filters()
            params["format"] = "json"
            url = f"{API_BASE_URL}/transferencias/all-ids/"
            response = await self.fetch_with_auth(url=url, method="GET", params=params)
            if response is None or response.status_code != 200:
                return
            data = response.json()
            ids = data.get("ids", [])
            yield TransferActionsState.select_all_matching(ids)
        finally:
            yield TransferActionsState.set_loading_all_ids(False)

    def transform_item(self, item: dict) -> TransferenciaDTO:
        data = {
            "id": item.get("id"),
            "fecha": (item.get("fecha") or "").replace("T", " ")[:16],
            "cliente_str": str(item.get("cliente_str") or ""),
            "rut_transferencia": item.get("rut_transferencia") or "",
            "nombre": item.get("nombre") or item.get("nombre_origen") or "",
            "banco_origen": item.get("banco_origen") or "",
            "cuenta_destino": item.get("cuenta_destino") or "",
            "monto": str(item.get("monto", "0")),
            "estado": item.get("estado") or "Pendiente",
            "codigo_transferencia": item.get("codigo_transferencia") or "",
            "cliente_existe": item.get("cliente_existe", False),
            "voucher_generado": str(item.get("voucher_generado") or ""),
            "documento_pagado": item.get("documento_pagado", False),
            "documento_venta": str(item.get("documento_venta") or ""),
            "documento_vencimiento": (item.get("documento_vencimiento") or "")[:10],
        }

        if hasattr(TransferenciaDTO, "model_fields"):
            model_fields = TransferenciaDTO.model_fields.keys()
        else:
            model_fields = getattr(TransferenciaDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue
            val = item.get(field_name)
            data[field_name] = val if val is not None else ""

        return TransferenciaDTO(**data)
