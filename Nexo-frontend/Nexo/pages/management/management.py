import reflex as rx
from ...template import template
from ...states.login.login_state import AuthState

def gestion_card(title: str, icon: str, description: str, url: str) -> rx.Component:
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
                    "Gestionar", 
                    width="100%", 
                    variant="soft",
                    cursor="pointer",
                ),
                href=url,
                width="100%",
                text_decoration="none",
            ),
            width = "100%",
            spacing="4",
            height="180px",
            align="start",
        ),
        padding = "6",
        class_name="hover:shadow-lg transition-all",
        border=f"1px solid {rx.color('blue', 5)}",
    )

def management_content() -> rx.Component:
    return rx.vstack(
        rx.vstack(
            rx.heading("Sistema de Gestión", size="8"),
            rx.text("Selecciona un módulo para comenzar a trabajar", color_scheme="gray"),
            spacing="1",
            align="start",
            width="100%",
        ),
        rx.divider(),
        rx.grid(
            gestion_card("Clientes", "users", "Administración de base de datos de clientes.", "/client"),
            gestion_card("Pagos", "credit-card", "Registro y control de ingresos.", "/payments"),
            gestion_card("Servicios", "briefcase", "Configuración de servicios ofrecidos.", "/service"),
            gestion_card("Transferencias", "arrow-right-left", "Movimientos entre cuentas bancarias.", "/transfers"),
            columns=rx.breakpoints(initial="1", sm="2", lg="4"),
            spacing="6",
            width="100%",
        ),
        spacing="6",
        width="100%",
        padding_bottom="2rem",
    )

@rx.page(
    route="/management",
    title="Gestion",
    on_load=AuthState.verify_token
    )
def management() -> rx.Component:
    return template(management_content())