import reflex as rx
from ...states.clients.client_detail_state import ClientDetailState
from .generic_form import generic_detail_form

def detail_form(
    *, 
    title: str, 
    data, 
    fields: list[dict] = None, 
    mode: str = "edit", 
    columns: str = "1"
) -> rx.Component:
    
    return generic_detail_form(
        title=title,
        data=data,
        fields=fields,
        on_change_text=ClientDetailState.update_field,
        on_change_bool=ClientDetailState.toggle_bool,
        on_change_value=ClientDetailState.update_value,
        mode=mode,
        columns=columns
    )