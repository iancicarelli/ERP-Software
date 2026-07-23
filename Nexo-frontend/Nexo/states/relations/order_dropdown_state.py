import asyncio
import time
from typing import ClassVar
import reflex as rx
from ...config.settings import API_BASE_URL
from ...states.api.api_state import APIState


class OrderDropdownState(APIState):
    servicios_options: list[list[str]] = []
    estados_options: list[list[str]] = []
    causas_options: list[list[str]] = []
    zonas_options: list[list[str]] = []
    sectores_options: list[list[str]] = []
    sectores_filtrados_options: list[list[str]] = []
    tecnicos_options: list[list[str]] = []
    vendedores_options: list[list[str]] = []

    loading_servicios: bool = False
    loading_estados: bool = False
    loading_causas: bool = False
    loading_zonas: bool = False
    loading_sectores: bool = False
    loading_tecnicos: bool = False
    loading_vendedores: bool = False

    _sectores_raw: list[dict] = []

    # Cache TTL (compartido entre instancias) para catálogos casi estáticos.
    _dropdown_cache_ts: ClassVar[dict] = {}
    _DROPDOWN_TTL: ClassVar[int] = 600  # 10 minutos

    @classmethod
    def invalidate_dropdown_cache(cls):
        cls._dropdown_cache_ts.clear()

    @staticmethod
    def get_id_by_label(options: list[list[str]], label: str) -> int:
        for item in options:
            if item[1] == label:
                return int(item[0])
        return 0

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
                    next_page = data.get("next")
                    has_more = next_page is not None
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

    async def load_servicios(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("servicios", 0) < self._DROPDOWN_TTL:
            return
        self.loading_servicios = True
        try:
            all_items = await self._load_paginated("/servicios-ordenes/")
            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_label = str(item.get("servicio", "Sin nombre"))
                    opciones.append([item_id, item_label])
            self.servicios_options = opciones
            self.__class__._dropdown_cache_ts["servicios"] = time.time()
        except Exception as e:
            print(f"Excepción cargando servicios: {e}")
        finally:
            self.loading_servicios = False

    async def load_estados(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("estados", 0) < self._DROPDOWN_TTL:
            return
        self.loading_estados = True
        try:
            all_items = await self._load_paginated("/estados-ordenes/")
            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_label = str(item.get("estado", "Sin nombre"))
                    opciones.append([item_id, item_label])
            self.estados_options = opciones
            self.__class__._dropdown_cache_ts["estados"] = time.time()
        except Exception as e:
            print(f"Excepción cargando estados: {e}")
        finally:
            self.loading_estados = False

    async def load_causas(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("causas", 0) < self._DROPDOWN_TTL:
            return
        self.loading_causas = True
        try:
            all_items = await self._load_paginated("/causas-ordenes/")
            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_label = str(item.get("causa", "Sin nombre"))
                    opciones.append([item_id, item_label])
            self.causas_options = opciones
            self.__class__._dropdown_cache_ts["causas"] = time.time()
        except Exception as e:
            print(f"Excepción cargando causas: {e}")
        finally:
            self.loading_causas = False

    async def load_zonas(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("zonas", 0) < self._DROPDOWN_TTL:
            return
        self.loading_zonas = True
        try:
            all_items = await self._load_paginated("/zonas-ordenes/")
            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_label = str(item.get("zona", "Sin nombre"))
                    opciones.append([item_id, item_label])
            self.zonas_options = opciones
            self.__class__._dropdown_cache_ts["zonas"] = time.time()
        except Exception as e:
            print(f"Excepción cargando zonas: {e}")
        finally:
            self.loading_zonas = False

    async def load_sectores(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("sectores", 0) < self._DROPDOWN_TTL:
            return
        self.loading_sectores = True
        try:
            all_items = await self._load_paginated("/sectores-ordenes/")
            self._sectores_raw = [item for item in all_items if isinstance(item, dict)]
            opciones = []
            for item in self._sectores_raw:
                item_id = str(item.get("id", ""))
                item_label = str(item.get("sector", "Sin nombre"))
                opciones.append([item_id, item_label])
            self.sectores_options = opciones
            self.sectores_filtrados_options = list(opciones)
            self.__class__._dropdown_cache_ts["sectores"] = time.time()
        except Exception as e:
            print(f"Excepción cargando sectores: {e}")
        finally:
            self.loading_sectores = False

    async def load_tecnicos(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("tecnicos", 0) < self._DROPDOWN_TTL:
            return
        self.loading_tecnicos = True
        try:
            all_items = await self._load_paginated("/tecnicos-ordenes/")
            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    nombre1 = item.get("nombre1") or ""
                    apellido1 = item.get("apellido1") or ""
                    apellido2 = item.get("apellido2") or ""
                    item_label = f"{nombre1} {apellido1} {apellido2}".strip()
                    opciones.append([item_id, item_label or "Sin nombre"])
            self.tecnicos_options = opciones
            self.__class__._dropdown_cache_ts["tecnicos"] = time.time()
        except Exception as e:
            print(f"Excepción cargando técnicos: {e}")
        finally:
            self.loading_tecnicos = False

    async def load_vendedores(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("vendedores", 0) < self._DROPDOWN_TTL:
            return
        self.loading_vendedores = True
        try:
            all_items = await self._load_paginated("/vendedores-ordenes/")
            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    nombre1 = item.get("nombre1") or ""
                    apellido1 = item.get("apellido1") or ""
                    apellido2 = item.get("apellido2") or ""
                    item_label = f"{nombre1} {apellido1} {apellido2}".strip()
                    opciones.append([item_id, item_label or "Sin nombre"])
            self.vendedores_options = opciones
            self.__class__._dropdown_cache_ts["vendedores"] = time.time()
        except Exception as e:
            print(f"Excepción cargando vendedores: {e}")
        finally:
            self.loading_vendedores = False


    async def load_all_order_dropdowns(self):
        await asyncio.gather(
            self.load_servicios(),
            self.load_estados(),
            self.load_causas(),
            self.load_zonas(),
            self.load_sectores(),
            self.load_tecnicos(),
            self.load_vendedores(),
        )

    def filter_sectores_by_zona_id(self, zona_id: int):
        if not zona_id:
            self.sectores_filtrados_options = list(self.sectores_options)
            return

        filtrados = []
        for item in self._sectores_raw:
            if item.get("zona") == zona_id:
                item_id = str(item.get("id", ""))
                item_label = str(item.get("sector", "Sin nombre"))
                filtrados.append([item_id, item_label])
        self.sectores_filtrados_options = filtrados
