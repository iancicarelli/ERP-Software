import reflex as rx
from typing import Optional

def add_button(
    text: str,
    on_click: Optional[rx.event.EventHandler] = None,
    icon: str = "plus",
    color_scheme: str = "green",
    loading: bool = False,
    disabled: bool = False,
) -> rx.Component:

    return rx.button(
        rx.icon(tag=icon, size=18),
        text,
        color_scheme=color_scheme,
        variant="solid",
        size="2",
        cursor="pointer",
        on_click=on_click,
        loading=loading,
        disabled=disabled,
    )