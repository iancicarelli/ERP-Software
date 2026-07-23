import asyncio
import datetime
from ...config.settings import API_BASE_URL
from .dashboard_semaphore import get_semaphore


class IndexTransferState:
    @staticmethod
    async def get_stats(state) -> dict:

        today = datetime.date.today()
        tomorrow = today + datetime.timedelta(days=1)

        # semana actual (lunes → hoy)
        start_of_week = today - datetime.timedelta(days=today.weekday())

        # mes actual (día 1 → hoy)
        start_of_month = today.replace(day=1)

        # formateo
        today_after = today.strftime("%Y-%m-%d")
        today_before = tomorrow.strftime("%Y-%m-%d")

        week_after = start_of_week.strftime("%Y-%m-%d")
        week_before = tomorrow.strftime("%Y-%m-%d")

        month_after = start_of_month.strftime("%Y-%m-%d")
        month_before = tomorrow.strftime("%Y-%m-%d")


        async def fetch(extra_params):
            params = {
                "format": "json",
                "limit": 1,
                **extra_params
            }

            try:
                async with get_semaphore():
                    response = await state.fetch_with_auth(
                        url=f"{API_BASE_URL}/transferencias/",
                        method="GET",
                        params=params,
                    )

                if response and response.status_code == 200:
                    data = response.json()
                    return data.get("count", 0)

            except Exception as e:
                print(f"Error en IndexTransferState.fetch: {e}")

            return 0

        (
            transferencias_hoy,
            transferencias_semana_actual,
            transferencias_mes_actual,
            transferencias_con_cliente,
            transferencias_sin_cliente_registrado,
        ) = await asyncio.gather(

            fetch({
                "fecha_after": today_after,
                "fecha_before": today_before
            }),

            fetch({
                "fecha_after": week_after,
                "fecha_before": week_before
            }),

            fetch({
                "fecha_after": month_after,
                "fecha_before": month_before
            }),

            fetch({
                "cliente_existe": "true"
            }),

            fetch({
                "cliente_existe": "false"
            }),
        )

        return {
            "transferencias_hoy": transferencias_hoy,
            "transferencias_semana_actual": transferencias_semana_actual,
            "transferencias_mes_actual": transferencias_mes_actual,
            "transferencias_con_cliente": transferencias_con_cliente,
            "transferencias_sin_cliente_registrado": transferencias_sin_cliente_registrado,
        }