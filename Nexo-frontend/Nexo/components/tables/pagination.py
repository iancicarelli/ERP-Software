from typing import Type
import reflex as rx
from ...states.table.table_state import BaseTableState

def paginacion(estado: Type[BaseTableState]) -> rx.Component:

    return rx.hstack(
        rx.button(
            "Anterior", 
            on_click=estado.prev_page, 
            disabled=~estado.can_prev,
            variant="soft",
            cursor="pointer"
        ),

        rx.foreach(
            estado.visible_pages,
            lambda p: rx.button(
                rx.text(p),
                on_click=lambda: estado.go_to_page(p),
                variant=rx.cond(p == estado.page, "solid", "soft"),
                color_scheme=rx.cond(p == estado.page, "indigo", "gray"),
                size="2",
                cursor="pointer"
            ),
        ),
        
        rx.button(
            "Siguiente", 
            on_click=estado.next_page, 
            disabled=~estado.can_next,
            variant="soft",
            cursor="pointer"
        ),
        spacing="2", 
        justify="center", 
        width="100%", 
        padding_top="4"
    )