import time
from typing import ClassVar
import reflex as rx
from ...config.settings import API_BASE_URL
from ...states.api.api_state import APIState

class DropdownState(APIState):
    elementos_options: list[list[str]] = []
    direcciones_options: list[list[str]] = []
    sectores_options: list[list[str]] = []

    loading_elementos: bool = False
    loading_direcciones: bool = False
    loading_sectores: bool = False

    # Cache TTL (compartido entre instancias) para catálogos casi estáticos.
    _dropdown_cache_ts: ClassVar[dict] = {}
    _DROPDOWN_TTL: ClassVar[int] = 600  # 10 minutos

    @classmethod
    def invalidate_dropdown_cache(cls):
        cls._dropdown_cache_ts.clear()

    async def load_elementos(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("elementos", 0) < self._DROPDOWN_TTL:
            return
        self.loading_elementos = True
        try:
            all_items = []
            page = 1
            has_more = True
            
            while has_more:
                response = await self.fetch_with_auth(
                    url=f"{API_BASE_URL}/elementos/",
                    method="GET",
                    params={"page": page, "page_size": 500}
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
                    print(f"Error API Elementos (página {page}): {response.status_code if response else 'Sin respuesta'}")
                    has_more = False

            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_nombre = str(item.get("elemento", "Sin nombre"))
                    opciones.append([item_id, item_nombre])

            self.elementos_options = opciones
            self.__class__._dropdown_cache_ts["elementos"] = time.time()

        except Exception as e:
            print(f"Excepción cargando elementos: {e}")
            
        finally:
            self.loading_elementos = False

    async def load_direcciones_by_cliente(self, cliente_id: int):
        if not cliente_id or cliente_id <= 0:
            self.direcciones_options = []
            return

        self.loading_direcciones = True
        try:
            all_items = []
            page = 1
            has_more = True

            while has_more:
                response = await self.fetch_with_auth(
                    url=f"{API_BASE_URL}/direcciones/",
                    method="GET",
                    params={"cliente_id": cliente_id, "page": page, "page_size": 500}
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
                    print(f"Error API Direcciones (página {page}): {response.status_code if response else 'Sin respuesta'}")
                    has_more = False

            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_dir = str(item.get("direccion", "Sin dirección"))
                    opciones.append([item_id, item_dir])
                        
            self.direcciones_options = opciones
                
        except Exception as e:
            print(f"Excepción cargando direcciones: {e}")
            
        finally:
            self.loading_direcciones = False

    async def load_sectores(self):
        now = time.time()
        if now - self.__class__._dropdown_cache_ts.get("sectores", 0) < self._DROPDOWN_TTL:
            return
        self.loading_sectores = True
        try:
            all_items = []
            page = 1
            has_more = True

            while has_more:
                response = await self.fetch_with_auth(
                    url=f"{API_BASE_URL}/sectores/",
                    method="GET",
                    params={"page": page, "page_size": 500}
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
                    print(f"Error API Sectores (página {page}): {response.status_code if response else 'Sin respuesta'}")
                    has_more = False

            opciones = []
            for item in all_items:
                if isinstance(item, dict):
                    item_id = str(item.get("id", ""))
                    item_nombre = f"{item.get('sector', 'Sin nombre')} ({item.get('zona_str', '')})"
                    opciones.append([item_id, item_nombre])

            self.sectores_options = opciones
            self.__class__._dropdown_cache_ts["sectores"] = time.time()

        except Exception as e:
            print(f"Excepción cargando sectores: {e}")

        finally:
            self.loading_sectores = False