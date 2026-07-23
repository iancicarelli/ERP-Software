import reflex as rx

from ....template import template
# [NUEVO] Importamos get_auto_columns
from ....components.tables.table import generic_table, get_auto_columns
from ....components.navigation.back_button import back_button
from ....components.tables.pagination import paginacion
from ....components.filters.transfer_filter_ui import (
    transfer_filter_input_list,
    transfer_filter_menu,
    transfer_search_bar,
)
from ....components.tables.add_remove_columns import column_selector

# DTOs y States
from ....dtos.transfers.transfers_table_dto import TransferenciaDTO
from ....states.transfers.transfer_table_state import TransferTableState
from ....states.transfers.transfer_actions_state import TransferActionsState
from ....states.transfers.transfer_assign_client_state import TransferAssignClientState
from ....states.login.login_state import AuthState
from ....states.filters.filter_state import FilterState
from ....components.actions.action_bar import action_bar
from ....components.transfers.assign_client_dialog import assign_client_dialog

LONG_TEXT_CELL_STYLE = {
    "white_space": "nowrap",
    "overflow": "hidden",
    "text_overflow": "ellipsis",
}

MANUAL_COLUMNS = {
    "fecha": "Fecha",
    "origen": "Origen",
    "cliente_sistema": "Cliente Sistema / Codigo Transferencia",
    "banco": "Banco",
    "monto": "Monto",
    "estado": "Estado",
    "documentos": "Documentos",
    "validaciones": "Validaciones",
}

FIELDS_USED_IN_MANUAL = [
    "fecha", "nombre", "rut_transferencia", "cliente_str", "codigo_transferencia",
    "banco_origen", "cuenta_destino", "monto", "estado", "documento_venta",
    "documento_vencimiento", "cliente_existe", "documento_pagado", "voucher_generado",
    "id"
]

DYNAMIC_FIELDS = get_auto_columns(TransferenciaDTO, FIELDS_USED_IN_MANUAL)


def render_status_badge(estado: str) -> rx.Component:
    return rx.badge(
        estado,
        color_scheme=rx.match(
            estado,
            ("Ok", "grass"),
            ("Pendiente", "amber"),
            ("Rechazado", "red"),
            "gray",
        ),
        variant="soft",
        radius="full",
    )


def render_row(transferencia: TransferenciaDTO) -> list[rx.Component]:
    checkbox_cell = rx.table.cell(
        rx.checkbox(
            checked=TransferActionsState.selected_ids.contains(transferencia.id),
            on_change=lambda checked: TransferActionsState.toggle_selection(
                transferencia.id, checked
            ),
        ),
        width="48px",
        padding_x="0.75rem",
        vertical_align="middle",
    )
    manual_cells = [
        rx.table.cell(
            rx.text(transferencia.fecha),
            white_space="nowrap",
        ),

        rx.table.cell(
            rx.vstack(
                rx.text(
                    transferencia.nombre,
                    weight="medium",
                    white_space="normal",   # allow wrap
                ),
                rx.text(
                    transferencia.rut_transferencia,
                    size="1",
                    color_scheme="gray",
                    white_space="nowrap",
                ),
                spacing="1",
                align="start",
            ),
            min_width="180px",
            max_width="280px",
        ),

        rx.table.cell(
            rx.vstack(
                rx.cond(
                    transferencia.cliente_str != "",
                    rx.text(
                        transferencia.cliente_str,
                        weight="bold",
                        size="2",
                        white_space="normal",   # allow wrap
                    ),
                    rx.button(
                        rx.icon("user-plus", size=12),
                        "Asignar",
                        size="1",
                        variant="ghost",
                        color_scheme="indigo",
                        on_click=lambda: TransferAssignClientState.open_dialog(
                            transferencia.id
                        ),
                    ),
                ),
                rx.cond(
                    transferencia.codigo_transferencia != "",
                    rx.hstack(
                        rx.text("Ref:", size="1", color_scheme="gray"),
                        rx.badge(
                            transferencia.codigo_transferencia,
                            variant="outline",
                            size="1",
                        ),
                        spacing="1",
                        align="center",
                    ),
                ),
                spacing="1",
                align="start",
                width="100%",
            ),
            min_width="220px",
            max_width="320px",
            padding_left="16px",
            padding_right="16px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            rx.vstack(
                rx.text(
                    transferencia.banco_origen,
                    weight="medium",
                    **LONG_TEXT_CELL_STYLE,
                ),
                rx.text(
                    f"Dest: {transferencia.cuenta_destino}",
                    size="1",
                    color_scheme="gray",
                ),
                spacing="1",
            ),
            min_width="160px",
            padding_left="8px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            rx.text(f"${transferencia.monto}"),
            white_space="nowrap",
            font_family="monospace",
            weight="bold",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            render_status_badge(transferencia.estado),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            rx.vstack(
                rx.cond(
                    transferencia.documento_venta != "",
                    rx.text(
                        f"Doc: {transferencia.documento_venta}",
                        size="1",
                    ),
                ),
                rx.cond(
                    transferencia.documento_vencimiento != "",
                    rx.text(
                        f"Vence: {transferencia.documento_vencimiento}",
                        size="1",
                        color_scheme="crimson",
                    ),
                ),
                spacing="1",
            ),
            min_width="120px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            rx.hstack(
                rx.tooltip(
                    rx.icon(
                        tag=rx.cond(
                            transferencia.cliente_existe,
                            "user-check",
                            "user-x",
                        ),
                        color=rx.cond(
                            transferencia.cliente_existe,
                            "green",
                            "gray",
                        ),
                        size=18,
                    ),
                    content=rx.cond(
                        transferencia.cliente_existe,
                        "✅ Cliente Registrado",
                        "⚠️ Cliente No Encontrado",
                    ),
                ),
                rx.tooltip(
                    rx.icon(
                        tag=rx.cond(
                            transferencia.documento_pagado,
                            "circle-check",
                            "circle",
                        ),
                        color=rx.cond(
                            transferencia.documento_pagado,
                            "blue",
                            "gray",
                        ),
                        size=18,
                    ),
                    content=rx.cond(
                        transferencia.documento_pagado,
                        "✅ Documento Pagado",
                        "⏳ Documento Pendiente",
                    ),
                ),
                rx.tooltip(
                    rx.icon(
                        tag=rx.cond(
                            transferencia.voucher_generado != "",
                            "file-text",
                            "minus",
                        ),
                        color=rx.cond(
                            transferencia.voucher_generado != "",
                            "purple",
                            "gray",
                        ),
                        size=18,
                    ),
                    content=rx.cond(
                        transferencia.voucher_generado != "",
                        "✅ Voucher Generado",
                        "🚫 Sin Voucher",
                    ),
                ),
                spacing="3",
                justify="center",
            ),
            align="center",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
    ]

    dynamic_cells = [
        rx.table.cell(
            rx.text(getattr(transferencia, field_name)),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        )
        for field_name in DYNAMIC_FIELDS
    ]

    return [checkbox_cell] + manual_cells + dynamic_cells


def transfers_page() -> rx.Component:
    
    columns_list = []

    for key, name in MANUAL_COLUMNS.items():
        if key in ["fecha", "origen", "accion"]:
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
                    rx.heading("Transferencias", size="6", weight="bold"),
                    rx.text(
                        "Gestión de transferencias bancarias recibidas.",
                        color_scheme="gray",
                        size="2",
                    ),
                    spacing="1",
                ),
                rx.spacer(),
                width="100%",
                margin_bottom="4",
            ),

            transfer_search_bar(),

            rx.hstack(
                transfer_filter_menu(),
                column_selector(
                    columns=columns_names,
                    hidden_columns=TransferTableState.hidden_columns,
                    on_toggle=TransferTableState.toggle_column,
                ),
                width="100%",
                margin_bottom="2",
                align="center",
                spacing="3",
            ),

            rx.vstack(
                transfer_filter_input_list(),
                width="100%",
                spacing="2",
                margin_bottom="2",
            ),

            rx.cond(
                TransferTableState.total_count > 0,
                rx.hstack(
                    rx.button(
                        rx.icon("plus", size=13),
                        "Seleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="indigo",
                        on_click=TransferTableState.add_current_page,
                    ),
                    rx.button(
                        rx.icon("minus", size=13),
                        "Deseleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="gray",
                        on_click=TransferTableState.remove_current_page,
                        disabled=TransferActionsState.selected_ids.length() == 0,
                    ),
                    rx.separator(orientation="vertical", size="1"),
                    rx.button(
                        rx.cond(
                            TransferActionsState.loading_all_ids,
                            rx.spinner(size="1"),
                            rx.text(
                                "Seleccionar todos (",
                                TransferTableState.total_count.to_string(),
                                ")",
                            ),
                        ),
                        variant="ghost",
                        size="1",
                        color_scheme="indigo",
                        on_click=TransferTableState.trigger_select_all,
                        disabled=TransferActionsState.loading_all_ids,
                    ),
                    rx.cond(
                        TransferActionsState.selected_ids.length() > 0,
                        rx.button(
                            rx.icon("x", size=13),
                            "Limpiar",
                            size="1",
                            variant="soft",
                            color_scheme="red",
                            on_click=TransferActionsState.clear_selection,
                        ),
                        rx.fragment(),
                    ),
                    rx.cond(
                        TransferActionsState.select_all_mode,
                        rx.hstack(
                            rx.icon("triangle-alert", size=14,
                                    color=rx.color("orange", 9)),
                            rx.text(
                                "La acción se aplicará a ",
                                rx.text.span(
                                    TransferTableState.total_count.to_string(),
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
                    TransferActionsState.select_all_mode,
                    TransferTableState.total_count,
                    TransferActionsState.selected_ids.length(),
                ),
                selected_action=TransferActionsState.selected_action,
                actions_loading=TransferActionsState.actions_loading,
                actions=[
                    {"value": "generar_voucher", "label": "Generar Voucher"},
                    {"value": "eliminar_voucher", "label": "Eliminar Voucher"},
                ],
                on_action_change=TransferActionsState.set_selected_action,
                on_ejecutar=TransferActionsState.ejecutar_accion,
                on_clear=TransferActionsState.clear_selection,
            ),

            generic_table(
                columns=columns_list,
                data=TransferTableState.transferencias,
                render_row=render_row,
                hidden_columns=TransferTableState.hidden_columns, 
            ),

            rx.hstack(
                paginacion(TransferTableState),
                spacing="2",
                justify="center",
                width="100%",
                padding_top="4",
            ),
            rx.hstack(
                rx.box(width="150px", display=["none", "none", "block"]),
                rx.hstack(
                    rx.text("Total:", size="2", color_scheme="gray"),
                    rx.text(TransferTableState.total_count, size="2", weight="medium"),
                    width=["auto", "auto", "150px"], 
                    justify="end",
                    align="center",
                    spacing="2",
                ),
                width="100%",
                padding_top="4",
                align="center",
                justify="between",
            ),

            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.dialog.title("Resultado — Generar Voucher"),
                        rx.separator(width="100%"),
                        rx.hstack(
                            rx.icon("receipt", size=16, color=rx.color("gray", 10)),
                            rx.text("Elementos seleccionados: ", size="3"),
                            rx.text(
                                TransferActionsState.result_elementos_seleccionados.to_string(),
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("check", size=16, color=rx.color("grass", 9)),
                            rx.text("Documento pagado: ", size="3"),
                            rx.text(
                                TransferActionsState.result_pay_document_successful,
                                size="3",
                                weight="bold",
                                color=rx.color("grass", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("hash", size=16, color=rx.color("indigo", 9)),
                            rx.text("Voucher: ", size="3"),
                            rx.text(
                                TransferActionsState.result_pay_document_voucher.to_string(),
                                size="3",
                                weight="bold",
                                color=rx.color("indigo", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("file-text", size=16, color=rx.color("gray", 10)),
                            rx.text("Tipo de documento: ", size="3"),
                            rx.text(
                                TransferActionsState.result_document_type,
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("file-digit", size=16, color=rx.color("gray", 10)),
                            rx.text("Número de documento: ", size="3"),
                            rx.text(
                                TransferActionsState.result_document_number.to_string(),
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("calendar", size=16, color=rx.color("gray", 10)),
                            rx.text("Vencimiento: ", size="3"),
                            rx.text(
                                TransferActionsState.result_document_expiration,
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("banknote", size=16, color=rx.color("grass", 9)),
                            rx.text("Monto: ", size="3"),
                            rx.text(
                                f"${TransferActionsState.result_document_amount}",
                                size="3",
                                weight="bold",
                                color=rx.color("grass", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.separator(width="100%"),
                        rx.text(
                            TransferActionsState.result_message,
                            size="2",
                            color_scheme="gray",
                        ),
                        rx.dialog.close(
                            rx.button(
                                "Cerrar",
                                on_click=TransferActionsState.close_result_dialog,
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
                open=TransferActionsState.show_result_dialog,
            ),

            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.dialog.title("Resultado — Eliminar Voucher"),
                        rx.separator(width="100%"),
                        rx.hstack(
                            rx.icon("receipt", size=16, color=rx.color("gray", 10)),
                            rx.text("Elementos procesados: ", size="3"),
                            rx.text(
                                TransferActionsState.result_eliminar_elementos.to_string(),
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("trash-2", size=16, color=rx.color("tomato", 9)),
                            rx.text("Resultado: ", size="3"),
                            rx.text(
                                TransferActionsState.result_eliminar_result,
                                size="3",
                                weight="bold",
                                color=rx.color("tomato", 9),
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.hstack(
                            rx.icon("message-circle", size=16, color=rx.color("gray", 10)),
                            rx.text("Detalle: ", size="3"),
                            rx.text(
                                TransferActionsState.result_eliminar_mensaje,
                                size="3",
                                weight="bold",
                            ),
                            align="center",
                            spacing="2",
                        ),
                        rx.separator(width="100%"),
                        rx.text(
                            TransferActionsState.result_message,
                            size="2",
                            color_scheme="gray",
                        ),
                        rx.dialog.close(
                            rx.button(
                                "Cerrar",
                                on_click=TransferActionsState.close_eliminar_dialog,
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
                open=TransferActionsState.show_eliminar_dialog,
            ),

            assign_client_dialog(),

            spacing="4",
            width="100%",
            max_width="1400px",
            padding="6",
            margin_x="auto",
        ),
        min_height="100vh",
    )


@rx.page(
    route="/transfers",
    title="Transferencias",
    on_load=[
        AuthState.verify_token,
        TransferTableState.load_page,
        TransferActionsState.clear_selection,
        FilterState.load_all,
    ]

)
def transfers() -> rx.Component:
    return template(transfers_page())
