import reflex as rx
import time


class CacheSignalState(rx.State):

    mutation_timestamps: dict = {}

    @staticmethod
    def _normalize(endpoint: str) -> str:
        return endpoint.strip("/").split("/")[-1]

    def invalidate(self, endpoint: str):
        """Event handler: registra mutación para un endpoint."""
        key = self._normalize(endpoint)
        updated = self.mutation_timestamps.copy()
        updated[key] = time.time()
        self.mutation_timestamps = updated

    def is_stale(self, endpoint: str, last_load_ts: float) -> bool:
        key = self._normalize(endpoint)
        return self.mutation_timestamps.get(key, 0) > last_load_ts
