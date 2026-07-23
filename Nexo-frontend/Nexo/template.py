import reflex as rx
from .components.sidebar import (
    SidebarState,
    sidebar,
    hamburger_button,
    mobile_drawer,
    sidebar_toggle_button,
)
from .states.api.api_state import APIState

DEFAULT_MAX_WIDTH = "1400px"


def error_banner() -> rx.Component:
    """Banner de error de red — visible solo cuando APIState.api_error != ''.
    Sigue el estilo de error del proyecto (rx.callout rojo + triangle_alert)
    y agrega un botón para cerrarlo manualmente."""
    return rx.cond(
        APIState.api_error != "",
        rx.hstack(
            rx.callout(
                APIState.api_error,
                icon="triangle_alert",
                color_scheme="red",
                width="100%",
            ),
            rx.icon(
                "x",
                size=18,
                cursor="pointer",
                color=rx.color("red", 11),
                on_click=APIState.clear_api_error,
            ),
            align="center",
            width="100%",
            spacing="2",
            margin_bottom="1rem",
        ),
    )

def template(page: rx.Component) -> rx.Component:
    return rx.box(
        hamburger_button(),
        mobile_drawer(),
        rx.cond(
            ~SidebarState.is_sidebar_visible,
            rx.box(
                sidebar_toggle_button(),
                position="fixed",
                top="1rem",
                left="1rem",
                z_index="100",
                display=rx.breakpoints(initial="none", lg="flex"),
            ),
        ),
        rx.hstack(
            sidebar(),
            rx.box(
                rx.box(
                    error_banner(),
                    page,
                    width="100%",
                    max_width=DEFAULT_MAX_WIDTH,
                    margin_x="auto",
                ),
                flex="1",
                height="100vh",
                overflow_y="auto",
                padding_top=rx.breakpoints(initial="4rem", lg="2rem"),
                padding_bottom="2rem",
                padding_x=rx.breakpoints(initial="1rem", lg="2rem"),
                background_color=rx.color("blue", 2),
                transition="all 0.2s ease",
            ),
            width="100%",
            spacing="0",
            align="start",
            background_color=rx.color("blue", 3),
        ),
        position="relative",
        width="100%",
    )
