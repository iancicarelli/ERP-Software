import asyncio
import time
from typing import Any, ClassVar
from ...states.api.api_state import APIState
from ...states.cache.cache_signal_state import CacheSignalState
from .index_client_state import IndexClientState
from .index_order_state import IndexOrdersState
from .index_service_state import IndexServiceState
from .index_payment_state import IndexPaymentState
from .index_transfer_state import IndexTransferState


CACHE_TTL_SECONDS = 120

# Endpoint slugs (as normalized by CacheSignalState) that should invalidate
# the dashboard cache when mutated.
TRACKED_SIGNAL_KEYS = ("clientes", "ordenes", "servicios", "pagos", "transferencias")


class IndexState(APIState):
    _cache_data: ClassVar[dict[str, dict[str, Any]] | None] = None
    _cache_timestamp: ClassVar[float] = 0.0
    _cache_ttl: ClassVar[int] = CACHE_TTL_SECONDS
    _cache_lock: ClassVar[asyncio.Lock | None] = None

    # ── Clientes
    total_clientes_activos: int = 0
    clientes_por_instalar: int = 0
    clientes_morosos: int = 0
    clientes_creados_mes_actual: int = 0
    clientes_morosos_mes_actual: int = 0
    clientes_bajas_mes_actual: int = 0
    clientes_creados_mes_anterior: int = 0
    clientes_morosos_mes_anterior: int = 0
    clientes_bajas_mes_anterior: int = 0
    fecha_creacion_after: str = ""
    fecha_creacion_before: str = ""
    moroso_desde_after: str = ""
    moroso_desde_before: str = ""
    fecha_de_baja_after: str = ""
    fecha_de_baja_before: str = ""
    fecha_creacion_prev_after: str = ""
    fecha_creacion_prev_before: str = ""
    moroso_desde_prev_after: str = ""
    moroso_desde_prev_before: str = ""
    fecha_de_baja_prev_after: str = ""
    fecha_de_baja_prev_before: str = ""

    # ── Órdenes
    ordenes_por_instalar: int = 0
    ordenes_factibilidad: int = 0
    ordenes_programado: int = 0
    ingresos_mes_actual: int = 0
    programados_mes_actual: int = 0
    contratos_mes_actual: int = 0
    ingresos_mes_anterior: int = 0
    programados_mes_anterior: int = 0
    contratos_mes_anterior: int = 0

    # ── Servicios
    servicios_activos: int = 0
    servicios_plan_duo_clasico: int = 0
    servicios_plan_duo_premium: int = 0
    servicios_plan_duo_superior: int = 0
    servicios_internet_clasico: int = 0
    servicios_internet_premium: int = 0
    servicios_internet_superior: int = 0
    servicios_tv_fibra_optica: int = 0
    servicios_tv_analogo: int = 0

    # ── Pagos
    pagos_hoy: int = 0
    pagos_semana_actual: int = 0
    pagos_mes_actual: int = 0
    pagos_clientes_existentes: int = 0
    pagos_sin_cliente_registrado: int = 0

    # ── Transferencias
    transferencias_hoy: int = 0
    transferencias_semana_actual: int = 0
    transferencias_mes_actual: int = 0
    transferencias_con_cliente: int = 0
    transferencias_sin_cliente_registrado: int = 0

    @classmethod
    def _has_valid_cache(cls) -> bool:
        return (
            cls._cache_data is not None
            and (time.time() - cls._cache_timestamp) < cls._cache_ttl
        )

    @classmethod
    def _clear_cache(cls) -> None:
        cls._cache_data = None
        cls._cache_timestamp = 0.0

    @staticmethod
    async def _compute_dashboard_stats(state) -> dict[str, dict[str, Any]]:
        results = await asyncio.gather(
            IndexClientState.get_stats(state),
            IndexOrdersState.get_stats(state),
            IndexServiceState.get_stats(state),
            IndexPaymentState.get_stats(state),
            IndexTransferState.get_stats(state),
        )
        clientes, orders, services, payments, transfers = results
        return {
            "clientes": clientes,
            "orders": orders,
            "services": services,
            "payments": payments,
            "transfers": transfers,
        }

    def _apply_dashboard_stats(self, data: dict[str, dict[str, Any]]) -> None:
        clientes = data["clientes"]
        orders = data["orders"]
        services = data["services"]
        payments = data["payments"]
        transfers = data["transfers"]

        # Clientes
        self.total_clientes_activos   = clientes["total_clientes_activos"]
        self.clientes_por_instalar    = clientes["clientes_por_instalar"]
        self.clientes_morosos         = clientes["clientes_morosos"]
        self.clientes_creados_mes_actual   = clientes["clientes_creados_mes_actual"]
        self.clientes_morosos_mes_actual   = clientes["clientes_morosos_mes_actual"]
        self.clientes_bajas_mes_actual     = clientes["clientes_bajas_mes_actual"]
        self.clientes_creados_mes_anterior = clientes["clientes_creados_mes_anterior"]
        self.clientes_morosos_mes_anterior = clientes["clientes_morosos_mes_anterior"]
        self.clientes_bajas_mes_anterior   = clientes["clientes_bajas_mes_anterior"]
        self.fecha_creacion_after      = clientes["fecha_creacion_after"]
        self.fecha_creacion_before     = clientes["fecha_creacion_before"]
        self.moroso_desde_after        = clientes["moroso_desde_after"]
        self.moroso_desde_before       = clientes["moroso_desde_before"]
        self.fecha_de_baja_after       = clientes["fecha_de_baja_after"]
        self.fecha_de_baja_before      = clientes["fecha_de_baja_before"]
        self.fecha_creacion_prev_after = clientes["fecha_creacion_prev_after"]
        self.fecha_creacion_prev_before = clientes["fecha_creacion_prev_before"]
        self.moroso_desde_prev_after   = clientes["moroso_desde_prev_after"]
        self.moroso_desde_prev_before  = clientes["moroso_desde_prev_before"]
        self.fecha_de_baja_prev_after  = clientes["fecha_de_baja_prev_after"]
        self.fecha_de_baja_prev_before = clientes["fecha_de_baja_prev_before"]

        # Órdenes
        self.ordenes_por_instalar     = orders["ordenes_por_instalar"]
        self.ordenes_factibilidad     = orders["ordenes_factibilidad"]
        self.ordenes_programado       = orders["ordenes_programado"]
        self.ingresos_mes_actual      = orders["ingresos_mes_actual"]
        self.programados_mes_actual   = orders["programados_mes_actual"]
        self.contratos_mes_actual     = orders["contratos_mes_actual"]
        self.ingresos_mes_anterior    = orders["ingresos_mes_anterior"]
        self.programados_mes_anterior = orders["programados_mes_anterior"]
        self.contratos_mes_anterior   = orders["contratos_mes_anterior"]

        # Servicios
        self.servicios_activos               = services["servicios_activos"]
        self.servicios_plan_duo_clasico      = services["servicios_plan_duo_clasico"]
        self.servicios_plan_duo_premium      = services["servicios_plan_duo_premium"]
        self.servicios_plan_duo_superior     = services["servicios_plan_duo_superior"]
        self.servicios_internet_clasico      = services["servicios_internet_clasico"]
        self.servicios_internet_premium      = services["servicios_internet_premium"]
        self.servicios_internet_superior     = services["servicios_internet_superior"]
        self.servicios_tv_fibra_optica       = services["servicios_tv_fibra_optica"]
        self.servicios_tv_analogo            = services["servicios_tv_analogo"]

        # Pagos
        self.pagos_hoy                     = payments["pagos_hoy"]
        self.pagos_semana_actual           = payments["pagos_semana_actual"]
        self.pagos_mes_actual              = payments["pagos_mes_actual"]
        self.pagos_clientes_existentes     = payments["pagos_clientes_existentes"]
        self.pagos_sin_cliente_registrado  = payments["pagos_sin_cliente_registrado"]

        # Transferencias
        self.transferencias_hoy                     = transfers["transferencias_hoy"]
        self.transferencias_semana_actual           = transfers["transferencias_semana_actual"]
        self.transferencias_mes_actual              = transfers["transferencias_mes_actual"]
        self.transferencias_con_cliente             = transfers["transferencias_con_cliente"]
        self.transferencias_sin_cliente_registrado  = transfers["transferencias_sin_cliente_registrado"]

    def invalidate_cache(self):
        """Event handler. Clears the ClassVar dashboard cache so the next
        load_stats() call refetches fresh data. Triggered by mutations on
        clientes / ordenes / servicios / pagos / transferencias via
        CacheSignalState (consumed in load_stats), and callable directly as
        an event handler when an explicit invalidation is needed."""
        type(self)._clear_cache()

    async def _consume_signal_invalidation(self) -> None:
        """If any tracked entity has been mutated more recently than our cache
        was filled, drop the cache so we refetch."""
        try:
            signal = await self.get_state(CacheSignalState)
            last_mutation = max(
                (signal.mutation_timestamps.get(k, 0) for k in TRACKED_SIGNAL_KEYS),
                default=0,
            )
            if last_mutation > type(self)._cache_timestamp:
                type(self)._clear_cache()
        except Exception as e:
            print(f"Error consultando CacheSignalState en IndexState: {e}")

    async def load_stats(self):
        """Stale-while-revalidate dashboard loader.

        - If a cached payload exists (fresh or stale), apply it immediately so
          the UI shows numbers without a spinner.
        - If the cache is fresh, stop there.
        - If the cache is stale (or missing), fetch new data, update the cache,
          and apply the fresh values to the UI."""
        cls = type(self)

        # Cross-state invalidation: any mutation since cache fill drops the cache.
        await self._consume_signal_invalidation()

        has_cache = cls._cache_data is not None
        is_fresh = cls._has_valid_cache()

        # 1) Stale data first → instant UI.
        if has_cache:
            self._apply_dashboard_stats(cls._cache_data)
            if is_fresh:
                return
            # Flush stale numbers to the client before the background refresh.
            yield

        # 2) Refresh (cache stale or missing). Lock to coalesce concurrent loads.
        if cls._cache_lock is None:
            cls._cache_lock = asyncio.Lock()

        async with cls._cache_lock:
            # Another concurrent loader may have already refreshed.
            if cls._has_valid_cache():
                self._apply_dashboard_stats(cls._cache_data)
                return

            try:
                data = await cls._compute_dashboard_stats(self)

                all_zero = all(
                    v == 0
                    for section in data.values()
                    for v in section.values()
                    if isinstance(v, int)
                )
                if not all_zero:
                    cls._cache_data = data
                    cls._cache_timestamp = time.time()
                self._apply_dashboard_stats(data)

            except Exception as e:
                print(f"Error cargando stats generales: {e}")
