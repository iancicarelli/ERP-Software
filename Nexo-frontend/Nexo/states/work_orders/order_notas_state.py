import reflex as rx
from typing import Optional

from ...dtos.work_orders.nota_dto import NotaDTO
from ...states.api.api_state import APIState
from ...config.settings import API_BASE_URL


class OrderNotasState(APIState):
    notas: list[NotaDTO] = []
    nueva_nota: str = ""
    loading: bool = False
    is_saving: bool = False
    error: Optional[str] = None

    async def load_notas_for_current_order(self, orden_id: int):
        self.loading = True
        self.error = None
        self.notas = []

        try:
            if not orden_id or orden_id <= 0:
                self.loading = False
                return

            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}/notas-ordenes/",
                method="GET",
                params={"orden_trabajo_id": orden_id, "page_size": 100},
            )

            if not response:
                self.error = "Error de conexion con el servidor."
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 200:
                data = response.json()
                results = []
                if isinstance(data, dict):
                    results = data.get("results") or data.get("data") or []
                elif isinstance(data, list):
                    results = data

                for item in results:
                    fc = item.get("fecha_creacion", "") or ""
                    if "T" in fc:
                        item["fecha_creacion"] = fc[:10] + " " + fc[11:16]
                self.notas = [NotaDTO(**item) for item in results]
            else:
                self.error = f"Error {response.status_code} al cargar notas."

        except Exception as e:
            self.error = f"Error al cargar notas: {e}"

        finally:
            self.loading = False

    def set_nueva_nota(self, value: str):
        self.nueva_nota = value

    async def add_nota(self):
        if not self.nueva_nota or not self.nueva_nota.strip():
            yield rx.toast.warning("Debe escribir una nota")
            return

        from ...states.work_orders.orders_detail_state import OrderDetailState

        self.is_saving = True
        self.error = None

        try:
            detail_state = await self.get_state(OrderDetailState)
            if not detail_state.orden or not detail_state.orden.id:
                yield rx.toast.error("No se encontro la orden actual")
                return

            orden_id = detail_state.orden.id

            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}/notas-ordenes/",
                method="POST",
                json_data={
                    "orden_trabajo": orden_id,
                    "nota": self.nueva_nota.strip(),
                },
            )

            if not response:
                yield rx.toast.error("No se pudo conectar con el servidor")
                return

            if response.status_code == 401:
                yield self.logout()
                return

            if response.status_code == 201:
                self.nueva_nota = ""
                yield rx.toast.success("Nota agregada correctamente")
                detail_state = await self.get_state(OrderDetailState)
                orden_id = detail_state.orden.id
                yield OrderNotasState.load_notas_for_current_order(orden_id)
            else:
                try:
                    error_detail = response.json()
                    if isinstance(error_detail, dict):
                        msgs = []
                        for campo, errores in error_detail.items():
                            if isinstance(errores, list):
                                msgs.append(f"{campo}: {', '.join(str(e) for e in errores)}")
                            else:
                                msgs.append(f"{campo}: {errores}")
                        error_msg = " | ".join(msgs) if msgs else f"Error {response.status_code}"
                    else:
                        error_msg = str(error_detail)
                except Exception:
                    error_msg = f"Error {response.status_code}"
                yield rx.toast.error(f"Error al crear nota: {error_msg}")

        except Exception as e:
            yield rx.toast.error(f"Error procesando la solicitud: {str(e)}")

        finally:
            self.is_saving = False
