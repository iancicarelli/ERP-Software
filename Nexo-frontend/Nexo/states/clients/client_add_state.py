import reflex as rx
from typing import Any

from ...dtos.clients.client_detail_dto import ClientDetailDTO
from ...states.detail.generic_detail_state import GenericDetailState
from ...config.settings import API_BASE_URL
from ...states.relations.client_dropdown_state import ClientDropdownState
from ...states.cache.cache_signal_state import CacheSignalState
from datetime import datetime, date

API_URL = f"{API_BASE_URL}/clientes/"

DATE_FIELDS = {"fecha_creacion", "fecha_de_baja", "moroso_desde"}


class ClientAddState(GenericDetailState):
    cliente: ClientDetailDTO | None = None

    def get_entity_name(self) -> str:
        return "cliente"

    def get_dto_class(self) -> Any:
        return ClientDetailDTO

    def get_endpoint(self) -> str:
        return "/clientes/"

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

    def toggle_bool(self, field: str, value: bool):
        self._toggle_bool(field, value)

    def update_value(self, field: str, value: Any):
        self._update_value(field, value)

    def init_new_client(self):
        self.error = None
        self.loading = False

        self.cliente = ClientDetailDTO(
            id=0,
            rut="",
            nombre1="",
            apellido1="",
            apellido2="",
            nombre2=None,
            nombre3=None,
            email=None,
            tel=None,
            co_titular1=None,
            co_titular2=None,
            sector=None,
            zona=None,
            activo=True,
            por_instalar=True,
            moroso=False,
            moroso_desde=None,
            corte_poste=False,
            baja_por_renuncia=False,
            baja_por_morosidad=False,
            fecha_de_baja=None,
            causa_de_baja=None,
            causa_de_baja_str=None,
            donacion=False,
            analogo=False,
            krill=False,
            defontana=False,
            zammad=False,
            rut_validado=False,
            deuda=0,
            monto_total=0,
            cpes_todos=0,
            cpes_inactivos=0,
            fecha_creacion=None,
        )

    async def update_field(self, field: str, value: Any):
        self._update_field(field, value)

        if not self.cliente:
            return

        if field == "causa_de_baja_str":
            dropdown = await self.get_state(ClientDropdownState)
            resolved = ClientDropdownState.get_id_by_label(
                dropdown.causas_baja_options, value
            )
            self.cliente.causa_de_baja = resolved
            setattr(self, "cliente", self.cliente)

    async def add_entity(self):
        if not self.cliente:
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

            post_payload = {
                "rut": self.cliente.rut,
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
                "rut_validado": self.cliente.rut_validado,
                "deuda": self.cliente.deuda,
                "monto_total": self.cliente.monto_total,
                "cpes_todos": self.cliente.cpes_todos,
                "cpes_inactivos": self.cliente.cpes_inactivos,
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
                yield rx.toast.success("Cliente creado correctamente")
                yield CacheSignalState.invalidate("/clientes/")
                yield rx.redirect("/client")
            else:
                yield rx.toast.error(
                    f"Error al crear: {self._parse_error_response(response)}"
                )

        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")

        finally:
            self.is_saving = False
