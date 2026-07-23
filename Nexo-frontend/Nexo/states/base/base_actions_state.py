from typing import List
from ...states.api.api_state import APIState


class BaseActionsState(APIState):
    """
    Shared selection + bulk-action scaffolding for all entity action states.
    Subclasses must define BULK_URL at class level and implement ejecutar_accion().
    """
    selected_ids: List[int] = []
    selected_action: str = ""
    actions_loading: bool = False
    select_all_mode: bool = False
    loading_all_ids: bool = False

    def toggle_selection(self, entity_id: int, checked: bool):
        self.select_all_mode = False
        current = list(self.selected_ids)
        if checked:
            if entity_id not in current:
                current.append(entity_id)
        else:
            current = [i for i in current if i != entity_id]
        self.selected_ids = current

    def add_page(self, ids: list[int]):
        """Adds current page IDs to selection without clearing others."""
        self.select_all_mode = False
        current = list(self.selected_ids)
        for id_ in ids:
            if id_ not in current:
                current.append(id_)
        self.selected_ids = current

    def remove_page(self, ids: list[int]):
        """Removes current page IDs from selection, keeps all others."""
        self.select_all_mode = False
        self.selected_ids = [
            i for i in self.selected_ids if i not in ids
        ]

    def select_all_matching(self, ids: list[int]):
        """Called after all-ids fetch returns. Populates selected_ids."""
        self.selected_ids = ids
        self.select_all_mode = True

    def set_loading_all_ids(self, value: bool):
        self.loading_all_ids = value

    def clear_selection(self):
        self.selected_ids = []
        self.selected_action = ""
        self.select_all_mode = False
        self.actions_loading = False
        self.loading_all_ids = False

    def set_selected_action(self, action: str):
        self.selected_action = action

    def build_bulk_payload(self, action: str) -> dict:
        """
        Returns the correct json_data dict for the bulk-action endpoint.
        Use this in every subclass ejecutar_accion() instead of building
        the payload manually.
        """
        return {
            "action": action,
            "selected_ids": list(self.selected_ids),
        }
