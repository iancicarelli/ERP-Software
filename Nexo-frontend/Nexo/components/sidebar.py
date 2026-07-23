import reflex as rx
from reflex.style import set_color_mode, color_mode
from ..components.user_profile import user_profile

class SidebarState(rx.State):
    is_open: bool = False
    is_sidebar_visible: bool = True

    def toggle(self):
        self.is_open = not self.is_open

    def close(self):
        self.is_open = False

    def toggle_sidebar(self):
        self.is_sidebar_visible = not self.is_sidebar_visible


def navbar_link(text: str, icon: str, url: str) -> rx.Component:
    return rx.link(
        rx.hstack(
            rx.icon(tag=icon, size=20),
            rx.text(text, size="3"),
            spacing="3",
            width="100%",
            padding_x="1rem",
            padding_y="0.5rem",
            border_radius="0.5rem",
            transition="background-color 0.2s",
            _hover={
                "bg": rx.color("blue", 4),
                "color": rx.color("accent", 11),
                "cursor": "pointer",
            },
            color=rx.color("blue", 12),
        ),
        href=url,
        text_decoration="none",
        class_name="w-full",
        on_click=SidebarState.close,
    )


def dark_mode_toggle() -> rx.Component:
    return rx.segmented_control.root(
        rx.segmented_control.item(rx.icon(tag="monitor", size=18), value="system"),
        rx.segmented_control.item(rx.icon(tag="sun", size=18), value="light"),
        rx.segmented_control.item(rx.icon(tag="moon", size=18), value="dark"),
        on_change=set_color_mode,
        value=color_mode,
        variant="classic",
        radius="large",
        size="2",
    )


def sidebar_content() -> rx.Component:
    return rx.vstack(
        rx.hstack(
            rx.badge(
                rx.icon(tag="orbit", size=28),
                color_scheme="green",
                variant="soft",
                radius="large",
                padding="0.6rem",
            ),
            rx.heading("Nexo", size="7", weight="bold"),
            rx.spacer(),
            spacing="3",
            width="100%",
            align="center",
            margin_bottom="2rem",
            padding_x="2",
        ),
        rx.vstack(
            navbar_link("Inicio", "house", "/"),
            navbar_link("Metricas", "chart-no-axes-combined", "/metrics"),
            navbar_link("Ordenes", "clipboard-list", "/orders"),
            navbar_link("Sistema de gestión", "monitor-cog", "/management"),
            sidebar_toggle_button(),
            spacing="1",
            width="100%",
            flex="1",
        ),
        rx.hstack(
            dark_mode_toggle(),
            justify="center",
            padding="1.5rem",
            width="100%",
            padding_y="1rem",
        ),
        user_profile(),
        height="100%",
        width="100%",
        padding="1.5rem",
        align_items="start",
    )


def hamburger_button() -> rx.Component:
    return rx.button(
        rx.icon(tag="menu", size=22),
        on_click=SidebarState.toggle,
        variant="ghost",
        position="fixed",
        top="1rem",
        left="1rem",
        z_index="100",
        display=rx.breakpoints(initial="flex", lg="none"),
    )


def sidebar_toggle_button() -> rx.Component:
    return rx.box(
        rx.hstack(
            rx.cond(
                SidebarState.is_sidebar_visible,
                rx.icon(tag="panel-left", size=22),
                rx.icon(tag="panel-left-open", size=22),
            ),
            rx.text(
                rx.cond(SidebarState.is_sidebar_visible, "Ocultar barra", ""),
                size="3",
            ),
            spacing="3",
            width="100%",
            padding_x="1rem",
            padding_y="0.5rem",
            border_radius="0.5rem",
            transition="background-color 0.2s",
            _hover={
                "bg": rx.color("slate", 3),
                "color": rx.color("accent", 11),
                "cursor": "pointer",
            },
            color=rx.color("slate", 12),
        ),
        on_click=SidebarState.toggle_sidebar,
        aria_label=rx.cond(
            SidebarState.is_sidebar_visible,
            "Ocultar barra lateral",
            "Mostrar barra lateral",
        ),
        cursor="pointer",
        width="100%",
    )


def mobile_drawer() -> rx.Component:
    return rx.box(
        rx.cond(
            SidebarState.is_open,
            rx.box(
                on_click=SidebarState.close,
                position="fixed",
                top="0",
                left="0",
                width="100vw",
                height="100vh",
                background_color="rgba(0,0,0,0.4)",
                z_index="150",
            ),
        ),
        rx.box(
            sidebar_content(),
            position="fixed",
            top="0",
            left="0",
            height="100vh",
            width="16rem",
            z_index="200",
            background_color=rx.color("blue", 2),
            border_right=f"1px solid {rx.color('blue', 4)}",
            transform=rx.cond(
                SidebarState.is_open, "translateX(0)", "translateX(-100%)"
            ),
            transition="transform 0.25s ease",
        ),
        display=rx.breakpoints(initial="block", lg="none"),
    )


def sidebar() -> rx.Component:
    return rx.cond(
        SidebarState.is_sidebar_visible,
        rx.box(
            sidebar_content(),
            height="100vh",
            width="16rem",
            position="sticky",
            top="0",
            background_color=rx.color("blue", 2),
            border_right=f"1px solid {rx.color('blue', 4)}",
            flex_shrink="0",
            display=rx.breakpoints(initial="none", lg="flex"),
            flex_direction="column",
        ),
        rx.fragment(),
    )