import reflex as rx
from ...template import template
from ...states.login.login_state import AuthState

def metric_card(title: str, icon: str, description: str, url: str) -> rx.Component:
    return rx.card(
        rx.vstack(
            rx.hstack(
                rx.badge(
                    rx.icon(tag=icon, size=28),
                    radius="full",
                    padding="3",
                ),
                rx.heading(title, size="5"),
                spacing="4",
                align="center",
            ),
            rx.text(description, size="2", color_scheme="gray"),
            rx.spacer(),
            rx.link(
                rx.button(
                    "Ver Métricas", 
                    width="100%", 
                    variant="soft",
                    cursor="pointer",
                ),
                href=url,
                width="100%",
                text_decoration="none",
            ),
            width="100%",
            spacing="4",
            height="180px",
            align="start",
        ),
        padding="6",
        class_name="hover:shadow-lg transition-all",
        border=f"1px solid {rx.color('blue', 5)}",
    )

def metrics_menu_content() -> rx.Component:
    return rx.vstack(
        rx.vstack(
            rx.heading("Sistema de Métricas", size="8"),
            rx.text("Selecciona un módulo de métricas para visualizar", color_scheme="gray"),
            spacing="1",
            align="start",
            width="100%",
        ),
        rx.divider(),
        rx.grid(
            metric_card("Tickets Mensual", "ticket", "Análisis y métricas de tickets por mes.", "/tickets"),
            columns=rx.breakpoints(initial="1", sm="2", lg="4"),
            spacing="6",
            width="100%",
        ),
        spacing="6",
        width="100%",
        padding_bottom="2rem",
    )

@rx.page(
    route="/metrics",
    title="Metricas",
    on_load=AuthState.verify_token
    )
def metrics_menu() -> rx.Component:
    return template(metrics_menu_content())