import reflex as rx
from typing import List, Any, Dict
from ...dtos.payments.payment_table_dto import PaymentDTO
from ..table.filterable_table_state import FilterableTableState, helper_compute_filters
from ...config.payment.payment_filter_config import PAYMENT_FILTER_CONFIG
from ...config.settings import API_BASE_URL
from .payment_actions_state import PaymentActionsState


class PaymentTableState(FilterableTableState):

    def get_cache_ttl(self) -> int:
        return 0
    payments: list[PaymentDTO] = []
    page_size: int = 9
    hidden_columns: List[str] = []

    def get_endpoint(self) -> str:
        return "/pagos/"

    def get_filter_config(self) -> dict:
        return PAYMENT_FILTER_CONFIG

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
    def payment_filters_list(self) -> List[Dict[str, Any]]:
        return helper_compute_filters(
            self.active_filter_keys,
            self.filter_values,
            PAYMENT_FILTER_CONFIG,
        )

    # =========================================================
    # TABLE METHODS
    # =========================================================

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

    def set_items(self, items: list[PaymentDTO]):
        self.payments = items

    def clear_items(self):
        self.payments = []

    # =========================================================
    # BULK SELECTION
    # =========================================================

    @rx.var
    def current_page_ids(self) -> list[int]:
        return [item.id for item in self.payments]

    def add_current_page(self):
        yield PaymentActionsState.add_page(self.current_page_ids)

    def remove_current_page(self):
        yield PaymentActionsState.remove_page(self.current_page_ids)

    async def trigger_select_all(self):
        """
        Fetches all matching IDs from the backend in a single request
        using the active filters, then populates selected_ids.
        """
        yield PaymentActionsState.set_loading_all_ids(True)
        try:
            params = await self.get_filters()
            params["format"] = "json"
            url = f"{API_BASE_URL}/pagos/all-ids/"
            response = await self.fetch_with_auth(url=url, method="GET", params=params)
            if response is None or response.status_code != 200:
                return
            data = response.json()
            ids = data.get("ids", [])
            yield PaymentActionsState.select_all_matching(ids)
        finally:
            yield PaymentActionsState.set_loading_all_ids(False)

    def transform_item(self, item: dict) -> PaymentDTO:
        data = {
            "id": item.get("id"),
            "cliente_existe": item.get("cliente_existe", False),
            "cliente_str": item.get("cliente_str") or "",
            "cliente_rut": item.get("cliente_rut") or "",
            "voucher_rut": item.get("voucherRut") or "",
            "voucher_type": item.get("voucherType") or "",
            "voucher_number": item.get("voucherNumber", 0),
            "fiscal_year": item.get("fiscalYear", 0),
            "entry_user": item.get("entryUser") or "",
            "credit": item.get("credit", 0),
            "folio_number": str(item.get("folioNumber") or ""),
            "date": item.get("date") or "",
            "entry_date": item.get("entryDate") or "",
            "expiration_date": item.get("expirationDate") or "",
            "document_type": item.get("documentType") or "",
        }

        if hasattr(PaymentDTO, "model_fields"):
            model_fields = PaymentDTO.model_fields.keys()
        else:
            model_fields = getattr(PaymentDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue
            val = item.get(field_name)
            data[field_name] = val if val is not None else ""

        return PaymentDTO(**data)
