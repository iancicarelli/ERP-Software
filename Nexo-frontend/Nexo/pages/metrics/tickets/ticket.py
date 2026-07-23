import reflex as rx
from ....template import template
from ....states.login.login_state import AuthState


def metrics_placeholder() -> rx.Component:
    """Placeholder mostrado mientras las métricas no estén reconectadas.

    Las métricas antiguas embebían paneles de Grafana de la infraestructura
    anterior (URLs hardcodeadas). Esas conexiones se eliminaron al desacoplar
    el frontend del backend antiguo. Cuando el nuevo backend (Nexo-backend)
    exponga sus métricas, reconectar aquí vía un iframe alimentado por una
    variable de entorno (p. ej. GRAFANA_BASE_URL) o un endpoint propio.
    """
    return rx.center(
        rx.vstack(
            rx.icon(tag="chart-no-axes-combined", size=48, color="gray"),
            rx.heading("Métricas no disponibles", size="5"),
            rx.text(
                "Este módulo estaba conectado al backend antiguo. "
                "Se reconectará cuando el nuevo backend exponga sus métricas.",
                color="gray",
                text_align="center",
                max_width="28rem",
            ),
            spacing="3",
            align="center",
        ),
        width="100%",
        padding_y="4rem",
    )


def tickets_content() -> rx.Component:
    return rx.vstack(
        rx.vstack(
            rx.heading("Métricas de Tickets", size="6"),
            rx.text("Informe mensual de tickets", color="gray"),
            spacing="1",
            width="100%",
        ),
        rx.divider(),
        metrics_placeholder(),
        spacing="6",
        width="100%",
        padding_bottom="2rem",
    )


@rx.page(
    route="/tickets",
    title="Tickets Mensual",
    on_load=AuthState.verify_token,
)
def mensual_ticket() -> rx.Component:
    return template(tickets_content())
