import reflex as rx
from ...template import template
from ...components.tables.table import generic_table, get_auto_columns


from ...components.navigation.back_button import back_button
from ...components.tables.add_remove_columns import column_selector
from ...components.buttons.add_button import add_button
from ...components.tables.pagination import paginacion
from ...components.filters.order_filter_ui import order_filter_menu, order_filter_input_list, order_search_bar
# DTO
from ...dtos.work_orders.orders_table_dto import OrderDTO

from ...states.work_orders.orders_table_state import OrderTableState
from ...states.work_orders.orders_detail_state import OrderDetailState
from ...states.work_orders.order_actions_state import OrderActionsState
from ...states.login.login_state import AuthState
from ...states.filters.filter_state import FilterState
from ...components.actions.action_bar import action_bar

MANUAL_HEADERS = [
    "KoboID", "F. Contrato", "Cliente", "Tipo", "Servicio", 
    "Zona", "Sector", "Coordenadas",
    "Instalación", "Comisión", "Control", "Fechas", "Técnico", "Estado"
]

USED_FIELDS_IN_DESIGN = [
    "koboid", "fecha_contrato", "nombre_completo", "rut", 
    "contrato_nuevo", "migracion", "traslado", 
    "servicio_servicio", "zona_str", "sector_str", "coordenadas", 
    "costo_instalacion", "pago_instalacion", 
    "comision", "comision_pagada", 
    "fecha_programado", "fecha_instalado", 
    "tecnico_str", "estado_estado", 
    "id", "nombre1", "apellido1", "apellido2",
    "modificacion_plan", "abierto"
]

DYNAMIC_FIELDS = get_auto_columns(OrderDTO, USED_FIELDS_IN_DESIGN)

FINAL_COLUMNS_LIST = MANUAL_HEADERS + [f.replace("_", " ").title() for f in DYNAMIC_FIELDS] + ["Acciones"]

RESPONSIVE_COLUMNS_LIST = ["", "Acciones"]  # checkbox (pos 0) + Acciones (pos 1): siempre visibles
for col in FINAL_COLUMNS_LIST:
    if col == "Acciones":
        continue  # ya insertada en la posición 1
    if col == "Cliente":
        RESPONSIVE_COLUMNS_LIST.append(col)
    else:
        RESPONSIVE_COLUMNS_LIST.append({
            "name": col,
            "display": rx.breakpoints(initial="none", md="table-cell")
        })


def status_icon(condition: rx.Var, true_icon: str, false_icon: str, true_color: str, tooltip: str, false_color: str = "gray"):

    return rx.tooltip(
        rx.icon(
            tag=rx.cond(condition, true_icon, false_icon),
            color=rx.cond(condition, true_color, false_color),
            size=18,
        ),
        content=tooltip,
    )

def render_row(orden: OrderDTO) -> list[rx.Component]:
    checkbox_cell = rx.table.cell(
        rx.checkbox(
            checked=OrderActionsState.selected_ids.contains(orden.id),
            on_change=lambda checked: OrderActionsState.toggle_selection(
                orden.id, checked
            ),
        ),
        width="48px",
        padding_x="0.75rem",
        vertical_align="middle",
    )
    manual_cells = [
        rx.table.cell(
            rx.text(rx.cond(orden.koboid, orden.koboid.to_string(), "---"), font_family="monospace"),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(rx.cond(orden.fecha_contrato, orden.fecha_contrato, "---"), white_space="nowrap"), 
            min_width="100px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.vstack(
                rx.text(orden.nombre_completo, weight="bold", white_space="nowrap"),
                rx.text(orden.rut, size="1", color_scheme="gray", font_family="monospace"),
                spacing="1",
                align_items="start", 
            ),
            min_width="220px",
        ),
        rx.table.cell(
            rx.hstack(
                status_icon(orden.contrato_nuevo, "file-plus", "minus", "blue", "Nuevo"),
                status_icon(orden.migracion, "arrow-right-left", "minus", "orange", "Migración"),
                status_icon(orden.traslado, "map-pin", "minus", "purple", "Traslado"),
                spacing="3"
            ),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(orden.servicio_servicio),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(orden.zona_str), min_width="100px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(orden.sector_str), min_width="100px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(rx.cond(orden.coordenadas, orden.coordenadas, "---"), size="1", color_scheme="gray", white_space="nowrap", font_family="monospace"), min_width="120px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.vstack(
                rx.hstack(
                    rx.text("Costo:", size="1", color_scheme="gray"),
                    rx.badge(f"${orden.costo_instalacion}", color_scheme="green"),
                    align="center", spacing="1"
                ),
                rx.hstack(
                    rx.text("Pago:", size="1", color_scheme="gray"),
                    rx.cond(
                        orden.pago_instalacion, 
                        rx.text("Pagado", size="1", color_scheme="grass", weight="bold"), 
                        rx.text("Pendiente", size="1", color_scheme="tomato", weight="bold")
                    ),
                    align="center", spacing="1"
                ),
                spacing="1", align_items="start"
            ),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.hstack(
                status_icon(orden.comision, "circle-dollar-sign", "circle", "amber", "Comisión"),
                status_icon(orden.comision_pagada, "check", "clock", "grass", "Pagada"),
                spacing="3"
            ),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            rx.hstack(
                status_icon(
                    orden.modificacion_plan, 
                    "file-pen-line", "minus", 
                    "indigo", "Modificación de Plan"
                ),

                rx.tooltip(
                    rx.icon(
                        tag=rx.cond(orden.abierto, "lock-open", "lock"),
                        color=rx.cond(orden.abierto, "grass", "gray"),
                        size=18,
                    ),
                    content=rx.cond(orden.abierto, "Orden Abierta", "Orden Cerrada/Validada")
                ),
                spacing="3"
            ),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),

        rx.table.cell(
            rx.vstack(
                rx.text(rx.cond(orden.fecha_programado, f"Prog: {orden.fecha_programado}", "Sin Prog."), size="1"),
                rx.text(rx.cond(orden.fecha_instalado, f"Inst: {orden.fecha_instalado}", "Pendiente"), size="1", weight="bold"),
                spacing="1"
            ),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(orden.tecnico_str),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.badge(
                orden.estado_estado.replace("_", " "),
                color_scheme=rx.match(
                    orden.estado_estado,
                    ("completada", "grass"),
                    ("pendiente", "amber"),
                    ("cancelada", "tomato"),
                    "gray",
                ),
                variant="soft", radius="full", text_transform="capitalize",
            ),
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
    ]

    dynamic_cells = [
        rx.table.cell(
            rx.text(getattr(orden, field_name)),
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        )
        for field_name in DYNAMIC_FIELDS
    ]

    actions_cell = rx.table.cell(
        rx.hstack(
            rx.icon_button(
                rx.icon("eye", size=18),
                on_click=[
                    OrderDetailState.load_order_by_id(orden.id),
                    rx.redirect("/order/detail"),
                ],
                variant="ghost",
                color_scheme="blue",
                size="2",
            ),
            justify="center", align="center",
        ),
    )

    return [checkbox_cell, actions_cell] + manual_cells + dynamic_cells


def filter_controls() -> rx.Component:
    return rx.vstack(
        order_search_bar(),
        rx.hstack(
            order_filter_menu(),
            column_selector(
                columns=FINAL_COLUMNS_LIST,
                hidden_columns=OrderTableState.hidden_columns,
                on_toggle=OrderTableState.toggle_column,
            ),
            rx.spacer(),
            add_button("Nueva Orden", on_click=rx.redirect("/order/add")),
            width="100%",
            align="center",
            spacing="3",
        ),
        rx.vstack(
            order_filter_input_list(),
            width="100%",
            spacing="2",
        ),
        width="100%",
        spacing="3",
        margin_bottom="4",
    )


def orders_page() -> rx.Component:
    return rx.box(
        rx.vstack(
            back_button(),
            rx.hstack(
                rx.vstack(
                    rx.heading("Gestión de Órdenes", size="6", weight="bold"),
                    rx.text(
                        "Gestión y seguimiento de órdenes registradas.",
                        color_scheme="gray",
                        size="2",
                    ),
                    spacing="1",
                ),
                width="100%",
                margin_bottom="4",
            ),
            filter_controls(),
            rx.cond(
                OrderTableState.total_count > 0,
                rx.hstack(
                    rx.button(
                        rx.icon("plus", size=13),
                        "Seleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="indigo",
                        on_click=OrderTableState.add_current_page,
                    ),
                    rx.button(
                        rx.icon("minus", size=13),
                        "Deseleccionar página",
                        size="1",
                        variant="soft",
                        color_scheme="gray",
                        on_click=OrderTableState.remove_current_page,
                        disabled=OrderActionsState.selected_ids.length() == 0,
                    ),
                    rx.separator(orientation="vertical", size="1"),
                    rx.button(
                        rx.cond(
                            OrderActionsState.loading_all_ids,
                            rx.spinner(size="1"),
                            rx.text(
                                "Seleccionar todos (",
                                OrderTableState.total_count.to_string(),
                                ")",
                            ),
                        ),
                        variant="ghost",
                        size="1",
                        color_scheme="indigo",
                        on_click=OrderTableState.trigger_select_all,
                        disabled=OrderActionsState.loading_all_ids,
                    ),
                    rx.cond(
                        OrderActionsState.selected_ids.length() > 0,
                        rx.button(
                            rx.icon("x", size=13),
                            "Limpiar",
                            size="1",
                            variant="soft",
                            color_scheme="red",
                            on_click=OrderActionsState.clear_selection,
                        ),
                        rx.fragment(),
                    ),
                    rx.cond(
                        OrderActionsState.select_all_mode,
                        rx.hstack(
                            rx.icon("triangle-alert", size=14,
                                    color=rx.color("orange", 9)),
                            rx.text(
                                "La acción se aplicará a ",
                                rx.text.span(
                                    OrderTableState.total_count.to_string(),
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
                    OrderActionsState.select_all_mode,
                    OrderTableState.total_count,
                    OrderActionsState.selected_ids.length(),
                ),
                selected_action=OrderActionsState.selected_action,
                actions_loading=OrderActionsState.actions_loading,
                actions=[
                    {"value": "exportar_ordenes_csv", "label": "Exportar a CSV"},
                    {"value": "imprimir_orden_de_trabajo", "label": "Imprimir Orden de Trabajo"},
                ],
                on_action_change=OrderActionsState.set_selected_action,
                on_ejecutar=OrderActionsState.ejecutar_accion,
                on_clear=OrderActionsState.clear_selection,
            ),
            generic_table(
                columns=RESPONSIVE_COLUMNS_LIST, 
                data=OrderTableState.ordenes,
                render_row=render_row,
                hidden_columns=OrderTableState.hidden_columns,
            ),
            paginacion(OrderTableState),
            rx.hstack(
                rx.box(width="150px", display=["none", "none", "block"]),
                rx.hstack(
                    rx.text("Total:", size="2", color_scheme="gray"),
                    rx.text(OrderTableState.total_count, size="2", weight="medium"),
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
            spacing="4",
            width="100%",
            max_width="1400px",
            padding="6",
            margin_x="auto",
        ),
        min_height="100vh",
    )

@rx.page(
    route="/orders",
    title="Ordenes",
    on_load=[
    AuthState.verify_token,
    OrderTableState.load_page,
    OrderActionsState.clear_selection,
    FilterState.load_all,
    ])
def orders() -> rx.Component:
    return template(orders_page())
