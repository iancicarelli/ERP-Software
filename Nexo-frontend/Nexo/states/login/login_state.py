import base64
import json
import time
import reflex as rx
import httpx
from typing import ClassVar
from ...config.settings import API_BASE_URL

# ============================================================================
# BYPASS DE LOGIN (temporal — para revisar las vistas sin backend)
# ----------------------------------------------------------------------------
# Con True, `verify_token` NO redirige a /login: todas las páginas cargan
# directamente (reflex run abre el index). Poné False para restaurar el flujo
# real de autenticación. NO subir a producción con True.
#
# Apagado en la Fase 3 del ROADMAP: el backend ya expone /api/token/,
# /token/refresh/ y /token/verify/ con el contrato de §3.3, y todas las demás
# rutas exigen `Authorization: Bearer`. Para entrar, sembrar el admin con
# `docker compose exec backend npm run prisma:seed`.
# ============================================================================
AUTH_BYPASS = False


class AuthState(rx.State):
    username: str = ""
    password: str = ""
    error_message: str = ""
    is_loading: bool = False
    is_checking_auth: bool = True

    access_token: str = rx.LocalStorage()
    refresh_token: str = rx.LocalStorage()
    logged_in_user: str = rx.LocalStorage()

    # Cliente httpx persistente propio (AuthState no puede usar
    # APIState.get_http_client() porque es su clase padre — ciclo circular).
    _auth_http_client: ClassVar[httpx.AsyncClient | None] = None

    @classmethod
    def get_auth_client(cls) -> httpx.AsyncClient:
        if cls._auth_http_client is None or cls._auth_http_client.is_closed:
            cls._auth_http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0),
                limits=httpx.Limits(
                    max_connections=5,
                    max_keepalive_connections=3,
                ),
            )
        return cls._auth_http_client

    def set_username(self, username: str):
        self.username = username

    def set_password(self, password: str):
        self.password = password

    async def check_already_logged_in(self):
        if self.access_token:
            return rx.redirect("/")

    async def do_login(self):
        self.error_message = ""
        self.is_loading = True
        yield

        url = f"{API_BASE_URL}/token/"
        payload = {"username": self.username, "password": self.password}

        client = self.get_auth_client()
        try:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access", "")
                self.refresh_token = data.get("refresh", "")
                self.logged_in_user = self.username

                self.is_loading = False
                self.username = ""
                self.password = ""
                yield rx.redirect("/")
                return
            else:
                self.error_message = "Credenciales incorrectas."
        except Exception:
            self.error_message = "Error de conexión con el servidor."

        self.is_loading = False

    def _decode_jwt_exp(self, token: str) -> int | None:
        """
        Decodifica el claim `exp` del payload JWT sin verificar firma.
        Retorna el timestamp de expiración o None si el token es inválido/ilegible.
        """
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            payload_b64 = parts[1]
            # Padding base64url
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            payload = json.loads(payload_bytes)
            exp = payload.get("exp")
            return int(exp) if exp is not None else None
        except Exception:
            return None

    async def verify_token(self):
        # --- BYPASS temporal: saltar la verificación para revisar vistas ---
        if AUTH_BYPASS:
            self.is_checking_auth = False
            return
        # --- fin bypass ---

        self.is_checking_auth = True
        yield

        if not self.access_token:
            self.is_checking_auth = False
            yield rx.redirect("/login")
            return

        # Verificación local: leer exp sin llamar a la red
        exp = self._decode_jwt_exp(self.access_token)
        now = time.time()
        REFRESH_THRESHOLD = 300  # refrescar si quedan menos de 5 minutos

        if exp is not None:
            if exp - now > REFRESH_THRESHOLD:
                # Token válido y con margen suficiente — no necesita red
                self.is_checking_auth = False
                return
            else:
                # Expirado o por expirar — refrescar directamente sin verify
                await self.do_refresh()
                return

        # Fallback: no se pudo leer el exp (token corrupto o formato inesperado)
        # Usar el comportamiento original con POST /token/verify/
        url = f"{API_BASE_URL}/token/verify/"
        payload = {"token": self.access_token}

        client = self.get_auth_client()
        try:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                await self.do_refresh()
            else:
                self.is_checking_auth = False
        except Exception:
            self.is_checking_auth = False

    async def do_refresh(self):
        if not self.refresh_token:
            return self.logout()

        url = f"{API_BASE_URL}/token/refresh/"
        payload = {"refresh": self.refresh_token}

        client = self.get_auth_client()
        try:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access", "")
                self.is_checking_auth = False
            else:
                return self.logout()
        except Exception:
            return self.logout()

    def logout(self):
        self.access_token = ""
        self.refresh_token = ""
        self.logged_in_user = ""
        self.is_checking_auth = False

        return rx.redirect("/login")

    async def logout_and_clear(self):
        # Primero limpiar solo el estado local de filtros,
        # SIN disparar _perform_load() (los tokens siguen válidos aquí)
        from ...states.clients.client_table_state import ClientTableState
        from ...states.work_orders.orders_table_state import OrderTableState
        from ...states.service.service_table_state import ServiceTableState
        from ...states.payments.payment_table_state import PaymentTableState
        from ...states.transfers.transfer_table_state import TransferTableState

        yield ClientTableState.clear_filters_only()
        yield OrderTableState.clear_filters_only()
        yield ServiceTableState.clear_filters_only()
        yield PaymentTableState.clear_filters_only()
        yield TransferTableState.clear_filters_only()

        # Luego vaciar tokens y redirigir
        self.access_token = ""
        self.refresh_token = ""
        self.logged_in_user = ""
        self.is_checking_auth = False
        yield rx.redirect("/login")