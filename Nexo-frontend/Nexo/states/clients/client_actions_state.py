import reflex as rx
from ...states.base.base_actions_state import BaseActionsState
from ...config.settings import API_BASE_URL

BULK_URL = f"{API_BASE_URL}/clientes/bulk-action/"


class ClientActionsState(BaseActionsState):

    # Dialog resultado
    show_result_dialog: bool = False
    result_message: str = ""
    result_suma_monto: int = 0
    result_suma_deuda: int = 0
    result_cantidad: int = 0

    # ── Dialog ─────────────────────────────────────────────────

    def close_result_dialog(self):
        self.show_result_dialog = False
        self.result_message = ""
        self.result_suma_monto = 0
        self.result_suma_deuda = 0
        self.result_cantidad = 0

    # ── Dispatcher ─────────────────────────────────────────────

    async def ejecutar_accion(self):
        if not self.selected_ids:
            yield rx.toast.warning("Seleccioná al menos un cliente")
            return
        if not self.selected_action:
            yield rx.toast.warning("Seleccioná una acción")
            return

        if self.selected_action == "sumar_montos_deuda_action":
            async for event in self._accion_sumar_montos():
                yield event
        elif self.selected_action == "exportar_clientes_csv":
            async for event in self._accion_exportar_csv():
                yield event
        else:
            yield rx.toast.error(f"Acción no implementada: {self.selected_action}")

    # ── Acción: sumar_montos_deuda ─────────────────────────────

    async def _accion_sumar_montos(self):
        self.actions_loading = True
        try:
            response = await self.fetch_with_auth(
                url=BULK_URL,
                method="POST",
                json_data=self.build_bulk_payload("sumar_montos_deuda_action"),
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
                self.result_suma_monto = data.get("suma_monto_total", 0)
                self.result_suma_deuda = data.get("suma_deuda", 0)
                self.result_cantidad = data.get("cantidad_clientes", 0)
                self.show_result_dialog = True
            else:
                yield rx.toast.error(f"Error del servidor: {response.status_code}")

        except Exception as e:
            yield rx.toast.error(f"Error inesperado: {str(e)}")
        finally:
            self.actions_loading = False

    # ── Acción: exportar_clientes_csv ──────────────────────────

    async def _accion_exportar_csv(self):
        self.actions_loading = True
        try:
            response = await self.fetch_with_auth(
                url=BULK_URL,
                method="POST",
                json_data=self.build_bulk_payload("exportar_clientes_csv"),
                timeout=120.0,   # 2 minutos para exports grandes
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                csv_content = response.content

                content_disposition = response.headers.get("content-disposition", "")
                filename = "clientes_exportados.csv"
                if "filename=" in content_disposition:
                    filename = content_disposition.split("filename=")[-1].strip('"').strip()

                yield rx.download(data=csv_content, filename=filename)
                yield rx.toast.success(f"Archivo '{filename}' descargado")
                self.clear_selection()
            else:
                yield rx.toast.error(f"Error al exportar: {response.status_code}")

        except Exception as e:
            yield rx.toast.error(f"Error inesperado: {str(e)}")
        finally:
            self.actions_loading = False