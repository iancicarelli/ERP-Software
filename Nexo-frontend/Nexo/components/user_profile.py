import reflex as rx
from ..states.login.login_state import AuthState

def user_profile() -> rx.Component:
    return rx.hstack(
        rx.avatar(
            fallback=AuthState.logged_in_user[:2].upper(),
            size="2", 
            radius="full"
        ),
        rx.vstack(
            rx.text(AuthState.logged_in_user, size="2", weight="bold"),
            rx.text("Usuario activo", size="1", color=rx.color("blue", 11)),
            spacing="0",
        ),
        rx.spacer(),
        rx.icon_button(
            rx.icon("log-out", size=18),
            on_click=AuthState.logout_and_clear,
            variant="ghost",
            color_scheme="red",
            cursor="pointer",
            title="Cerrar sesión",
        ),
        spacing="3",
        width="100%",
        margin_top="auto",
        padding_top="1rem",
        border_top=f"1px solid {rx.color('blue', 4)}",
        align="center",
    )