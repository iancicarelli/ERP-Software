import reflex as rx

from ...states.api.api_state import APIState
from ...states.cache.cache_signal_state import CacheSignalState
from ...config.settings import API_BASE_URL
from .transfer_table_state import TransferTableState


class TransferAssignClientState(APIState):
    dialog_open: bool = False
    transfer_id: int = 0
    search_query: str = ""
    search_results: list[list[str]] = []  # [[id, nombre_completo, rut], ...]
    selected_client_id: int = 0
    selected_client_label: str = ""
    loading_search: bool = False
    saving: bool = False
    error_msg: str = ""

    def open_dialog(self, transfer_id: int):
        self.transfer_id = transfer_id
        self.search_query = ""
        self.search_results = []
        self.selected_client_id = 0
        self.selected_client_label = ""
        self.error_msg = ""
        self.dialog_open = True

    def close_dialog(self):
        self.dialog_open = False

    def set_search_query(self, value: str):
        self.search_query = value

    def select_client(self, client_id: str, label: str):
        self.selected_client_id = int(client_id)
        self.selected_client_label = label

    async def search_clients(self):
        if not self.search_query or len(self.search_query) < 2:
            self.error_msg = "Ingresa al menos 2 caracteres."
            return
        self.loading_search = True
        self.search_results = []
        self.error_msg = ""
        url = f"{API_BASE_URL}/clientes/"
        response = await self.fetch_with_auth(
            url,
            params={"search": self.search_query, "page_size": 10,
                    "format": "json"}
        )
        self.loading_search = False
        if response is None or response.status_code != 200:
            self.error_msg = "Error al buscar. Intenta nuevamente."
            return
        data = response.json()
        results = data.get("results", [])
        if not results:
            self.error_msg = "No se encontraron clientes."
            return
        # Build nombre_completo from raw API fields (same logic as
        # ClientTableState.transform_item)
        self.search_results = [
            [
                str(r["id"]),
                f'{r.get("nombre1", "")} {r.get("apellido1", "")} {r.get("apellido2", "")}'.strip(),
                r.get("rut", ""),
            ]
            for r in results
        ]

    async def save_assignment(self):
        if not self.selected_client_id or not self.transfer_id:
            self.error_msg = "Selecciona un cliente primero."
            return
        self.saving = True
        self.error_msg = ""
        url = f"{API_BASE_URL}/transferencias/{self.transfer_id}/"
        response = await self.fetch_with_auth(
            url,
            method="PATCH",
            json_data={"cliente": self.selected_client_id},
        )
        self.saving = False
        if response is None or response.status_code != 200:
            self.error_msg = "Error al asignar el cliente. Intenta nuevamente."
            return
        self.dialog_open = False
        yield CacheSignalState.invalidate("/transferencias/")
        yield TransferTableState.reset_and_reload()
