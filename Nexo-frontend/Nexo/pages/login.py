import reflex as rx
from ..states.login.login_state import AuthState

def login_default_icons() -> rx.Component:
    return rx.card(
        rx.vstack(
            rx.center(
                rx.hstack(
                    rx.badge(
                        rx.icon(tag="orbit", size=32),
                        color_scheme="green",
                        variant="soft",
                        radius="large",
                        padding="0.7rem",
                    ),
                    rx.heading("Nexo", size="8", weight="bold"),
                    spacing="3",
                    align="center",
                ),
                rx.heading(
                    "Ingresa con tu cuenta",
                    size="6",
                    as_="h2",
                    text_align="center",
                    width="100%",
                ),
                direction="column",
                spacing="5",
                width="100%",
            ),
            rx.vstack(
                rx.text(
                    "Nombre de usuario",
                    size="3",
                    weight="medium",
                    text_align="left",
                    width="100%",
                ),
                rx.input(
                    rx.input.slot(rx.icon("user")),
                    placeholder="usuario",
                    type="text", 
                    size="3",
                    width="100%",
                    value=AuthState.username,
                    on_change=AuthState.set_username,
                ),
                spacing="2",
                width="100%",
            ),
            rx.vstack(
                rx.text(
                    "Contraseña", 
                    size="3", 
                    weight="medium"
                ),
                rx.input(
                    rx.input.slot(rx.icon("lock")),
                    placeholder="Ingresa tu contraseña",
                    type="password",
                    size="3",
                    width="100%",
                    value=AuthState.password,
                    on_change=AuthState.set_password,
                ),
                spacing="2",
                width="100%",
            ),

            rx.cond(
                AuthState.error_message != "",
                rx.text(AuthState.error_message, color="red", size="2", text_align="center", width="100%")
            ),

            rx.button(
                "Iniciar sesión", 
                size="3", 
                width="100%",
                on_click=AuthState.do_login,
                loading=AuthState.is_loading,
            ),
            spacing="6",
            width="100%",
        ),
        max_width="28em",
        size="4",
        width="100%",
        border_width="1.5px",       
        border_color="gray.300",
    )


@rx.page(
    route="/login",
    title="Iniciar Sesión", 
)
def login() -> rx.Component:
    return rx.center(
        login_default_icons(),
        height="100vh",  
        width="100%",    
        bg="gray.50",    
    )