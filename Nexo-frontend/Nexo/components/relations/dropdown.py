import reflex as rx
from typing import Any

from ...utils.generic_form_utils import LABEL_STYLE, SELECT_STYLE

def generic_dropdown(
    label: str,
    value: str,
    options: list[list[str]],
    on_change: Any,
    placeholder: str = "Seleccione una opción",
    disabled: bool = False,
    loading: bool = False,
) -> rx.Component:

    has_data = value != ""

    bg_color = rx.cond(
        has_data,
        rx.color("accent", 3),
        rx.color("blue", 3),
    )

    border_style = rx.cond(
        has_data,
        f"1px solid {rx.color('accent', 9)}",
        "1px solid transparent",
    )

    return rx.vstack(
        rx.text(label, **LABEL_STYLE),
        
        rx.cond(
            loading,
            rx.box(
                rx.hstack(
                    rx.spinner(size="2"),
                    rx.text("Cargando...", size="1", color="gray"),
                    align_items="center",
                    spacing="2",
                ),
                display="flex",
                align_items="center",
                padding_x="3",
                background_color=rx.color("blue", 3),
                border="1px solid transparent",
                **SELECT_STYLE, 
            ),
            rx.select.root(
                rx.select.trigger(
                    placeholder=placeholder,
                    background_color=bg_color,
                    border=border_style,
                    **SELECT_STYLE, 
                ),
                rx.select.content(
                    rx.select.group(
                        rx.foreach(
                            options,
                            lambda opt: rx.select.item(
                                opt[1],      
                                value=opt[0] 
                            )
                        )
                    ),
                    background_color=rx.color("blue", 2),
                    border=f"1px solid {rx.color('blue', 5)}",
                    border_radius="8px",
                ),
                value=value,
                on_change=on_change,
                disabled=disabled,
            )
        ),
        width="100%",
        align_items="start",
        spacing="0", 
    )