import reflex as rx

from ...states.transfers.transfer_assign_client_state import (
    TransferAssignClientState,
)


def assign_client_dialog() -> rx.Component:
    return rx.dialog.root(
        rx.dialog.content(
            rx.vstack(
                rx.dialog.title("Asignar cliente a transferencia"),
                rx.dialog.description(
                    "Busca por nombre, apellido o RUT.",
                    size="2",
                    color=rx.color("gray", 11),
                ),
                # Search input + button
                rx.hstack(
                    rx.input(
                        placeholder="Nombre, apellido o RUT...",
                        value=TransferAssignClientState.search_query,
                        on_change=TransferAssignClientState.set_search_query,
                        on_key_down=lambda key: rx.cond(
                            key == "Enter",
                            TransferAssignClientState.search_clients(),
                            rx.noop(),
                        ),
                        width="100%",
                    ),
                    rx.button(
                        rx.icon("search", size=15),
                        on_click=TransferAssignClientState.search_clients,
                        loading=TransferAssignClientState.loading_search,
                        variant="soft",
                        color_scheme="indigo",
                    ),
                    width="100%",
                    spacing="2",
                ),
                # Error message
                rx.cond(
                    TransferAssignClientState.error_msg != "",
                    rx.callout(
                        TransferAssignClientState.error_msg,
                        color_scheme="red",
                        size="1",
                    ),
                    rx.fragment(),
                ),
                # Results list
                rx.cond(
                    TransferAssignClientState.search_results.length() > 0,
                    rx.scroll_area(
                        rx.vstack(
                            rx.foreach(
                                TransferAssignClientState.search_results,
                                lambda r: rx.box(
                                    rx.hstack(
                                        rx.vstack(
                                            rx.text(r[1], weight="bold",
                                                    size="2"),
                                            rx.text(r[2], size="1",
                                                    color=rx.color("gray", 10)),
                                            spacing="0",
                                            align="start",
                                        ),
                                        rx.spacer(),
                                        rx.cond(
                                            TransferAssignClientState.selected_client_id == r[0].to(int),
                                            rx.icon("check", size=16,
                                                    color=rx.color("indigo", 9)),
                                            rx.fragment(),
                                        ),
                                        align="center",
                                        width="100%",
                                    ),
                                    on_click=lambda: TransferAssignClientState.select_client(r[0], r[1]),
                                    padding="8px 12px",
                                    border_radius="6px",
                                    cursor="pointer",
                                    background=rx.cond(
                                        TransferAssignClientState.selected_client_id == r[0].to(int),
                                        rx.color("indigo", 2),
                                        "transparent",
                                    ),
                                    _hover={"background": rx.color("indigo", 2)},
                                ),
                            ),
                            spacing="1",
                            width="100%",
                        ),
                        max_height="240px",
                        scrollbars="vertical",
                    ),
                    rx.fragment(),
                ),
                # Selected client confirmation
                rx.cond(
                    TransferAssignClientState.selected_client_label != "",
                    rx.box(
                        rx.hstack(
                            rx.icon("user-check", size=14,
                                    color=rx.color("green", 9)),
                            rx.text(
                                "Seleccionado: ",
                                rx.text.span(
                                    TransferAssignClientState.selected_client_label,
                                    weight="bold",
                                ),
                                size="2",
                            ),
                            align="center",
                            spacing="1",
                        ),
                        padding="8px 12px",
                        border_radius="6px",
                        background=rx.color("green", 2),
                        border=f"1px solid {rx.color('green', 4)}",
                        width="100%",
                    ),
                    rx.fragment(),
                ),
                # Footer
                rx.hstack(
                    rx.dialog.close(
                        rx.button(
                            "Cancelar",
                            variant="ghost",
                            color_scheme="gray",
                            on_click=TransferAssignClientState.close_dialog,
                        ),
                    ),
                    rx.button(
                        "Asignar cliente",
                        on_click=TransferAssignClientState.save_assignment,
                        loading=TransferAssignClientState.saving,
                        disabled=TransferAssignClientState.selected_client_id == 0,
                        color_scheme="indigo",
                    ),
                    justify="end",
                    spacing="2",
                    width="100%",
                ),
                spacing="3",
                width="100%",
            ),
            max_width="460px",
        ),
        open=TransferAssignClientState.dialog_open,
        on_open_change=TransferAssignClientState.close_dialog,
    )
