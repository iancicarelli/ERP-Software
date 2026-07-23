import reflex as rx
from typing import List, Dict, Any, Optional
import time

from ..clients.page_state import PaginatedState
from ...config.settings import API_BASE_URL
from ...states.cache.cache_signal_state import CacheSignalState

class BaseTableState(PaginatedState):
    loading: bool = False
    error: Optional[str] = None
    _cache_data: dict = {}
    _cache_timestamp: dict = {}
    _cache_meta: dict = {}  # cache_key -> {"total_count": int, "has_more": bool}
    _last_load_ts: float = 0.0
    
    def get_endpoint(self) -> str:
        raise NotImplementedError

    async def get_filters(self) -> Dict[str, Any]:
        return {}

    def transform_item(self, item: Dict[str, Any]) -> Any:
        return None

    def set_items(self, items: List[Any]):
        return

    def clear_items(self):
        return

    def get_cache_ttl(self) -> int:
        return 0

    def invalidate_cache(self):
        self._cache_data = {}
        self._cache_timestamp = {}
        self._cache_meta.clear()

    async def _prefetch_next(self):
        if not self._has_more:
            return

        ttl = self.get_cache_ttl()
        if ttl == 0:
            return

        try:
            endpoint = self.get_endpoint()
        except NotImplementedError:
            return

        import json

        filter_params = await self.get_filters()
        cache_key = f"{endpoint}_{self.page + 1}_{json.dumps(filter_params, sort_keys=True)}"

        if cache_key in self._cache_data:
            age = time.time() - self._cache_timestamp.get(cache_key, 0)
            if age < ttl:
                return

        url = f"{API_BASE_URL}{endpoint}"
        params = {
            "page": self.page + 1,
            "page_size": self.page_size,
            "format": "json"
        }
        params.update(filter_params)

        try:
            response = await self.fetch_with_auth(url=url, method="GET", params=params)
            if not response or response.status_code != 200:
                return

            data = response.json()
            if not isinstance(data, dict):
                return

            results = data.get("results", [])
            mapped_items = [
                self.transform_item(item)
                for item in results
                if isinstance(item, dict)
            ]
            mapped_items = [i for i in mapped_items if i is not None]

            self._cache_data[cache_key] = mapped_items
            self._cache_meta[cache_key] = {
                "total_count": self.total_count,
                "has_more": self._has_more,
            }
            self._cache_timestamp[cache_key] = time.time()
        except Exception:
            pass

    async def _perform_load(self):
        try:
            endpoint = self.get_endpoint()
        except NotImplementedError:
            return

        self.loading = True
        self.error = None

        url = f"{API_BASE_URL}{endpoint}"

        params = {
            "page": self.page,
            "page_size": self.page_size,
            "format": "json"
        }

        try:
            filter_params = await self.get_filters()
            params.update(filter_params)

            ttl = self.get_cache_ttl()
            cache_key = None
            if ttl > 0:
                import json
                signal = await self.get_state(CacheSignalState)
                endpoint_key = endpoint.strip("/").split("/")[-1]
                last_mutation = signal.mutation_timestamps.get(endpoint_key, 0)
                if last_mutation > self._last_load_ts:
                    self.invalidate_cache()

                cache_key = f"{endpoint}_{self.page}_{json.dumps(filter_params, sort_keys=True)}"
                if cache_key in self._cache_data:
                    age = time.time() - self._cache_timestamp.get(cache_key, 0)
                    if age < ttl:
                        self.set_items(self._cache_data[cache_key])
                        meta = self._cache_meta.get(cache_key)
                        if meta:
                            self.total_count = meta["total_count"]
                            self._has_more = meta["has_more"]
                        self.loading = False
                        return

            response = await self.fetch_with_auth(url=url, method="GET", params=params)

            if not response:
                self._handle_error()
                return

            if response.status_code != 200:
                print(f"API Error {response.status_code}: {response.text}")
                if response.status_code == 401:
                    return self.logout()
                    
                self._handle_error()
                return

            data = response.json()

            if not isinstance(data, dict):
                self._handle_error()
                return

            results = data.get("results", [])
            self.total_count = data.get("count", 0)
            self._has_more = data.get("next") is not None

            mapped_items = [
                self.transform_item(item) 
                for item in results 
                if isinstance(item, dict)
            ]
            mapped_items = [i for i in mapped_items if i is not None]

            if ttl > 0 and cache_key is not None:
                self._cache_data[cache_key] = mapped_items
                self._cache_meta[cache_key] = {
                    "total_count": self.total_count,
                    "has_more": self._has_more,
                }
                self._cache_timestamp[cache_key] = time.time()
                self._last_load_ts = time.time()

            self.set_items(mapped_items)
            if ttl > 0:
                await self._prefetch_next()

        except Exception as e:
            import traceback
            print(f"Connection Error: {e}")
            print(traceback.format_exc())
            self._handle_error()
        finally:
            self.loading = False

    async def load_page(self):
        await self._perform_load()

    def _handle_error(self):
        self.clear_items()
        self.total_count = 0
        self._has_more = False

    async def reset_and_reload(self):
        self.page = 1
        await self._perform_load() 

    async def go_to_page(self, page: int):
        if page == self.page:
            return
        self.page = page
        await self._perform_load() 

    async def next_page(self):
        if self._has_more:
            self.page += 1
            await self._perform_load() 

    async def prev_page(self):
        if self.page > 1:
            self.page -= 1
            await self._perform_load()