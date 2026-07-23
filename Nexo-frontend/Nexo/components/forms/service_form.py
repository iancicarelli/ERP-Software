import reflex as rx
from ...states.service.service_detail_state import ServiceDetailState
from .generic_form import generic_detail_form

def service_form(
    *, 
    title: str, 
    data, 
    fields: list[dict], 
    mode: str = "edit",
    columns: str = "1"
) -> rx.Component:

    return generic_detail_form(
        title=title,
        data=data,
        fields=fields,
        on_change_text=ServiceDetailState.update_field,
        on_change_bool=ServiceDetailState.toggle_bool,
        on_change_value=ServiceDetailState.update_value,
        mode=mode,
        columns=columns
    )