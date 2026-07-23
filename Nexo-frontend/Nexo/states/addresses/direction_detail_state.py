import reflex as rx
from typing import Any

from ...dtos.addresses.direction_detail_dto import DirectionDetailDTO
from ...states.detail.generic_detail_state import GenericDetailState
from ...config.settings import API_BASE_URL
from ...states.relations.dropdown_state import DropdownState
from ...states.cache.cache_signal_state import CacheSignalState
from ...states.clients.client_detail_state import ClientDetailState

API_URL = f"{API_BASE_URL}/direcciones/"


class DirectionDetailState(GenericDetailState):

    direccion: DirectionDetailDTO | None = None

    def get_entity_name(self) -> str:
        return "direccion"

    def get_dto_class(self) -> Any:
        return DirectionDetailDTO

    def get_endpoint(self) -> str:
        return "/direcciones/"

    def init_new_direction(self):
        self.error = None
        self.loading = False
        default_data = {
            "id": 0,
            "activo": True,
            "principal": False,
            "contrato": 0,
            "sucursal": "",
            "direccion": "",
            "coordenadas": "",
            "monto": 0,
            "cliente": 0,
            "cliente_rut": "",
            "cliente_str": "",
            "sector": 0,
            "sector_str": "",
            "sector_zona": "",
        }
        self.direccion = DirectionDetailDTO(**default_data)

    def check_or_init_direction(self):
        if self.direccion is None or self.direccion.cliente == 0:
            self.direccion = None
            return rx.redirect("/clients")

    async def init_direction_with_client(self, cliente_id: str):
        if not cliente_id:
            self.init_new_direction()
            yield DropdownState.load_sectores()
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
                self.init_new_direction()
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
                    "principal": False,
                    "contrato": 0,
                    "sucursal": "",
                    "direccion": "",
                    "coordenadas": "",
                    "monto": 0,
                    "cliente": int(cliente_id),
                    "cliente_rut": cliente_data.get("rut", ""),
                    "cliente_str": cliente_str,
                    "sector": 0,
                    "sector_str": "",
                    "sector_zona": "",
                }

                self.direccion = DirectionDetailDTO(**default_data)
                yield DropdownState.load_sectores()
                yield rx.toast.info(f"Agregando dirección para: {cliente_str}")

            else:
                yield rx.toast.error(f"No se pudo cargar el cliente ({response.status_code})")
                self.init_new_direction()

        except Exception as e:
            yield rx.toast.error(f"Error al cargar datos del cliente: {str(e)}")
            self.init_new_direction()
        finally:
            self.loading = False

    def update_field(self, field: str, value: Any):
        self._update_field(field, value)

    def update_value(self, field: str, value: Any):
        self._update_value(field, value)

    def toggle_bool(self, field: str, value: bool):
        self._toggle_bool(field, value)

    def set_sector(self, value: str):
        if self.direccion and value:
            self.direccion.sector = int(value)

    async def load_direction_by_id(self, direction_id: str):
        self.loading = True
        self.error = None

        try:
            response = await self.fetch_with_auth(
                url=f"{API_URL}{direction_id}/",
                method="GET",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                self.direccion = DirectionDetailDTO(**response.json())
                yield DropdownState.load_sectores()
            else:
                yield rx.toast.error(f"No se pudo cargar la dirección ({response.status_code})")

        except Exception as e:
            import traceback
            print(f"Error en load_direction_by_id: {e}")
            print(traceback.format_exc())
            yield rx.toast.error(f"Error procesando los datos: {str(e)}")
        finally:
            self.loading = False

    async def save_entity(self):
        """Actualizar una dirección existente (PUT)."""
        if not self.direccion:
            return

        if not self.direccion.id or self.direccion.id <= 0:
            yield rx.toast.error("No se puede actualizar una dirección sin ID")
            return

        self.is_saving = True
        self.error = None

        try:
            if not self.direccion.direccion.strip():
                yield rx.toast.warning("La calle/dirección es obligatoria")
                return

            if self.direccion.sector == 0:
                yield rx.toast.warning("Debe seleccionar un sector")
                return

            put_payload = {
                "activo": self.direccion.activo,
                "principal": self.direccion.principal,
                "contrato": self.direccion.contrato,
                "sucursal": self.direccion.sucursal,
                "direccion": self.direccion.direccion,
                "coordenadas": self.direccion.coordenadas,
                "monto": self.direccion.monto,
                "cliente": self.direccion.cliente,
                "sector": self.direccion.sector,
            }

            response = await self.fetch_with_auth(
                url=f"{API_URL}{self.direccion.id}/",
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
                self.direccion = DirectionDetailDTO(**response.json())
                yield rx.toast.success("Dirección actualizada correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield ClientDetailState.reload_cliente()
                yield DropdownState.load_sectores()
                yield rx.redirect("/client/detail")
            else:
                yield rx.toast.error(f"Error al actualizar: {self._parse_error_response(response)}")

        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")
        finally:
            self.is_saving = False

    async def add_entity(self):
        """Crear una nueva dirección (POST)."""
        if not self.direccion:
            return

        self.is_saving = True
        self.error = None

        try:
            if not self.direccion.direccion.strip():
                yield rx.toast.warning("La calle/dirección es obligatoria")
                return

            if self.direccion.sector == 0:
                yield rx.toast.warning("Debe seleccionar un sector")
                return

            if not self.direccion.cliente or self.direccion.cliente == 0:
                yield rx.toast.warning("No hay cliente asociado")
                return

            post_payload = {
                "activo": self.direccion.activo,
                "principal": self.direccion.principal,
                "contrato": self.direccion.contrato,
                "sucursal": self.direccion.sucursal,
                "direccion": self.direccion.direccion,
                "coordenadas": self.direccion.coordenadas,
                "monto": self.direccion.monto,
                "cliente": self.direccion.cliente,
                "sector": self.direccion.sector,
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
                self.direccion = DirectionDetailDTO(**response.json())
                yield rx.toast.success("Dirección creada correctamente")
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
        self.direccion = None
        self.error = None