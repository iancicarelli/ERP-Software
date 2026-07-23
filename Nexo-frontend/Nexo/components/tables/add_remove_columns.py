import reflex as rx
from typing import Callable, List

def column_selector(
    columns: list[str],
    hidden_columns: rx.Var[List[str]],
    on_toggle: Callable,
) -> rx.Component:
    
    content_items = []
    
    for col in columns:
        is_checked = ~hidden_columns.contains(col)

        content_items.append(
            rx.hstack(
                rx.checkbox(
                    checked=is_checked,
                    on_change=lambda _bool: on_toggle(col),
                ),
                rx.text(col, size="2"),
                spacing="2",
                align="center",
                width="100%",
            )
        )

    return rx.popover.root(
        rx.popover.trigger(
            rx.button(
                rx.icon("columns-4", size=18),
                "Columnas", 
                variant="soft",
                size="2",
                color_scheme="purple",
                cursor="pointer",
            ),
        ),
        rx.popover.content(
            rx.vstack(
                *content_items,
                spacing="2",
                align="start",
            ),
            width="220px",
            max_height="300px",
            overflow_y="auto", 
        ),
    )