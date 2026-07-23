import reflex as rx
from ...states.work_orders.orders_detail_state import OrderDetailState
from .generic_form import generic_detail_form

def order_form(
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
        on_change_text=OrderDetailState.update_field,
        on_change_bool=OrderDetailState.toggle_bool,
        on_change_value=OrderDetailState.update_value,
        mode=mode,
        columns=columns
    )
