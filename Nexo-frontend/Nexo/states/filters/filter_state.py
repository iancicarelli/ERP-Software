import asyncio
import time
from typing import ClassVar

from ...config.settings import API_BASE_URL
from ...states.api.api_state import APIState


class FilterState(APIState):
    """Carga dinámica de opciones de filtro (sector / zona) desde la API.

    Reemplaza las listas estáticas que vivían en ``config/utils/sector_config.py``
    y ``config/utils/zona_config.py``.

    **Un solo par de endpoints** (``/sectores/`` y ``/zonas/``) para los cuatro
    módulos: clientes, pagos, transferencias y órdenes. Antes había una segunda
    pareja ``/sectores-ordenes/`` y ``/zonas-ordenes/`` solo para órdenes; el
    backend unificó ambas tablas (D3 del ROADMAP) y esas rutas no existen, así
    que ``load_all()`` pasó de 4 llamadas a 2.

    Las opciones se exponen como state vars (para reactividad / inspección) y
    además se espejan en un ``ClassVar`` (``_options_cache``) para que
    ``helper_compute_filters()`` —que corre dentro de un ``@rx.var`` SÍNCRONO de
    cada ``*TableState`` (estado hermano)— pueda leerlas sin un acceso async
    cross-state. El ``@rx.var`` recomputa cuando el usuario activa el filtro
    (cambia ``active_filter_keys``), momento en el que el ClassVar ya fue
    poblado por ``load_all()`` en el ``on_load`` de la página.
    """

    # Los cuatro módulos leen estas dos listas (D3).
    sector_options: list[str] = []
    zona_options: list[str] = []

    # Caché compartida (TTL 30 min). Timestamp por clave, escrito SOLO tras una
    # carga exitosa, nunca antes.
    _cache_ts: ClassVar[dict] = {}
    _FILTER_TTL: ClassVar[int] = 1800  # 30 minutos

    # Espejo síncrono de las opciones, leído por helper_compute_filters().
    _options_cache: ClassVar[dict] = {}

    @classmethod
    def get_options(cls, source: str) -> list:
        """Lectura síncrona usada por helper_compute_filters()."""
        return cls._options_cache.get(source, [])

    @classmethod
    def invalidate_filter_cache(cls, key: str | None = None):
        if key:
            cls._cache_ts.pop(key, None)
            cls._options_cache.pop(key, None)
        else:
            cls._cache_ts.clear()
            cls._options_cache.clear()

    async def _load_paginated(self, endpoint: str, page_size: int = 500) -> list[dict]:
        all_items: list[dict] = []
        page = 1
        has_more = True

        while has_more:
            response = await self.fetch_with_auth(
                url=f"{API_BASE_URL}{endpoint}",
                method="GET",
                params={"page": page, "page_size": page_size},
            )

            if response and response.status_code == 200:
                data = response.json()

                if isinstance(data, dict):
                    items = data.get("results") or data.get("data") or []
                    has_more = data.get("next") is not None
                elif isinstance(data, list):
                    items = data
                    has_more = False
                else:
                    items = []
                    has_more = False

                all_items.extend(items)
                page += 1
            else:
                print(
                    f"Error API {endpoint} (página {page}): "
                    f"{response.status_code if response else 'Sin respuesta'}"
                )
                has_more = False

        return all_items

    async def _fetch_options(self, key: str, endpoint: str, field: str) -> list[str]:
        """Devuelve la lista de opciones para ``key``.

        Si la caché está fresca (< TTL) devuelve el valor cacheado sin red.
        Si está stale, pagina el endpoint, extrae ``field`` de cada ítem,
        deduplica y ordena alfabéticamente. El timestamp se escribe SOLO tras
        una carga exitosa.
        """
        now = time.time()
        if now - self.__class__._cache_ts.get(key, 0) < self._FILTER_TTL:
            return self.__class__._options_cache.get(key, [])

        try:
            all_items = await self._load_paginated(endpoint)
            valores = sorted(
                {
                    str(item.get(field)).strip()
                    for item in all_items
                    if isinstance(item, dict) and item.get(field) not in (None, "")
                }
            )
            self.__class__._options_cache[key] = valores
            self.__class__._cache_ts[key] = time.time()
            return valores
        except Exception as e:
            print(f"Excepción cargando opciones de filtro '{key}': {e}")
            return self.__class__._options_cache.get(key, [])

    async def load_sectores(self):
        self.sector_options = await self._fetch_options("sector", "/sectores/", "sector")

    async def load_zonas(self):
        self.zona_options = await self._fetch_options("zona", "/zonas/", "zona")

    async def load_all(self):
        # Guard de token: en el on_load de la página este handler corre después
        # de AuthState.verify_token (los eventos de on_load se procesan en orden,
        # serializados por sesión). El guard es la red de seguridad ante cualquier
        # carrera residual: si el token aún no está hidratado, salimos en silencio
        # en vez de que fetch_with_auth cancele con "No hay access_token".
        if not self.access_token:
            return
        await asyncio.gather(
            self.load_sectores(),
            self.load_zonas(),
        )
