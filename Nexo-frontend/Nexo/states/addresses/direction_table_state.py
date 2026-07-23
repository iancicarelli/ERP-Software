import reflex as rx
from typing import Any, Dict, List
from ...dtos.addresses.direction_table_dto import DireccionTableDTO
from ..table.table_state import BaseTableState


class DirectionTableState(BaseTableState):
    direcciones: List[DireccionTableDTO] = []
    current_client_id: int = 0
    pending_delete_id: int = 0  

    def get_endpoint(self) -> str:
        return "/direcciones/"

    def set_items(self, items: List[DireccionTableDTO]):
        self.direcciones = items

    def clear_items(self):
        self.direcciones = []

    async def get_filters(self) -> Dict[str, Any]:
        if self.current_client_id:
            return {"cliente_id": self.current_client_id}
        return {}

    async def load_directions_for_client(self, client_id: int):
        self.current_client_id = client_id
        self.page = 1
        self.invalidate_cache()
        await self._perform_load()

    def transform_item(self, item: dict) -> DireccionTableDTO:
        data = {
            "id": int(item.get("id", 0)),
            "sector": str(item.get("sector_str") or ""),
            "zona": str(item.get("sector_zona") or ""),
            "activo": bool(item.get("activo", False)),
            "principal": bool(item.get("principal", False)),
            "monto": float(item.get("monto", 0.0)),
        }

        if hasattr(DireccionTableDTO, "model_fields"):
            model_fields = DireccionTableDTO.model_fields.keys()
        else:
            model_fields = getattr(DireccionTableDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue
            val = item.get(field_name)
            if val is None:
                val = ""
            data[field_name] = val

        return DireccionTableDTO(**data)

    def request_delete(self, direction_id: int):
        self.pending_delete_id = direction_id

    def cancel_delete(self):
        self.pending_delete_id = 0

    async def confirm_delete(self, direction_id: int):
        """Segundo click: ejecuta el DELETE y recarga la tabla."""
        from ...states.cache.cache_signal_state import CacheSignalState
        from ...states.clients.client_detail_state import ClientDetailState
        from ...config.settings import API_BASE_URL

        direction_name = next(
            (d.direccion for d in self.direcciones if d.id == direction_id), ""
        )

        self.pending_delete_id = 0

        try:
            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}/direcciones/{direction_id}/",
                method="DELETE",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code in (200, 204):
                yield rx.toast.success("Dirección eliminada correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield ClientDetailState.reload_cliente()
            else:
                try:
                    error_text = response.text.lower()
                    if "protected" in error_text or "servicio" in error_text:
                        name = direction_name or "esta dirección"
                        yield rx.toast.error(
                            f"La dirección '{name}' no se puede eliminar porque tiene servicios asociados."
                        )
                    else:
                        try:
                            error_body = str(response.json())
                        except Exception:
                            error_body = response.text
                        yield rx.toast.error(f"Error {response.status_code}: {error_body}")
                except Exception:
                    yield rx.toast.error(f"Error {response.status_code} al eliminar la dirección.")

        except Exception as e:
            yield rx.toast.error(f"Error al eliminar: {str(e)}")