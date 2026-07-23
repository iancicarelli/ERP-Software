import reflex as rx

### COMPONENTS
from ....template import template
from ....components.tables.table import generic_table, get_auto_columns
from ....components.navigation.back_button import back_button
from ....components.tables.add_remove_columns import column_selector
from ....components.tables.pagination import paginacion 

# FILTROS
from ....components.filters.payment_filter_ui import (
    payment_filter_menu,
    payment_filter_input,
    payment_search_bar,
)

### STATES / DTOS
from ....dtos.payments.payment_table_dto import PaymentDTO
from ....states.payments.payment_table_state import PaymentTableState
from ....states.payments.payment_actions_state import PaymentActionsState
from ....states.login.login_state import AuthState
from ....states.filters.filter_state import FilterState
from ....components.actions.action_bar import action_bar

LONG_TEXT_CELL_STYLE = {
    "white_space": "nowrap",
    "overflow": "hidden",
    "text_overflow": "ellipsis",
}

MANUAL_COLUMNS = {
    "cliente_existe": "Existe",              
    "cliente_str": "Cliente",                 
    "identificacion": "Identificación (RUT)",
    "date": "Fecha",                          
    "control_fechas": "Control Fechas",       
    "credit": "Monto",                        
}

EXCLUDED_FIELDS = list(MANUAL_COLUMNS.keys()) + [
    "id", 
    "cliente_rut", 
    "voucher_rut", 
    "entry_date", 
    "expiration_date"
]

DYNAMIC_FIELDS = get_auto_columns(PaymentDTO, EXCLUDED_FIELDS)

def render_row(payment: PaymentDTO) -> list[rx.Component]:
    checkbox_cell = rx.table.cell(
        rx.checkbox(
            checked=PaymentActionsState.selected_ids.contains(payment.id),
            on_change=lambda checked: PaymentActionsState.toggle_selection(
                payment.id, checked
            ),
        ),
        width="48px",
        padding_x="0.75rem",
        vertical_align="middle",
    )
    manual_cells = [
        rx.table.cell(
            rx.badge(
                rx.cond(payment.cliente_existe, "Sí", "No"),
                color_scheme=rx.cond(payment.cliente_existe, "grass", "gray"),
                variant="soft",
                radius="full",
            ),
            align="center",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(payment.cliente_str, weight="medium"),
            min_width="200px",
            **LONG_TEXT_CELL_STYLE,
        ),
        rx.table.cell(
            rx.vstack(
                rx.hstack(
                    rx.text("Cliente:", size="1", color_scheme="gray"),
                    rx.text(payment.cliente_rut, font_family="monospace", weight="medium"),
                    spacing= "1",
                ),
                rx.hstack(
                    rx.text("Voucher:", size="1", color_scheme="gray"),
                    rx.text(payment.voucher_rut, size="1", font_family="monospace", color_scheme="gray"),
                    spacing="1",
                ),
                spacing="1",
                align="start",
            ),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"), 
        ),
        rx.table.cell(
            rx.text(payment.date.split("T")[0]), 
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"), 
        ),
        rx.table.cell(
            rx.vstack(
                rx.hstack(
                    rx.text("Ing:", size="1", color_scheme="gray"),
                    rx.text(payment.entry_date.split(".")[0].replace("T", " "), weight="medium"),
                    spacing="1",
                ),
                rx.hstack(
                    rx.text("Ven:", size="1", color_scheme="gray"),
                    rx.text(
                        payment.expiration_date.split("T")[0], 
                        size="1", 
                        color_scheme="crimson"
                    ),
                    spacing="1",
                ),
                spacing="1",
                align="start",
            ),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"), 
        ),
        rx.table.cell(
            rx.text(f"${payment.credit:,}".replace(",", "."), weight="bold"),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"), 
        ),
    ]

    dynamic_cells = [
        rx.table.cell(
            rx.text(getattr(payment, field_name)), 
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"), 
        )
        for field_name in DYNAMIC_FIELDS
    ]
    return [checkbox_cell] + manual_cells + dynamic_cells


def payments_page() -> rx.Component:
    _ = PaymentTableState.page
    
    columns_list = []

    for key, name in MANUAL_COLUMNS.items():
        if key in ["cliente_str"]:
            columns_list.append(name) 
        else:
            columns_list.append({
                "name": name, 
                "display": rx.breakpoints(initial="none", md="table-cell")
            })

    for f in DYNAMIC_FIELDS:
        columns_list.append({
            "name": f.replace("_", " ").title(),
            "display": rx.breakpoints(initial="none", md="table-cell")
        })

    columns_names = [col["name"] if isinstance(col, dict) else col for col in columns_list]

    # Columna vacía inicial para el checkbox de selección
    columns_list = [""] + columns_list

    return rx.box(
        rx.vstack(
            back_button(),

            rx.hstack(
                rx.vstack(
                    rx.heading("Pagos", size="6", weight="bold"),
                    rx.text(
                        "Historial de pagos y vouchers recibidos.",
                        color_scheme="gray",
                        size="2",
                    ),
                    spacing="1",
                ),
                rx.spacer(),
                width="100%",
                margin_bottom="6",
                align="center",
            ),

            rx.vstack(
                payment_search_bar(),
                rx.hstack(
                    payment_filter_menu(),

                    column_selector(
                        columns=columns_names, 
                        hidden_columns=PaymentTableState.hidden_columns,
                        on_toggle=PaymentTableState.toggle_column,
                    ),

                    spacing="3",
                    align="center",
                    width="100%",
                ),

                payment_filter_input(), 

                width="100%",
                spacing="4",
            ),

            rx.cond(
                PaymentTableState.total_count > 0,
                rx.hstack(
                    rx.button(
                        rx.icon("plus", size=13),
                        "Seleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="indigo",
                        on_click=PaymentTableState.add_current_page,
                    ),
                    rx.button(
                        rx.icon("minus", size=13),
                        "Deseleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="gray",
                        on_click=PaymentTableState.remove_current_page,
                        disabled=PaymentActionsState.selected_ids.length() == 0,
                    ),
                    rx.separator(orientation="vertical", size="1"),
                    rx.button(
                        rx.cond(
                            PaymentActionsState.loading_all_ids,
                            rx.spinner(size="1"),
                            rx.text(
                                "Seleccionar todos (",
                                PaymentTableState.total_count.to_string(),
                                ")",
                            ),
                        ),
                        variant="ghost",
                        size="1",
                        color_scheme="indigo",
                        on_click=PaymentTableState.trigger_select_all,
                        disabled=PaymentActionsState.loading_all_ids,
                    ),
                    rx.cond(
                        PaymentActionsState.selected_ids.length() > 0,
                        rx.button(
                            rx.icon("x", size=13),
                            "Limpiar",
                            size="1",
                            variant="soft",
                            color_scheme="red",
                            on_click=PaymentActionsState.clear_selection,
                        ),
                        rx.fragment(),
                    ),
                    rx.cond(
                        PaymentActionsState.select_all_mode,
                        rx.hstack(
                            rx.icon("triangle-alert", size=14,
                                    color=rx.color("orange", 9)),
                            rx.text(
                                "La acción se aplicará a ",
                                rx.text.span(
                                    PaymentTableState.total_count.to_string(),
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

            rx.box(
                action_bar(
                    selected_count=rx.cond(
                        PaymentActionsState.select_all_mode,
                        PaymentTableState.total_count,
                        PaymentActionsState.selected_ids.length(),
                    ),
                    selected_action=PaymentActionsState.selected_action,
                    actions_loading=PaymentActionsState.actions_loading,
                    actions=[
                        {"value": "sumar_pagos", "label": "Sumar pagos"},
                        {"value": "exportar_pagos_csv", "label": "Exportar a CSV"},
                    ],
                    on_action_change=PaymentActionsState.set_selected_action,
                    on_ejecutar=PaymentActionsState.ejecutar_accion,
                    on_clear=PaymentActionsState.clear_selection,
                ),
                width="100%",
                margin_bottom="4",
            ),

            generic_table(
                columns=columns_list, 
                data=PaymentTableState.payments,
                render_row=render_row,
                actions=None, 
                hidden_columns=PaymentTableState.hidden_columns,
            ),

            rx.box(
                paginacion(PaymentTableState),
                width="100%",
                padding_top="4",
                display="flex",
                justify_content="center",
            ),
            rx.hstack(
                rx.text("Total:", size="2", color_scheme="gray"),
                rx.text(PaymentTableState.total_count, size="2", weight="medium"),
                width=["auto", "auto", "150px"],
                justify="end",
                align="center",
                spacing="2",
            ),

            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.dialog.title("Resultado — Suma de Pagos"),
                        rx.separator(width="100%"),
                        rx.hstack(
                            rx.icon("users", size=16, color=rx.color("gray", 10)),
                            rx.text("Pagos procesados: ", size="3"),
                            rx.text(
                                PaymentActionsState.result_elementos_seleccionados.to_string(),
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("banknote", size=16, color=rx.color("grass", 9)),
                            rx.text("Suma total: ", size="3"),
                            rx.text(
                                f"${PaymentActionsState.result_suma}",
                                size="3",
                                weight="bold",
                                color=rx.color("grass", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.separator(width="100%"),
                        rx.text(
                            PaymentActionsState.result_message,
                            size="2",
                            color_scheme="gray",
                        ),
                        rx.dialog.close(
                            rx.button(
                                "Cerrar",
                                on_click=PaymentActionsState.close_result_dialog,
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
                open=PaymentActionsState.show_result_dialog,
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
    route="/payments",
    title="Pagos",
    on_load=[
        AuthState.verify_token,
        PaymentTableState.load_page,
        PaymentActionsState.clear_selection,
        FilterState.load_all,
    ]
)
def payment() -> rx.Component:
    return template(payments_page())
