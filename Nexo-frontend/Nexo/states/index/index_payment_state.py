import asyncio
import datetime
from ...config.settings import API_BASE_URL
from .dashboard_semaphore import get_semaphore


class IndexPaymentState:

    @staticmethod
    async def get_stats(state) -> dict:
        today = datetime.date.today()
        tomorrow = today + datetime.timedelta(days=1)

        start_of_week = today - datetime.timedelta(days=today.weekday())  # Monday
        end_of_week = start_of_week + datetime.timedelta(days=6)  # Sunday

        start_of_month = today.replace(day=1)
        start_of_next_month = (
            start_of_month.replace(year=start_of_month.year + 1, month=1)
            if start_of_month.month == 12
            else start_of_month.replace(month=start_of_month.month + 1)
        )

        today_after = today.strftime("%Y-%m-%d")
        today_before = tomorrow.strftime("%Y-%m-%d")
        week_after = start_of_week.strftime("%Y-%m-%d")
        # `entryDate_before` is treated as upper bound, so we use Monday next week.
        week_before = (end_of_week + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        month_after = start_of_month.strftime("%Y-%m-%d")
        month_before = start_of_next_month.strftime("%Y-%m-%d")

        async def fetch(extra_params):
            params = {"format": "json", "limit": 1, **extra_params}
            try:
                async with get_semaphore():
                    response = await state.fetch_with_auth(
                        url=f"{API_BASE_URL}/pagos/",
                        method="GET",
                        params=params,
                    )
                if response and response.status_code == 200:
                    return response.json().get("count", 0)
            except Exception as e:
                print(f"Error en IndexPaymentState.fetch: {e}")
            return 0

        (
            pagos_hoy,
            pagos_semana_actual,
            pagos_mes_actual,
            pagos_clientes_existentes,
            pagos_sin_cliente_registrado,
        ) = await asyncio.gather(
            fetch({"entryDate_after": today_after, "entryDate_before": today_before}),
            fetch({"entryDate_after": week_after, "entryDate_before": week_before}),
            fetch({"entryDate_after": month_after, "entryDate_before": month_before}),
            fetch({"cliente_existe": "true"}),
            fetch({"cliente_existe": "false"}),
        )

        return {
            "pagos_hoy": pagos_hoy,
            "pagos_semana_actual": pagos_semana_actual,
            "pagos_mes_actual": pagos_mes_actual,
            "pagos_clientes_existentes": pagos_clientes_existentes,
            "pagos_sin_cliente_registrado": pagos_sin_cliente_registrado,
        }
