import asyncio


_DASHBOARD_SEMAPHORE: asyncio.Semaphore | None = None


def get_semaphore() -> asyncio.Semaphore:
    global _DASHBOARD_SEMAPHORE
    if _DASHBOARD_SEMAPHORE is None:
        # TODO: bajar a 1 cuando exista /dashboard/stats/
        _DASHBOARD_SEMAPHORE = asyncio.Semaphore(10)
    return _DASHBOARD_SEMAPHORE
