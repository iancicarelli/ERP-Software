import reflex as rx
from ...states.base.base_actions_state import BaseActionsState
from ...config.settings import API_BASE_URL

BULK_URL = f"{API_BASE_URL}/ordenes/bulk-action/"


class OrderActionsState(BaseActionsState):

    # ── Dispatcher ─────────────────────────────────────────────

    async def ejecutar_accion(self):
        if not self.selected_ids:
            yield rx.toast.warning("Seleccioná al menos un registro")
            return
        if not self.selected_action:
            yield rx.toast.warning("Seleccioná una acción")
            return

        if self.selected_action == "exportar_ordenes_csv":
            async for event in self._accion_exportar_csv():
                yield event
        elif self.selected_action == "imprimir_orden_de_trabajo":
            async for event in self._accion_imprimir_ot():
                yield event
        else:
            yield rx.toast.error(f"Acción no implementada: {self.selected_action}")

    # ── Acción: exportar_ordenes_csv ───────────────────────────

    async def _accion_exportar_csv(self):
        self.actions_loading = True
        try:
            response = await self.fetch_with_auth(
                url=BULK_URL,
                method="POST",
                json_data=self.build_bulk_payload("exportar_ordenes_csv"),
                timeout=30.0,
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
                filename = "ordenes_exportadas.csv"
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

    # ── Acción: imprimir_orden_de_trabajo ──────────────────────

    async def _accion_imprimir_ot(self):
        self.actions_loading = True
        try:
            response = await self.fetch_with_auth(
                url=BULK_URL,
                method="POST",
                json_data=self.build_bulk_payload("imprimir_orden_de_trabajo"),
                timeout=60.0,
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                pdf_content = response.content

                content_disposition = response.headers.get("content-disposition", "")
                filename = "orden_de_trabajo.pdf"
                if "filename=" in content_disposition:
                    filename = content_disposition.split("filename=")[-1].strip('"').strip()

                yield rx.download(data=pdf_content, filename=filename)
                yield rx.toast.success(f"Archivo '{filename}' descargado")
                self.clear_selection()
            else:
                yield rx.toast.error(f"Error al imprimir: {response.status_code}")

        except Exception as e:
            yield rx.toast.error(f"Error inesperado: {str(e)}")
        finally:
            self.actions_loading = False
