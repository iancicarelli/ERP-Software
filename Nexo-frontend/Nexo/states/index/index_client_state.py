import asyncio
import datetime
from ...config.settings import API_BASE_URL
from .dashboard_semaphore import get_semaphore


class IndexClientState:

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

        curr_after = first_day_curr.strftime("%Y-%m-%d")
        curr_before = first_day_next.strftime("%Y-%m-%d")
        prev_after = first_day_prev.strftime("%Y-%m-%d")
        prev_before = first_day_curr.strftime("%Y-%m-%d")

        async def fetch(extra_params):
            params = {"format": "json", "limit": 1, **extra_params}
            try:
                async with get_semaphore():
                    response = await state.fetch_with_auth(
                        url=f"{API_BASE_URL}/clientes/",
                        method="GET",
                        params=params,
                    )
                if response and response.status_code == 200:
                    return response.json().get("count", 0)
            except Exception as e:
                print(f"Error en IndexClientState.fetch: {e}")
            return 0

        (
            activos,
            por_instalar,
            morosos,
            creados_curr,
            morosos_desde_curr,
            bajas_curr,
            creados_prev,
            morosos_desde_prev,
            bajas_prev,
        ) = await asyncio.gather(
            fetch({"activo": "true"}),
            fetch({"por_instalar": "true"}),
            fetch({"moroso": "true", "activo": "true"}),
            fetch({"fecha_creacion_after": curr_after, "fecha_creacion_before": curr_before}),
            fetch({"moroso_desde_after": curr_after, "moroso_desde_before": curr_before}),
            fetch({"fecha_de_baja_after": curr_after, "fecha_de_baja_before": curr_before}),
            fetch({"fecha_creacion_after": prev_after, "fecha_creacion_before": prev_before}),
            fetch({"moroso_desde_after": prev_after, "moroso_desde_before": prev_before}),
            fetch({"fecha_de_baja_after": prev_after, "fecha_de_baja_before": prev_before}),
        )

        return {
            "total_clientes_activos": activos,
            "clientes_por_instalar": por_instalar,
            "clientes_morosos": morosos,
            "clientes_creados_mes_actual": creados_curr,
            "clientes_morosos_mes_actual": morosos_desde_curr,
            "clientes_bajas_mes_actual": bajas_curr,
            "clientes_creados_mes_anterior": creados_prev,
            "clientes_morosos_mes_anterior": morosos_desde_prev,
            "clientes_bajas_mes_anterior": bajas_prev,
            "fecha_creacion_after": curr_after,
            "fecha_creacion_before": curr_before,
            "moroso_desde_after": curr_after,
            "moroso_desde_before": curr_before,
            "fecha_de_baja_after": curr_after,
            "fecha_de_baja_before": curr_before,
            "fecha_creacion_prev_after": prev_after,
            "fecha_creacion_prev_before": prev_before,
            "moroso_desde_prev_after": prev_after,
            "moroso_desde_prev_before": prev_before,
            "fecha_de_baja_prev_after": prev_after,
            "fecha_de_baja_prev_before": prev_before,
        }
