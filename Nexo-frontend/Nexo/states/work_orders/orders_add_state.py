import reflex as rx
from typing import Any

from ...dtos.work_orders.order_detail_dto import OrderDetailDTO
from ...states.detail.generic_detail_state import GenericDetailState
from ...config.settings import API_BASE_URL
from ...states.relations.order_dropdown_state import OrderDropdownState
from ...states.cache.cache_signal_state import CacheSignalState

API_URL = f"{API_BASE_URL}/ordenes/"


class OrdersAddState(GenericDetailState):
    orden: OrderDetailDTO | None = None
    _from_client: bool = False

    def get_entity_name(self) -> str:
        return "orden"

    def get_dto_class(self) -> Any:
        return OrderDetailDTO

    def get_endpoint(self) -> str:
        return "/ordenes/"

    def toggle_bool(self, field: str, value: bool):
        self._toggle_bool(field, value)

    def update_value(self, field: str, value: Any):
        self._update_value(field, value)

    def init_new_order(self):
        if self._from_client:
            self._from_client = False
            return
        self.error = None
        self.loading = False

        self.orden = OrderDetailDTO(
            id=0,
            rut="",
            nombre1="",
            apellido1="",
            apellido2="",
            servicio_str="",
            estado_str="",
            zona_str="",
            zona_zona="",
            sector_str="",
            sector_sector="",
            abierto=True,
            evaluacion=True,
            contrato_nuevo=True,
            medidor_luz=True,
            pago_instalacion=True,
            comision=False,
            comision_pagada=False,
            modificacion_plan=False,
            migracion=False,
            traslado=False,
            ducto=False,
            poda=False,
            vecino=False,
            postacion=False,
            bienvenida=False,
            monto=0,
            costo_metros_extras=0,
            anexos_extras=0,
            anexos_extras_exterior=0,
            sintonizadores=0,
            extensores_wifi=0,
            metros_extras=0,
            metros_ducto=0,
            costo_instalacion=0,
            postes=0,
        )

    async def init_new_order_with_client(self):
        from ...states.clients.client_detail_state import ClientDetailState

        self.error = None
        self.loading = False

        self.orden = OrderDetailDTO(
            id=0,
            rut="",
            nombre1="",
            apellido1="",
            apellido2="",
            servicio_str="",
            estado_str="",
            zona_str="",
            zona_zona="",
            sector_str="",
            sector_sector="",
            abierto=True,
            evaluacion=True,
            contrato_nuevo=True,
            medidor_luz=True,
            pago_instalacion=True,
            comision=False,
            comision_pagada=False,
            modificacion_plan=False,
            migracion=False,
            traslado=False,
            ducto=False,
            poda=False,
            vecino=False,
            postacion=False,
            bienvenida=False,
            monto=0,
            costo_metros_extras=0,
            anexos_extras=0,
            anexos_extras_exterior=0,
            sintonizadores=0,
            extensores_wifi=0,
            metros_extras=0,
            metros_ducto=0,
            costo_instalacion=0,
            postes=0,
        )

        client_state = await self.get_state(ClientDetailState)
        cliente = client_state.cliente

        if self.orden and cliente:
            self.orden.rut = cliente.rut or ""
            self.orden.nombre1 = cliente.nombre1 or ""
            self.orden.apellido1 = cliente.apellido1 or ""
            self.orden.apellido2 = cliente.apellido2 or ""
            self.orden.email = cliente.email or ""
            self.orden.tel = cliente.tel or ""
            self._from_client = True

    async def update_field(self, field: str, value: Any):
        self._update_field(field, value)

        if not self.orden:
            return

        _SELECT_FIELDS = {
            "vendedor_str", "zona_str", "sector_str",
            "servicio_str", "estado_str", "causa_str", "tecnico_str",
        }

        if field not in _SELECT_FIELDS:
            return

        dropdown = await self.get_state(OrderDropdownState)

        if field == "vendedor_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.vendedores_options, value
            )
            self.orden.vendedor_id = resolved
            self.orden.vendedor = resolved
        elif field == "zona_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.zonas_options, value
            )
            self.orden.zona_id = resolved
            self.orden.zona = resolved
            self.orden.sector_str = ""
            self.orden.sector_id = 0
            self.orden.sector = 0
            dropdown.filter_sectores_by_zona_id(resolved)
        elif field == "sector_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.sectores_filtrados_options, value
            )
            self.orden.sector_id = resolved
            self.orden.sector = resolved
        elif field == "servicio_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.servicios_options, value
            )
            self.orden.servicio_id = resolved
            self.orden.servicio = resolved
        elif field == "estado_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.estados_options, value
            )
            self.orden.estado_id = resolved
            self.orden.estado = resolved
        elif field == "causa_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.causas_options, value
            )
            self.orden.causa_id = resolved
            self.orden.causa = resolved
        elif field == "tecnico_str":
            resolved = OrderDropdownState.get_id_by_label(
                dropdown.tecnicos_options, value
            )
            self.orden.tecnico_id = resolved
            self.orden.tecnico = resolved

        setattr(self, "orden", self.orden)

    async def add_entity(self):
        if not self.orden:
            return

        self.is_saving = True
        self.error = None

        try:
            if not self.orden.rut or not self.orden.rut.strip():
                yield rx.toast.warning("Debe ingresar el RUT")
                return
            if not self.orden.nombre1 or not self.orden.nombre1.strip():
                yield rx.toast.warning("Debe ingresar el nombre")
                return
            if not self.orden.apellido1 or not self.orden.apellido1.strip():
                yield rx.toast.warning("Debe ingresar el apellido paterno")
                return
            if not self.orden.apellido2 or not self.orden.apellido2.strip():
                yield rx.toast.warning("Debe ingresar el apellido materno")
                return

            zona_val = self.orden.zona_id or self.orden.zona
            if not zona_val or zona_val <= 0:
                yield rx.toast.warning("Debe seleccionar una zona")
                return
            sector_val = self.orden.sector_id or self.orden.sector
            if not sector_val or sector_val <= 0:
                yield rx.toast.warning("Debe seleccionar un sector")
                return
            vendedor_val = self.orden.vendedor_id or self.orden.vendedor
            if not vendedor_val or vendedor_val <= 0:
                yield rx.toast.warning("Debe seleccionar un vendedor")
                return
            estado_val = self.orden.estado_id or self.orden.estado
            if not estado_val or estado_val <= 0:
                yield rx.toast.warning("Debe seleccionar un estado")
                return
            servicio_val = self.orden.servicio_id or self.orden.servicio
            if not servicio_val or servicio_val <= 0:
                yield rx.toast.warning("Debe seleccionar un servicio")
                return

            post_payload = {
                "rut": self.orden.rut,
                "nombre1": self.orden.nombre1,
                "apellido1": self.orden.apellido1,
                "apellido2": self.orden.apellido2 or "",
                "direccion": self.orden.direccion or "",
                "email": self.orden.email or "",
                "tel": self.orden.tel or "",
                "contrato_nuevo": self.orden.contrato_nuevo,
                "fecha_contrato": str(self.orden.fecha_contrato) if self.orden.fecha_contrato else None,
                "modificacion_plan": self.orden.modificacion_plan,
                "migracion": self.orden.migracion,
                "traslado": self.orden.traslado,
                "servicio": self.orden.servicio_id or self.orden.servicio or None,
                "anexos_extras": self.orden.anexos_extras,
                "anexos_extras_exterior": self.orden.anexos_extras_exterior,
                "sintonizadores": self.orden.sintonizadores,
                "extensores_wifi": self.orden.extensores_wifi,
                "metros_extras": self.orden.metros_extras,
                "metros_ducto": self.orden.metros_ducto,
                "monto": self.orden.monto,
                "pago_instalacion": self.orden.pago_instalacion,
                "costo_instalacion": self.orden.costo_instalacion,
                "costo_metros_extras": self.orden.costo_metros_extras,
                "coordenadas": self.orden.coordenadas or "",
                "medidor_luz": self.orden.medidor_luz,
                "ducto": self.orden.ducto,
                "poda": self.orden.poda,
                "vecino": self.orden.vecino,
                "postacion": self.orden.postacion,
                "postes": self.orden.postes,
                "observacion_vendedor": self.orden.observacion_vendedor or "",
                "observacion": self.orden.observacion or "",
                "abierto": self.orden.abierto,
                "evaluacion": self.orden.evaluacion,
                "bienvenida": self.orden.bienvenida,
                "estado": self.orden.estado_id or self.orden.estado or None,
                **({"causa": self.orden.causa_id or self.orden.causa} if (self.orden.causa_id and self.orden.causa_id > 0) or (self.orden.causa and self.orden.causa > 0) else {}),
                "comision": self.orden.comision,
                "comision_pagada": self.orden.comision_pagada,
                "fecha_pago": str(self.orden.fecha_pago) if self.orden.fecha_pago else None,
                "fecha_programado": str(self.orden.fecha_programado) if self.orden.fecha_programado else None,
                "fecha_instalado": str(self.orden.fecha_instalado) if self.orden.fecha_instalado else None,
                "tecnico": (self.orden.tecnico_id or self.orden.tecnico) if (self.orden.tecnico_id and self.orden.tecnico_id > 0) or (self.orden.tecnico and self.orden.tecnico > 0) else None,
                "tecnico2": self.orden.tecnico2 or "",
                "vendedor": self.orden.vendedor_id or self.orden.vendedor or None,
                "zona": self.orden.zona_id or self.orden.zona or None,
                "sector": self.orden.sector_id or self.orden.sector or None,
                "koboid": self.orden.koboid,
                "koboid_serie": self.orden.koboid_serie,
                "kobo_asset_uid": self.orden.kobo_asset_uid or "",
                "kobo_submission_time": str(self.orden.kobo_submission_time) if self.orden.kobo_submission_time else None,
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
                yield rx.toast.success("Orden creada correctamente")
                yield CacheSignalState.invalidate(self.get_endpoint())
                yield rx.redirect("/orders")
            else:
                yield rx.toast.error(
                    f"Error al crear: {self._parse_error_response(response)}"
                )

        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")

        finally:
            self.is_saving = False
