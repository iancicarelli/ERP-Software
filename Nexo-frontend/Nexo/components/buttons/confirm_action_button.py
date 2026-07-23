import reflex as rx
from typing import Callable


def confirm_action_button(
    *,
    text: str,
    confirm_title: str = "Confirmación",
    confirm_text: str = "¿Está seguro?",
    confirm_button_text: str = "Confirmar",
    icon: str = "check",
    color_scheme: str = "violet",
    loading: rx.Var | bool = False,
    disabled: rx.Var | bool = False,
    on_confirm: Callable,
) -> rx.Component:

    return rx.dialog.root(
        rx.dialog.trigger(
            rx.button(
                rx.icon(tag=icon, size=18),
                text,
                color_scheme=color_scheme,
                variant="solid",
                loading=loading,
                disabled=disabled,
            )
        ),
        rx.dialog.content(
            rx.vstack(
                rx.dialog.title(confirm_title),          
                rx.dialog.description(confirm_text),
                rx.hstack(
                    rx.dialog.close(
                        rx.button("Cancelar", variant="soft")
                    ),
                    rx.dialog.close(  
                        rx.button(
                            confirm_button_text,
                            color_scheme=color_scheme,
                            on_click=on_confirm,
                            loading=loading,
                        )
                    ),
                    justify="end",
                    width="100%",
                ),
                spacing="4",
            ),
            max_width="400px",
        ),
    )