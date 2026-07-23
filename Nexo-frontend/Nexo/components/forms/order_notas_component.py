import reflex as rx

from ...states.work_orders.order_notas_state import OrderNotasState
from ...dtos.work_orders.nota_dto import NotaDTO


def render_nota(nota: NotaDTO) -> rx.Component:
    return rx.box(
        rx.hstack(
            rx.hstack(
                rx.icon("user", size=14),
                rx.text(nota.added_by_username, size="1", weight="bold"),
                spacing="1",
                align="center",
            ),
            rx.spacer(),
            rx.text(nota.fecha_creacion[:16], size="1", color_scheme="gray"),
            width="100%",
            align="center",
        ),
        rx.text(nota.nota, size="2", margin_top="1"),
        border_bottom=f"1px solid {rx.color('blue', 4)}",
        padding_y="3",
        width="100%",
    )


def order_notas_section() -> rx.Component:
    return rx.card(
        rx.vstack(
            rx.box(
                rx.heading(
                    "NOTAS",
                    size="4",
                    weight="bold",
                    text_align="center",
                    color=rx.color("accent", 9),
                    width="100%",
                ),
                padding_y="3",
                padding_x="3",
                background_color=rx.color("accent", 2),
                border_radius="8px",
                width="100%",
            ),

            rx.cond(
                OrderNotasState.loading,
                rx.center(rx.spinner(), padding="4"),
                rx.cond(
                    OrderNotasState.notas.length() > 0,
                    rx.vstack(
                        rx.foreach(OrderNotasState.notas, render_nota),
                        width="100%",
                        spacing="0",
                    ),
                    rx.center(
                        rx.text("Sin notas registradas", color_scheme="gray", size="2"),
                        padding="4",
                    ),
                ),
            ),

            rx.divider(),

            rx.vstack(
                rx.text_area(
                    value=OrderNotasState.nueva_nota,
                    on_change=OrderNotasState.set_nueva_nota,
                    placeholder="Escribir nota...",
                    rows="3",
                    width="100%",
                ),
                rx.button(
                    rx.cond(
                        OrderNotasState.is_saving,
                        rx.hstack(
                            rx.spinner(size="1"),
                            rx.text("Guardando..."),
                            spacing="2",
                            align="center",
                        ),
                        rx.text("Agregar Nota"),
                    ),
                    on_click=OrderNotasState.add_nota,
                    disabled=OrderNotasState.is_saving,
                    color_scheme="blue",
                    align_self="end",
                ),
                rx.cond(
                    OrderNotasState.error,
                    rx.callout(
                        OrderNotasState.error,
                        icon="triangle_alert",
                        color_scheme="red",
                        width="100%",
                    ),
                ),
                width="100%",
                spacing="3",
            ),

            spacing="4",
            width="100%",
        ),
        width="100%",
        padding="4",
        box_shadow="0 4px 12px rgba(0,0,0,0.05)",
        border_radius="12px",
        background_color=rx.color("blue", 2),
    )
