import reflex as rx
from typing import Dict, Any, List

from .table_state import BaseTableState
from ..filters.filter_state import FilterState


def helper_compute_filters(
    active_keys: List[str],
    filter_values: Dict[str, Any],
    config: Dict[str, Any],
) -> List[Dict[str, Any]]:
    computed_list = []
    for key in active_keys:
        key = str(key)
        if key in config:
            item_data = config[key].copy()
            item_data["key"] = key
            item_data["value"] = str(filter_values.get(key, ""))
            item_data.setdefault("placeholder", "")
            # Opciones dinámicas: si el filtro declara "options_source", se
            # resuelven desde FilterState (cargado en el on_load de la página).
            # Si aún no cargó (lista vacía) se cae al "options" del config como
            # fallback. generic_filter_ui.py no necesita cambios: sigue leyendo
            # item_data["options"].
            source = item_data.get("options_source")
            if source:
                dynamic_options = FilterState.get_options(source)
                if dynamic_options:
                    item_data["options"] = dynamic_options
            item_data.setdefault("options", [])
            item_data.setdefault("label", key)
            item_data.setdefault("type", "search")
            computed_list.append(item_data)
    return computed_list


class FilterableTableState(BaseTableState):
    filter_values: Dict[str, Any] = {}
    active_filter_keys: List[str] = []
    filters_cache: Dict[str, Any] = {}

    def get_filter_config(self) -> dict:
        return {}

    def get_boolean_fields(self) -> set:
        return set()

    def get_wait_types(self) -> list:
        return ["search", "number"]

    def add_filter(self, field: str):
        field = str(field)
        if field not in self.active_filter_keys:
            self.active_filter_keys.append(field)

    async def remove_filter(self, field: str):
        if field in self.active_filter_keys:
            self.active_filter_keys.remove(field)
        await self.set_filter_value(field, None, reload_table=True)

    async def clear_all_filters(self):
        self.active_filter_keys = []
        self.filter_values = {}
        self.filters_cache = {}
        self.invalidate_cache()
        self.page = 1
        await self._perform_load()

    async def clear_filters_only(self):
        self.active_filter_keys = []
        self.filter_values = {}
        self.filters_cache = {}
        self.page = 1
        # NO llama a invalidate_cache() ni a _perform_load()

    async def handle_key_down(self, key: str):
        if key == "Enter":
            await self.trigger_search()

    async def trigger_search(self, *args):
        self.filters_cache = self.filter_values
        self.page = 1
        await self._perform_load()

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

    def _normalize_value(self, field: str, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
        if value in (None, "", [], "None"):
            return None
        if field in self.get_boolean_fields():
            if isinstance(value, str):
                v = value.lower()
                if v in ("si", "true", "yes", "1"):
                    return True
                if v in ("no", "false", "0"):
                    return False
            return bool(value)
        field_type = self.get_filter_config().get(field, {}).get("type", "text")
        if field_type == "number":
            try:
                val_str = str(value).replace(",", ".")
                return None if val_str.strip() == "" else val_str
            except Exception:
                return None
        return value

    async def get_filters(self) -> dict:
        params = {}
        for key, value in self.filters_cache.items():
            if value in (None, "", [], "None"):
                continue
            if value is True or value == "Si":
                params[key] = True
            elif value is False or value == "No":
                params[key] = False
            else:
                params[key] = value
        return params

    @rx.var
    def active_filters_list(self) -> List[Dict[str, Any]]:
        config = self.get_filter_config()
        if not config:
            return []
        return helper_compute_filters(
            self.active_filter_keys,
            self.filter_values,
            config,
        )
