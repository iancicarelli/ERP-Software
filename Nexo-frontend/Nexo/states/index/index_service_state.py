import asyncio
from ...config.settings import API_BASE_URL
from .dashboard_semaphore import get_semaphore


class IndexServiceState:
    @staticmethod
    async def get_stats(state) -> dict:
        async def fetch(extra_params):
            params = {"format": "json", "limit": 1, **extra_params}
            try:
                async with get_semaphore():
                    response = await state.fetch_with_auth(
                        url=f"{API_BASE_URL}/servicios/",
                        method="GET",
                        params=params,
                    )
                if response and response.status_code == 200:
                    return response.json().get("count", 0)
            except Exception as e:
                print(f"Error en IndexServiceState.fetch: {e}")
            return 0

        (
            servicios_activos,
            servicios_plan_duo_clasico,
            servicios_plan_duo_premium,
            servicios_plan_duo_superior,
            servicios_internet_clasico,
            servicios_internet_premium,
            servicios_internet_superior,
            servicios_tv_fibra_optica,
            servicios_tv_analogo,
        ) = await asyncio.gather(
            fetch({"activo": "true"}),
            fetch({"elemento_elemento": "PLAN DUO CLASICO"}),
            fetch({"elemento_elemento": "PLAN DUO PREMIUM"}),
            fetch({"elemento_elemento": "PLAN DUO SUPERIOR"}),
            fetch({"elemento_elemento": "INTERNET CLASICO"}),
            fetch({"elemento_elemento": "INTERNET PREMIUM"}),
            fetch({"elemento_elemento": "INTERNET SUPERIOR"}),
            fetch({"elemento_elemento": "TV FIBRA OPTICA"}),
            fetch({"elemento_elemento": "TV ANALOGO"}),
        )

        return {
            "servicios_activos": servicios_activos,
            "servicios_plan_duo_clasico": servicios_plan_duo_clasico,
            "servicios_plan_duo_premium": servicios_plan_duo_premium,
            "servicios_plan_duo_superior": servicios_plan_duo_superior,
            "servicios_internet_clasico": servicios_internet_clasico,
            "servicios_internet_premium": servicios_internet_premium,
            "servicios_internet_superior": servicios_internet_superior,
            "servicios_tv_fibra_optica": servicios_tv_fibra_optica,
            "servicios_tv_analogo": servicios_tv_analogo,
        }
