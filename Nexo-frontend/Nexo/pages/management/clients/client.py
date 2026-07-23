import reflex as rx
from typing import List

### COMPONENTS
from ....template import template
from ....components.tables.table import generic_table, get_auto_columns 
from ....components.navigation.back_button import back_button
from ....components.tables.pagination import paginacion
from ....components.buttons.add_button import add_button
### STATES/DTOS
from ....dtos.clients.client_table_dto import ClientDTO
from ....states.clients.client_table_state import ClientTableState
from ....states.clients.client_detail_state import ClientDetailState

from ....states.addresses.direction_table_state import DirectionTableState
from ....states.clients.client_table_service_state import ClientTableServiceState
from ....states.clients.client_table_order_state import ClientTableOrderState
from ....states.login.login_state import AuthState
from ....states.clients.client_actions_state import ClientActionsState
from ....states.filters.filter_state import FilterState
### Filtros
from ....components.filters.client_filter_ui import (client_filter_input, client_filter_menu, client_search_bar)
from ....components.actions.action_bar import action_bar

MANUAL_COLUMNS = {
    "nombre_completo": "Nombre Completo",
    "rut": "RUT",
    "email": "Email",
    "telefono": "Teléfono",
    "sector": "Sector",
    "estado": "Estado",
}

DYNAMIC_FIELDS = get_auto_columns(ClientDTO, list(MANUAL_COLUMNS.keys()))

LONG_TEXT_CELL_STYLE = {
    "white_space": "nowrap",
    "overflow": "hidden",
    "text_overflow": "ellipsis",
}

def render_row(cliente: ClientDTO) -> list[rx.Component]:
    checkbox_cell = rx.table.cell(
        rx.checkbox(
            checked=ClientActionsState.selected_ids.contains(cliente.id),
            on_change=lambda checked: ClientActionsState.toggle_selection(
                cliente.id, checked
            ),
        ),
        width="48px",
        padding_x="0.75rem",
        vertical_align="middle",
    )
    manual_cells = [
        rx.table.cell(
            rx.text(cliente.nombre_completo, weight="medium"),
            min_width="220px",
            **LONG_TEXT_CELL_STYLE,
        ),
        rx.table.cell(
            rx.text(cliente.rut, font_family="monospace"),
            min_width="140px",
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(cliente.email),
            min_width="220px",
            display=rx.breakpoints(initial="none", md="table-cell"),
            **LONG_TEXT_CELL_STYLE,
        ),
        rx.table.cell(
            rx.text(cliente.telefono),
            min_width="140px",
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(cliente.sector),
            min_width="250px",
            display=rx.breakpoints(initial="none", md="table-cell"),
            **LONG_TEXT_CELL_STYLE,
        ),
        rx.table.cell(
            rx.badge(
                cliente.estado.replace("_", " "),
                color_scheme=rx.match(
                    cliente.estado,
                    ("activo", "grass"),
                    ("por_instalar", "amber"),
                    ("baja", "tomato"),
                    "gray",
                ),
                variant="soft",
                radius="full",
                text_transform="capitalize",
            ),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
    ]

    dynamic_cells = [
        rx.table.cell(
            rx.text(getattr(cliente, field_name)), 
            white_space="nowrap",
            padding_y="0.75rem",
            display=rx.breakpoints(initial="none", md="table-cell"),
        )
        for field_name in DYNAMIC_FIELDS
    ]

    return [checkbox_cell] + manual_cells + dynamic_cells

def render_actions(cliente: ClientDTO) -> rx.Component:
    return rx.hstack(
        rx.icon_button(
            rx.icon("eye", size=18),
            on_click=[
                ClientDetailState.load_cliente_by_id(cliente.id),
                DirectionTableState.load_directions_for_client(cliente.id),
                ClientTableServiceState.load_services_for_client(cliente.id),
                ClientTableOrderState.load_orders_for_client(cliente.rut),
                rx.redirect("/client/detail"),
            ],
            variant="ghost",
            color_scheme="blue",
            size="2",
        ),
        justify="center",
        align="center",
    )

def clients_page() -> rx.Component:
    _ = ClientTableState.page

    table_headers = [""]  # columna checkbox sin label

    for key, name in MANUAL_COLUMNS.items():
        if key == "nombre_completo":
            table_headers.append(name) 
        else:
            table_headers.append({
                "name": name, 
                "display": rx.breakpoints(initial="none", md="table-cell")
            })

    for f in DYNAMIC_FIELDS:
        table_headers.append({
            "name": f.replace("_", " ").title(),
            "display": rx.breakpoints(initial="none", md="table-cell")
        })

    return rx.box(
        rx.vstack(
            back_button(),
            rx.hstack(
                rx.vstack(
                    rx.heading("Clientes", size="6", weight="bold"),
                    rx.text(
                        "Gestión y administración de la base de clientes.",
                        color_scheme="gray",
                        size="2",
                    ),
                    spacing="1",
                ),
                rx.spacer(),
                width="100%",
                margin_bottom="6",
            ),
            rx.vstack(
                client_search_bar(),
                rx.hstack(
                    client_filter_menu(),
                    rx.spacer(),
                    add_button("Nuevo cliente", on_click=rx.redirect("/client/add")),
                    width="100%",
                    align_items="center",
                ),
                client_filter_input(),
                width="100%",
                spacing="3",
                margin_bottom="4",
            ),

            rx.cond(
                ClientTableState.total_count > 0,
                rx.hstack(
                    rx.button(
                        rx.icon("plus", size=13),
                        "Seleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="indigo",
                        on_click=ClientTableState.add_current_page,
                    ),
                    rx.button(
                        rx.icon("minus", size=13),
                        "Deseleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="gray",
                        on_click=ClientTableState.remove_current_page,
                        disabled=ClientActionsState.selected_ids.length() == 0,
                    ),
                    rx.separator(orientation="vertical", size="1"),
                    rx.button(
                        rx.cond(
                            ClientActionsState.loading_all_ids,
                            rx.spinner(size="1"),
                            rx.text(
                                "Seleccionar todos (",
                                ClientTableState.total_count.to_string(),
                                ")",
                            ),
                        ),
                        variant="ghost",
                        size="1",
                        color_scheme="indigo",
                        on_click=ClientTableState.trigger_select_all,
                        disabled=ClientActionsState.loading_all_ids,
                    ),
                    rx.cond(
                        ClientActionsState.selected_ids.length() > 0,
                        rx.button(
                            rx.icon("x", size=13),
                            "Limpiar",
                            size="1",
                            variant="soft",
                            color_scheme="red",
                            on_click=ClientActionsState.clear_selection,
                        ),
                        rx.fragment(),
                    ),
                    rx.cond(
                        ClientActionsState.select_all_mode,
                        rx.hstack(
                            rx.icon("triangle-alert", size=14,
                                    color=rx.color("orange", 9)),
                            rx.text(
                                "La acción se aplicará a ",
                                rx.text.span(
                                    ClientTableState.total_count.to_string(),
                                    weight="bold",
                                ),
                                " registros filtrados",
                                size="2",
                                color=rx.color("orange", 11),
                            ),
                            align="center",
                            spacing="1",
                        ),
                        rx.fragment(),
                    ),
                    spacing="2",
                    align="center",
                    padding_x="4",
                    padding_y="2",
                ),
                rx.fragment(),
            ),

            action_bar(
                selected_count=rx.cond(
                    ClientActionsState.select_all_mode,
                    ClientTableState.total_count,
                    ClientActionsState.selected_ids.length(),
                ),
                selected_action=ClientActionsState.selected_action,
                actions_loading=ClientActionsState.actions_loading,
                actions=[
                    {"value": "sumar_montos_deuda_action", "label": "Sumar montos y deuda"},
                    {"value": "exportar_clientes_csv", "label": "Exportar a CSV"},
                ],
                on_action_change=ClientActionsState.set_selected_action,
                on_ejecutar=ClientActionsState.ejecutar_accion,
                on_clear=ClientActionsState.clear_selection,
            ),

            generic_table(
                columns=table_headers,
                data=ClientTableState.clientes,
                render_row=render_row,
                actions=render_actions,
                actions_position="start",
            ),

            rx.box(
                paginacion(ClientTableState),
                width="100%",
                padding_top="4",
                display="flex",
                justify_content="center",
            ),
            rx.hstack(
                    rx.text("Total:", size="2", color_scheme="gray"),
                    rx.text(ClientTableState.total_count, size="2", weight="medium"),
                    width=["auto", "auto", "150px"], 
                    justify="end",
                    align="center",
                    spacing="2",
                ),

            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.dialog.title("Resultado — Suma de Montos y Deuda"),
                        rx.separator(width="100%"),
                        rx.hstack(
                            rx.icon("users", size=16, color=rx.color("gray", 10)),
                            rx.text("Clientes procesados: ", size="3"),
                            rx.text(
                                ClientActionsState.result_cantidad.to_string(),
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("banknote", size=16, color=rx.color("grass", 9)),
                            rx.text("Suma Valor Plan: ", size="3"),
                            rx.text(
                                ClientActionsState.result_suma_monto.to_string(),
                                size="3",
                                weight="bold",
                                color=rx.color("grass", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("trending-down", size=16, color=rx.color("tomato", 9)),
                            rx.text("Suma Deuda: ", size="3"),
                            rx.text(
                                ClientActionsState.result_suma_deuda.to_string(),
                                size="3",
                                weight="bold",
                                color=rx.color("tomato", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.separator(width="100%"),
                        rx.text(
                            ClientActionsState.result_message,
                            size="2",
                            color_scheme="gray",
                        ),
                        rx.dialog.close(
                            rx.button(
                                "Cerrar",
                                on_click=ClientActionsState.close_result_dialog,
                                color_scheme="gray",
                                variant="soft",
                                width="100%",
                            ),
                        ),
                        spacing="4",
                        width="100%",
                        padding="2",
                    ),
                    max_width="400px",
                ),
                open=ClientActionsState.show_result_dialog,
            ),

            spacing="4",
            width="100%",
            max_width="1400px",
            padding="6",
            margin_x="auto",
        ),
        min_height="100vh",
    )

@rx.page(
    route="/client",
    title="Cliente",
    on_load=[
        AuthState.verify_token,
        ClientTableState.load_page,
        ClientActionsState.clear_selection,
        FilterState.load_all,
    ]
)
def client() -> rx.Component:
    return template(clients_page())
