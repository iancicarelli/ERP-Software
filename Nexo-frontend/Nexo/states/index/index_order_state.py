import asyncio
import datetime
from ...config.settings import API_BASE_URL
from .dashboard_semaphore import get_semaphore


class IndexOrdersState:

    @staticmethod
    async def get_stats(state) -> dict:
        today = datetime.date.today()
        first_day_curr = today.replace(day=1)

        first_day_next = (
            first_day_curr.replace(year=first_day_curr.year + 1, month=1)
            if first_day_curr.month == 12
            else first_day_curr.replace(month=first_day_curr.month + 1)
        )
        first_day_prev = (
            first_day_curr.replace(year=first_day_curr.year - 1, month=12)
            if first_day_curr.month == 1
            else first_day_curr.replace(month=first_day_curr.month - 1)
        )

        curr_after  = first_day_curr.strftime("%Y-%m-%d")
        curr_before = first_day_next.strftime("%Y-%m-%d")
        prev_after  = first_day_prev.strftime("%Y-%m-%d")
        prev_before = first_day_curr.strftime("%Y-%m-%d")

        async def fetch(extra_params):
            params = {"format": "json", "limit": 1, **extra_params}
            try:
                async with get_semaphore():
                    response = await state.fetch_with_auth(
                        url=f"{API_BASE_URL}/ordenes/",
                        method="GET",
                        params=params,
                    )
                if response and response.status_code == 200:
                    return response.json().get("count", 0)
            except Exception as e:
                print(f"Error en IndexOrdersState.fetch: {e}")
            return 0

        (
            por_instalar,
            factibilidad,
            programado,
            ingresos_curr,
            programados_curr,
            contratos_curr,
            ingresos_prev,
            programados_prev,
            contratos_prev,
        ) = await asyncio.gather(
            fetch({"estado_estado": "Por instalar"}),
            fetch({"estado_estado": "Factibilidad"}),
            fetch({"estado_estado": "Programado"}),
            fetch({"fecha_ingreso_after": curr_after,    "fecha_ingreso_before": curr_before}),
            fetch({"fecha_programado_after": curr_after, "fecha_programado_before": curr_before}),
            fetch({"fecha_contrato_after": curr_after,   "fecha_contrato_before": curr_before}),
            fetch({"fecha_ingreso_after": prev_after,    "fecha_ingreso_before": prev_before}),
            fetch({"fecha_programado_after": prev_after, "fecha_programado_before": prev_before}),
            fetch({"fecha_contrato_after": prev_after,   "fecha_contrato_before": prev_before}),
        )

        return {
            "ordenes_por_instalar":     por_instalar,
            "ordenes_factibilidad":     factibilidad,
            "ordenes_programado":       programado,
            "ingresos_mes_actual":      ingresos_curr,
            "programados_mes_actual":   programados_curr,
            "contratos_mes_actual":     contratos_curr,
            "ingresos_mes_anterior":    ingresos_prev,
            "programados_mes_anterior": programados_prev,
            "contratos_mes_anterior":   contratos_prev,
        }
