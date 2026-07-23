import reflex as rx
import asyncio
from typing import Any, Dict, List
from ...dtos.clients.client_table_service_dto import ClientTableServiceDTO
from ..table.table_state import BaseTableState

class ClientTableServiceState(BaseTableState):
    servicios: List[ClientTableServiceDTO] = []
    current_client_id: int = 0
    pending_delete_id: int = 0  

    def get_endpoint(self) -> str:
        return "/servicios/"

    def set_items(self, items: List[ClientTableServiceDTO]):
        self.servicios = items

    def clear_items(self):
        self.servicios = []

    async def get_filters(self) -> Dict[str, Any]:
        if self.current_client_id:
            return {"cliente_id": self.current_client_id}
        return {}

    async def load_services_for_client(self, client_id: int):
        self.current_client_id = client_id
        self.page = 1
        self.invalidate_cache()  
        await self._perform_load()

    def transform_item(self, item: dict) -> ClientTableServiceDTO:
        data = {
            "id": int(item.get("id", 0)),
            "activo": bool(item.get("activo", False)),
            "elemento": str(item.get("elemento") or ""),
            "cantidad": int(item.get("cantidad", 0)),
            "monto": float(item.get("monto", 0.0)),
            "personalizado": bool(item.get("personalizado", False)),
            "direccion": str(item.get("direccion") or ""),
        }

        if hasattr(ClientTableServiceDTO, "model_fields"):
            model_fields = ClientTableServiceDTO.model_fields.keys()
        else:
            model_fields = getattr(ClientTableServiceDTO, "__fields__", {}).keys()

        for field_name in model_fields:
            if field_name in data:
                continue 

            val = item.get(field_name)
            if val is None:
                val = "" 
            
            data[field_name] = val

        return ClientTableServiceDTO(**data)

    def request_delete(self, service_id: int):
        """Primer click: marca el servicio como pendiente de borrado."""
        self.pending_delete_id = service_id

    def cancel_delete(self):
        """Cancela la confirmación pendiente."""
        self.pending_delete_id = 0

    async def confirm_delete(self, service_id: int):
        """Segundo click: ejecuta el DELETE y recarga la tabla."""
        from ...states.cache.cache_signal_state import CacheSignalState
        from ...states.clients.client_detail_state import ClientDetailState

        self.pending_delete_id = 0

        try:
            from ...config.settings import API_BASE_URL
            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}/servicios/{service_id}/",
                method="DELETE",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code in (200, 204):
                yield rx.toast.success("Servicio eliminado correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield ClientDetailState.reload_cliente()
            else:
                print(f"DELETE /servicios/{service_id}/ → {response.status_code}")
                print(f"Response body: {response.text}")
                print(f"Request headers: {response.request.headers if hasattr(response, 'request') else 'N/A'}")
                error_body = ""
                try:
                    error_body = str(response.json())
                except Exception:
                    error_body = response.text
                yield rx.toast.error(f"Error {response.status_code}: {error_body}")

        except Exception as e:
            yield rx.toast.error(f"Error al eliminar: {str(e)}")