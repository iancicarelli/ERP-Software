import reflex as rx


def back_button() -> rx.Component:
    return rx.icon_button(
        rx.icon("arrow-left", size=20),
        variant="ghost",
        color_scheme="gray",
        on_click=rx.call_script("window.history.back()"),
        cursor="pointer",
    )
