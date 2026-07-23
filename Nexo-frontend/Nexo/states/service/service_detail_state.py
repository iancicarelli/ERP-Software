import reflex as rx
from typing import Any

from ...dtos.service.service_detail_dto import ServiceDetailDTO
from ...states.detail.generic_detail_state import GenericDetailState
from ...config.utils.elementos_map import ELEMENTOS_MAP
from ...config.settings import API_BASE_URL
from ...states.relations.dropdown_state import DropdownState
from ...states.cache.cache_signal_state import CacheSignalState
from ...states.clients.client_detail_state import ClientDetailState

API_URL = f"{API_BASE_URL}/servicios/"

class ServiceDetailState(GenericDetailState):
    
    servicio: ServiceDetailDTO | None = None

    def get_entity_name(self) -> str:
        return "servicio"

    def get_dto_class(self) -> Any:
        return ServiceDetailDTO

    def get_endpoint(self) -> str:
        return "/servicios/"

    def init_new_service(self):
        self.error = None
        self.loading = False

        default_data = {
            "id": 0,
            "activo": True,
            "cantidad": 1,
            "personalizado": False,
            "monto": 0,
            "elemento": 0,
            "elemento_elemento": "Router",
            "cliente": 0,
            "cliente_str": "",
            "direccion": 0,
            "direccion_str": "",
        }

        self.servicio = ServiceDetailDTO(**default_data)

    def check_or_init_service(self):

        if self.servicio is None or self.servicio.cliente == 0:
            self.servicio = None
            return rx.redirect("/clients")

    async def init_service_with_client(self, cliente_id: str):
        if not cliente_id:
            self.init_new_service()
            yield DropdownState.load_elementos()
            return

        self.loading = True
        self.error = None

        try:
            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}/clientes/{cliente_id}/",
                method="GET",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                self.init_new_service()
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                cliente_data = response.json()
                
                nombre1 = cliente_data.get("nombre1", "")
                nombre2 = cliente_data.get("nombre2", "")
                apellido1 = cliente_data.get("apellido1", "")
                apellido2 = cliente_data.get("apellido2", "")
                
                nombres = f"{nombre1} {nombre2}".strip()
                apellidos = f"{apellido1} {apellido2}".strip()
                cliente_str = f"{nombres} {apellidos}".strip()
                
                default_data = {
                    "id": 0,
                    "activo": True,
                    "cantidad": 1,
                    "personalizado": False,
                    "monto": 0,
                    "elemento": 0,
                    "elemento_elemento": "Router",
                    "cliente": int(cliente_id),
                    "cliente_rut": cliente_data.get("rut", ""),
                    "cliente_nombre1": cliente_data.get("nombre1", ""),
                    "cliente_apellido1": cliente_data.get("apellido1", ""),
                    "cliente_apellido2": cliente_data.get("apellido2", ""),
                    "cliente_str": cliente_str,
                    "direccion": 0,
                    "direccion_str": "",
                }
                
                self.servicio = ServiceDetailDTO(**default_data)
                
                yield DropdownState.load_elementos()
                yield DropdownState.load_direcciones_by_cliente(int(cliente_id))
                
                yield rx.toast.info(f"Agregando un servicio para: {cliente_str}")
            else:
                yield rx.toast.error(f"No se pudo cargar el cliente ({response.status_code})")
                self.init_new_service()

        except Exception as e:
            yield rx.toast.error(f"Error al cargar datos del cliente: {str(e)}")
            self.init_new_service()

        finally:
            self.loading = False

    def hook_post_update(self, field: str, value: Any):
        if field == "elemento_elemento" and self.servicio:
            self.servicio.elemento = ELEMENTOS_MAP.get(value, 0)

    def update_field(self, field: str, value: Any):
        self._update_field(field, value)

    def update_value(self, field: str, value: Any):
        self._update_value(field, value)

    def toggle_bool(self, field: str, value: bool):
        self._toggle_bool(field, value)

    def set_elemento(self, value: str):
        """Actualiza el ID del elemento cuando cambia el select."""
        if self.servicio and value:
            self.servicio.elemento = int(value)

    def set_direccion(self, value: str):
        """Actualiza el ID de la dirección cuando cambia el select."""
        if self.servicio and value:
            self.servicio.direccion = int(value)

    async def load_service_by_id(self, service_id: str):
        self.loading = True
        self.error = None

        try:
            response = await self.fetch_with_auth(
                url=f"{API_URL}{service_id}/",
                method="GET",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                self.servicio = ServiceDetailDTO(**response.json())
                yield DropdownState.load_elementos()
                if self.servicio.cliente:
                    yield DropdownState.load_direcciones_by_cliente(self.servicio.cliente)

            else:
                yield rx.toast.error(
                    f"No se pudo cargar el servicio ({response.status_code})"
                )

        except Exception:
            yield rx.toast.error("Error procesando los datos")

        finally:
            self.loading = False

    async def save_entity(self):
        """Actualizar un servicio existente (PUT)"""
        if not self.servicio:
            return
        
        if not self.servicio.id or self.servicio.id <= 0:
            yield rx.toast.error("No se puede actualizar un servicio sin ID")
            return
        
        self.is_saving = True
        self.error = None
        
        try:
            if self.servicio.elemento == 0:
                yield rx.toast.warning("Debe seleccionar un elemento")
                return
            
            if self.servicio.direccion == 0:
                yield rx.toast.warning("Debe seleccionar una dirección")
                return

            put_payload = {
                "activo": self.servicio.activo,
                "cantidad": self.servicio.cantidad,
                "monto": self.servicio.monto,
                "personalizado": self.servicio.personalizado,
                "elemento": self.servicio.elemento,
                "direccion": self.servicio.direccion,
                "cliente": self.servicio.cliente,  
            }
            
            response = await self.fetch_with_auth(
                url=f"{API_URL}{self.servicio.id}/",
                method="PUT",
                json_data=put_payload,
            )
            
            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return
            
            if response.status_code == 401:
                yield self.logout()
                return
            
            if response.status_code == 200:
                self.servicio = ServiceDetailDTO(**response.json())
                yield rx.toast.success("Servicio actualizado correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield ClientDetailState.reload_cliente()
                yield DropdownState.load_elementos()
                if self.servicio.cliente:
                    yield DropdownState.load_direcciones_by_cliente(self.servicio.cliente)
            else:
                yield rx.toast.error(f"Error al actualizar: {self._parse_error_response(response)}")
        
        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")
        
        finally:
            self.is_saving = False

    async def add_entity(self):
        """Crear un nuevo servicio (POST)"""
        if not self.servicio:
            return
        
        self.is_saving = True
        self.error = None
        
        try:
            if self.servicio.elemento == 0:
                yield rx.toast.warning("Debe seleccionar un elemento")
                return
            if self.servicio.direccion == 0:
                yield rx.toast.warning("Debe seleccionar una dirección")
                return
            if not self.servicio.cliente or self.servicio.cliente == 0:
                yield rx.toast.warning("Debe seleccionar un cliente")
                return

            post_payload = {
                "activo": self.servicio.activo,
                "cantidad": self.servicio.cantidad,
                "monto": self.servicio.monto,
                "personalizado": self.servicio.personalizado,
                "elemento": self.servicio.elemento,
                "direccion": self.servicio.direccion,
                "cliente": self.servicio.cliente,
            }
            
            response = await self.fetch_with_auth(
                url=API_URL,
                method="POST",
                json_data=post_payload,
            )
            
            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return
            
            if response.status_code == 401:
                yield self.logout()
                return
            
            if response.status_code == 201:
                self.servicio = ServiceDetailDTO(**response.json())
                yield rx.toast.success("Servicio creado correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield ClientDetailState.reload_cliente()
                yield rx.redirect("/client/detail")
            else:
                yield rx.toast.error(f"Error al crear: {self._parse_error_response(response)}")
        
        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")
        
        finally:
            self.is_saving = False
            
    def clear(self):
        self.servicio = None
        self.error = None