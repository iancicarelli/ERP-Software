import reflex as rx
from typing import Any, Dict, List
from ...dtos.clients.client_table_order_dto import ClientTableOrderDTO
from ..table.table_state import BaseTableState

class ClientTableOrderState(BaseTableState):
    ordenes: List[ClientTableOrderDTO] = []
    current_client_rut: str = ""
    pending_delete_id: int = 0

    def get_endpoint(self) -> str:
        return "/ordenes/"

    def set_items(self, items: List[ClientTableOrderDTO]):
        self.ordenes = items

    def clear_items(self):
        self.ordenes = []

    async def get_filters(self) -> Dict[str, Any]:
        if self.current_client_rut:
            return {"rut": self.current_client_rut}
        return {}

    async def load_orders_for_client(self, rut: str):
        self.current_client_rut = rut
        self.page = 1
        await self._perform_load()

    def transform_item(self, item: dict) -> ClientTableOrderDTO:
        def clean_date(val):
            if not val:
                return None
            if isinstance(val, str) and "T" in val:
                return val.split("T")[0]
            return val

        data = {
            "id": int(item.get("id", 0)),
            "monto": int(item.get("monto", 0)),
            "abierto": bool(item.get("abierto", False)),
            "modificacion_plan": bool(item.get("modificacion_plan", False)),
            "migracion": bool(item.get("migracion", False)),
            "traslado": bool(item.get("traslado", False)),
            
            "tipo_str": item.get("tipo_str"), 
            "servicio_str": str(item.get("servicio_str") or ""),
            "estado_str": str(item.get("estado_str") or ""),
            
            "fecha_contrato": clean_date(item.get("fecha_contrato")),
            "fecha_programado": clean_date(item.get("fecha_programado")),
            "fecha_instalado": clean_date(item.get("fecha_instalado")),
        }

        if hasattr(ClientTableOrderDTO, "model_fields"):
            model_fields = ClientTableOrderDTO.model_fields.keys()
        else:
            model_fields = getattr(ClientTableOrderDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue 

            val = item.get(field_name)
            if val is not None:
                data[field_name] = val

        return ClientTableOrderDTO(**data)

    def request_delete(self, order_id: int):
        self.pending_delete_id = order_id

    def cancel_delete(self):
        self.pending_delete_id = 0

    async def confirm_delete(self, order_id: int):
        from ...states.cache.cache_signal_state import CacheSignalState
        from ...states.clients.client_detail_state import ClientDetailState

        self.pending_delete_id = 0

        try:
            from ...config.settings import API_BASE_URL
            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}/ordenes/{order_id}/",
                method="DELETE",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code in (200, 204):
                yield rx.toast.success("Orden eliminada correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield ClientDetailState.reload_cliente()
            else:
                error_body = ""
                try:
                    error_body = str(response.json())
                except Exception:
                    error_body = response.text
                yield rx.toast.error(f"Error {response.status_code}: {error_body}")

        except Exception as e:
            yield rx.toast.error(f"Error al eliminar: {str(e)}")