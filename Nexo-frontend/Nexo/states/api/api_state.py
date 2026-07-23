import reflex as rx
import httpx
import asyncio
from typing import Optional, ClassVar

from ..login.login_state import AuthState


class APIState(AuthState):
    # Mensaje de error de red visible en la UI (vacío = sin error).
    api_error: str = ""

    _http_client: ClassVar[httpx.AsyncClient | None] = None
    _refresh_lock: ClassVar[asyncio.Lock | None] = None

    def set_api_error(self, message: str):
        self.api_error = message

    def clear_api_error(self):
        self.api_error = ""

    @classmethod
    def get_http_client(cls) -> httpx.AsyncClient:
        if cls._http_client is None or cls._http_client.is_closed:
            cls._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0),
                limits=httpx.Limits(
                    max_connections=20,
                    max_keepalive_connections=10,
                ),
            )
        return cls._http_client

    @classmethod
    def get_refresh_lock(cls) -> asyncio.Lock:
        if cls._refresh_lock is None:
            cls._refresh_lock = asyncio.Lock()
        return cls._refresh_lock

    async def fetch_with_auth(
        self,
        url: str,
        method: str = "GET",
        params: dict | None = None,
        json_data: dict | None = None,
        timeout: float = 10.0,
    ) -> Optional[httpx.Response]:

        if not self.access_token:
            print("APIState: No hay access_token, request cancelada")
            return None

        client = self.get_http_client()

        async def _make_request(token: str) -> httpx.Response:
            headers = {"Authorization": f"Bearer {token}"}

            if method == "GET":
                return await client.get(url, params=params, headers=headers, timeout=timeout)

            if method == "POST":
                return await client.post(url, json=json_data, headers=headers, timeout=timeout)

            if method == "PUT":
                return await client.put(url, json=json_data, headers=headers, timeout=timeout)

            if method == "PATCH":
                return await client.patch(url, json=json_data, headers=headers, timeout=timeout)

            if method == "DELETE":
                return await client.delete(url, headers=headers, timeout=timeout)

            raise ValueError(f"Método HTTP no soportado: {method}")

        # Limpiar cualquier error previo antes de intentar la request:
        # si esta tiene éxito, el banner desaparece sin acción del usuario.
        self.api_error = ""

        try:
            token_used = self.access_token
            response = await _make_request(token_used)

            if response.status_code == 401:
                print("APIState: Token expirado, intentando refresh...")

                async with self.get_refresh_lock():
                    # Re-chequear adentro del lock: si otro request ya refrescó
                    # el token mientras esperábamos, no refrescamos de nuevo
                    if self.access_token == token_used:
                        await self.do_refresh()

                if not self.access_token:
                    print("APIState: Refresh falló, usuario debe relogear")
                    return response

                response = await _make_request(self.access_token)

            return response

        except httpx.RequestError as e:
            print(f"APIState: Error de red: {e}")
            self.api_error = "Error de conexión. Verificá tu red e intentá de nuevo."
            return None

        except Exception as e:
            print(f"APIState: Error inesperado: {e}")
            self.api_error = "Ocurrió un error inesperado. Intentá de nuevo."
            return None
