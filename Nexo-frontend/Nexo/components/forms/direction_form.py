import reflex as rx
from typing import Any, List, Dict

from ...components.forms.generic_form import generic_detail_form
from ...states.addresses.direction_detail_state import DirectionDetailState

def direction_form(
    *,
    title: str,
    data: Any,
    fields: List[Dict],
    mode: str = "edit",
    columns: str = "2",
) -> rx.Component:



    return generic_detail_form(
        title=title,
        data=data,
        fields=fields,
        on_change_text=DirectionDetailState.update_field,
        on_change_bool=DirectionDetailState.toggle_bool,
        on_change_value=DirectionDetailState.update_value,
        mode=mode,
        columns=columns,
    )