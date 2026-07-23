import reflex as rx
from ...states.base.base_actions_state import BaseActionsState
from ...config.settings import API_BASE_URL

BULK_URL = f"{API_BASE_URL}/transferencias/bulk-action/"


class TransferActionsState(BaseActionsState):

    # Dialog resultado
    show_result_dialog: bool = False
    result_message: str = ""
    result_pay_document_successful: str = ""
    result_pay_document_voucher: int = 0
    result_document_type: str = ""
    result_document_number: int = 0
    result_document_expiration: str = ""
    result_document_amount: int = 0
    result_elementos_seleccionados: int = 0

    # Dialog resultado: eliminar_voucher
    result_eliminar_mensaje: str = ""
    result_eliminar_result: str = ""
    result_eliminar_elementos: int = 0
    show_eliminar_dialog: bool = False

    # ── Dialog ─────────────────────────────────────────────────

    def close_result_dialog(self):
        self.show_result_dialog = False
        self.result_message = ""
        self.result_pay_document_successful = ""
        self.result_pay_document_voucher = 0
        self.result_document_type = ""
        self.result_document_number = 0
        self.result_document_expiration = ""
        self.result_document_amount = 0
        self.result_elementos_seleccionados = 0

    def close_eliminar_dialog(self):
        self.show_eliminar_dialog = False
        self.result_eliminar_mensaje = ""
        self.result_eliminar_result = ""
        self.result_eliminar_elementos = 0

    # ── Dispatcher ─────────────────────────────────────────────

    async def ejecutar_accion(self):
        if not self.selected_ids:
            yield rx.toast.warning("Selecciona al menos un registro")
            return
        if not self.selected_action:
            yield rx.toast.warning("Selecciona una acción")
            return

        if self.selected_action == "generar_voucher":
            async for event in self._accion_generar_voucher():
                yield event
        elif self.selected_action == "eliminar_voucher":
            async for event in self._accion_eliminar_voucher():
                yield event
        else:
            yield rx.toast.error(f"Acción no implementada: {self.selected_action}")

    # ── Acción: generar_voucher ────────────────────────────────

    async def _accion_generar_voucher(self):
        if len(self.selected_ids) != 1:
            yield rx.toast.warning("Seleccioná exactamente un registro")
            return

        self.actions_loading = True
        try:
            response = await self.fetch_with_auth(
                url=BULK_URL,
                method="POST",
                json_data=self.build_bulk_payload("generar_voucher"),
                timeout=60.0,
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                data = response.json()
                self.result_message = data.get("message", "")
                self.result_pay_document_successful = data.get("pay_document_successful", "")
                self.result_pay_document_voucher = data.get("pay_document_voucher", 0)
                self.result_document_type = data.get("document_type", "")
                self.result_document_number = data.get("document_number", 0)
                self.result_document_expiration = data.get("document_expiration", "")
                self.result_document_amount = data.get("document_amount", 0)
                self.result_elementos_seleccionados = data.get("elementos_seleccionados", 0)
                self.show_result_dialog = True
            else:
                yield rx.toast.error(f"Error del servidor: {response.status_code}")

        except Exception as e:
            yield rx.toast.error(f"Error inesperado: {str(e)}")
        finally:
            self.actions_loading = False

    # ── Acción: eliminar_voucher ───────────────────────────────

    async def _accion_eliminar_voucher(self):
        if len(self.selected_ids) != 1:
            yield rx.toast.warning("Seleccioná exactamente un registro")
            return

        self.actions_loading = True
        try:
            response = await self.fetch_with_auth(
                url=BULK_URL,
                method="POST",
                json_data=self.build_bulk_payload("eliminar_voucher"),
                timeout=60.0,
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                data = response.json()
                self.result_message = data.get("message", "")
                self.result_eliminar_mensaje = data.get("mensaje", "")
                self.result_eliminar_result = data.get("result", "")
                self.result_eliminar_elementos = data.get("elementos_seleccionados", 0)
                self.show_eliminar_dialog = True
            else:
                yield rx.toast.error(f"Error del servidor: {response.status_code}")

        except Exception as e:
            yield rx.toast.error(f"Error inesperado: {str(e)}")
        finally:
            self.actions_loading = False
