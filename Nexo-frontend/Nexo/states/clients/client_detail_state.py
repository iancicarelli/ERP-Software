from typing import Any, Dict
from datetime import datetime, date
import reflex as rx
from ...dtos.clients.client_detail_dto import ClientDetailDTO
from ...states.detail.generic_detail_state import GenericDetailState
from ...states.clients.client_table_service_state import ClientTableServiceState
from ...config.settings import API_BASE_URL
from ...states.cache.cache_signal_state import CacheSignalState

DATE_FIELDS = {"fecha_creacion", "fecha_de_baja", "moroso_desde"}

API_URL = f"{API_BASE_URL}/clientes/"


class ClientDetailState(GenericDetailState):
    rut: str | None = None
    cliente: ClientDetailDTO | None = None
    show_delete_dialog: bool = False

    def get_entity_name(self) -> str:
        return "cliente"

    def get_dto_class(self) -> Any:
        return ClientDetailDTO

    def get_endpoint(self) -> str:
        return "/clientes/"

    def hook_process_data(self, data: Dict) -> Dict:
        for campo in DATE_FIELDS:
            val = data.get(campo)
            if val and isinstance(val, str) and len(val) > 10:
                data[campo] = val[:10]

        val = data.get("causa_de_baja")
        if isinstance(val, int):
            data["causa_de_baja"] = val

        return data

    def hook_pre_update(self, field: str, value: Any) -> Any:
        if field in DATE_FIELDS:
            return self._parse_date(value)
        return value

    def _parse_date(self, date_str: str | None) -> date | None:
        if not date_str:
            return None
        try:
            return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
        except ValueError:
            return None

    async def update_field(self, field: str, value: Any):
        self._update_field(field, value)

        if not self.cliente:
            return

        if field == "causa_de_baja_str":
            from ...states.relations.client_dropdown_state import ClientDropdownState
            dropdown = await self.get_state(ClientDropdownState)
            resolved = ClientDropdownState.get_id_by_label(
                dropdown.causas_baja_options, value
            )
            self.cliente.causa_de_baja = resolved
            setattr(self, "cliente", self.cliente)

    def toggle_bool(self, field: str, value: bool):
        self._toggle_bool(field, value)

    async def load_cliente_by_id(self, cliente_id: int):
        await self._load_by_id(cliente_id)

    def redirect_if_empty(self):
        if not self.cliente:
            return rx.redirect("/clients")

    async def reload_cliente(self):
        """Recarga el cliente, su tabla de servicios y su tabla de direcciones."""
        if self.cliente and self.cliente.id:
            from ...states.addresses.direction_table_state import DirectionTableState
            await self.load_cliente_by_id(self.cliente.id)
            yield ClientTableServiceState.load_services_for_client(self.cliente.id)
            yield DirectionTableState.load_directions_for_client(self.cliente.id)

    def update_value(self, field: str, value: Any):
        self._update_value(field, value)

    def open_delete_dialog(self):
        self.show_delete_dialog = True

    def close_delete_dialog(self):
        self.show_delete_dialog = False

    async def save_entity(self):
        if not self.cliente:
            return

        if not self.cliente.id or self.cliente.id <= 0:
            yield rx.toast.error("No se puede actualizar un cliente sin ID")
            return

        self.is_saving = True
        self.error = None

        try:
            if not self.cliente.rut or not self.cliente.rut.strip():
                yield rx.toast.warning("Debe ingresar el RUT")
                return
            if not self.cliente.nombre1 or not self.cliente.nombre1.strip():
                yield rx.toast.warning("Debe ingresar el nombre")
                return
            if not self.cliente.apellido1 or not self.cliente.apellido1.strip():
                yield rx.toast.warning("Debe ingresar el apellido paterno")
                return
            if not self.cliente.apellido2 or not self.cliente.apellido2.strip():
                yield rx.toast.warning("Debe ingresar el apellido materno")
                return

            put_payload = {
                "rut": self.cliente.rut,
                "rut_validado": self.cliente.rut_validado,
                "nombre1": self.cliente.nombre1,
                "nombre2": self.cliente.nombre2 or "",
                "nombre3": self.cliente.nombre3 or "",
                "apellido1": self.cliente.apellido1,
                "apellido2": self.cliente.apellido2 or "",
                "email": self.cliente.email or "",
                "tel": self.cliente.tel or "",
                "co_titular1": self.cliente.co_titular1 or "",
                "co_titular2": self.cliente.co_titular2 or "",
                "sector": self.cliente.sector or "",
                "zona": self.cliente.zona or "",
                "activo": self.cliente.activo,
                "por_instalar": self.cliente.por_instalar,
                "moroso": self.cliente.moroso,
                "moroso_desde": str(self.cliente.moroso_desde) if self.cliente.moroso_desde else None,
                "corte_poste": self.cliente.corte_poste,
                "baja_por_renuncia": self.cliente.baja_por_renuncia,
                "baja_por_morosidad": self.cliente.baja_por_morosidad,
                "fecha_de_baja": str(self.cliente.fecha_de_baja) if self.cliente.fecha_de_baja else None,
                "causa_de_baja": self.cliente.causa_de_baja if self.cliente.causa_de_baja and self.cliente.causa_de_baja > 0 else None,
                "donacion": self.cliente.donacion,
                "analogo": self.cliente.analogo,
                "krill": self.cliente.krill,
                "defontana": self.cliente.defontana,
                "zammad": self.cliente.zammad,
                "deuda": self.cliente.deuda,
                "monto_total": self.cliente.monto_total,
                "cpes_todos": self.cliente.cpes_todos,
                "cpes_inactivos": self.cliente.cpes_inactivos,
            }

            response = await self.fetch_with_auth(
                url=f"{API_URL}{self.cliente.id}/",
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
                data = response.json()
                data = self.hook_process_data(data)

                STR_FIELDS_TO_PRESERVE = ["causa_de_baja_str"]
                for f in STR_FIELDS_TO_PRESERVE:
                    current_val = getattr(self.cliente, f, None)
                    if data.get(f) is None and current_val is not None:
                        data[f] = current_val

                self.cliente = ClientDetailDTO(**data)
                yield rx.toast.success("Cliente actualizado correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield rx.redirect("/client")
            else:
                yield rx.toast.error(
                    f"Error al actualizar: {self._parse_error_response(response)}"
                )

        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")

        finally:
            self.is_saving = False

    async def delete_entity(self):
        if not self.cliente or not self.cliente.id or self.cliente.id <= 0:
            return

        self.is_saving = True
        self.show_delete_dialog = False

        try:
            response = await self.fetch_with_auth(
                url=f"{API_URL}{self.cliente.id}/",
                method="DELETE",
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 204:
                yield rx.toast.success("Cliente eliminado")
                yield CacheSignalState.invalidate("/clientes/")
                yield rx.redirect("/client")
            else:
                yield rx.toast.error(
                    f"Error al eliminar: {response.status_code}"
                )

        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")

        finally:
            self.is_saving = False
