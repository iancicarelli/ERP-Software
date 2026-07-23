import reflex as rx
from typing import List

# COMPONENTS
from ....template import template
# [NUEVO] Importamos get_auto_columns
from ....components.tables.table import generic_table, get_auto_columns
from ....components.navigation.back_button import back_button
from ....components.tables.pagination import paginacion
from ....components.filters.service_filter_ui import service_filter_menu, service_filter_input

# STATES / DTOS
from ....dtos.service.service_table_dto import ServiceDTO
from ....states.service.service_table_state import ServiceTableState
from ....states.service.service_detail_state import ServiceDetailState
from ....states.login.login_state import AuthState

LONG_TEXT_CELL_STYLE = {
    "white_space": "nowrap",
    "overflow": "hidden",
    "text_overflow": "ellipsis",
}
MANUAL_COLUMNS = {
    "estado": "Estado",
    "rut": "RUT",
    "cliente": "Cliente",
    "elemento_elemento": "Servicios",
    "calle": "Calle",
    "cantidad": "Cant.",
    "monto": "Monto",
}
DYNAMIC_FIELDS = get_auto_columns(ServiceDTO, list(MANUAL_COLUMNS.keys()))

def render_service_row(servicio: ServiceDTO) -> list[rx.Component]:
    manual_cells = [
        rx.table.cell(
            rx.badge(
                servicio.estado,
                color_scheme=rx.cond(
                    servicio.estado == "activo", "grass", "amber"
                ),
                variant="soft",
                radius="full",
                text_transform="capitalize",
            ),
            min_width="100px",
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(servicio.rut, font_family="monospace"),
            min_width="110px",
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(servicio.cliente, weight="medium"),
            min_width="200px",
            max_width="250px", 
            **LONG_TEXT_CELL_STYLE,

        ),
        rx.table.cell(
            rx.text(servicio.elemento_elemento),
            min_width="150px", 
            **LONG_TEXT_CELL_STYLE,
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(servicio.calle),
            min_width="200px",
            **LONG_TEXT_CELL_STYLE,
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(f"{servicio.cantidad}", align="center"),
            min_width="80px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
        rx.table.cell(
            rx.text(f"${servicio.monto:,.0f}".replace(",", "."), weight="bold", align="center"),
            min_width="100px",
            display=rx.breakpoints(initial="none", md="table-cell"),
        ),
    ]

    dynamic_cells = [
        rx.table.cell(
            rx.text(getattr(servicio, field_name)), 
            white_space="nowrap",
            display=rx.breakpoints(initial="none", md="table-cell"),
        )
        for field_name in DYNAMIC_FIELDS
    ]

    return manual_cells + dynamic_cells

def render_service_actions(servicio: ServiceDTO) -> rx.Component:
    return rx.hstack(
        rx.icon_button(
            rx.icon("eye", size=18),
            on_click=[
                ServiceDetailState.load_service_by_id(servicio.id),
                rx.redirect("/service/detail"),
            ],
            variant="ghost",
            color_scheme="blue",
            size="2",
        ),
        justify="center",
        align="center",
    )


def services_page() -> rx.Component:
    _ = ServiceTableState.page
    columns_list = []

    for key, name in MANUAL_COLUMNS.items():
        if key in ["cliente"]:
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

    return rx.box(
        rx.vstack(
            back_button(),
            rx.hstack(
                rx.vstack(
                    rx.heading("Servicios", size="6", weight="bold"),
                    rx.text(
                        "Listado general de servicios contratados.",
                        color_scheme="gray",
                        size="2",
                    ),
                    spacing="1",
                ),
                rx.spacer(),
                width="100%",
                margin_bottom="4",
            ),

            rx.vstack(
                rx.hstack(
                   service_filter_menu(),
                   width="100%",
                ),
                service_filter_input(),
                width="100%",
                spacing="2",
                margin_bottom="2",
            ),

            generic_table(
                columns=columns_list,
                data=ServiceTableState.servicios,
                render_row=render_service_row,
                actions=render_service_actions,
                actions_position="start",
            ),

            rx.box(
                paginacion(ServiceTableState),
                width="100%",
                padding_top="4",
                display="flex",
                justify_content="center",
            ),
            rx.hstack(
                rx.box(width="150px", display=["none", "none", "block"]),
                rx.hstack(
                    rx.text("Total:", size="2", color_scheme="gray"),
                    rx.text(ServiceTableState.total_count, size="2", weight="medium"),
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
    route="/service",
    title="Servicio",
    on_load= [
        AuthState.verify_token,
        ServiceTableState.load_page,
    ]

)
def services() -> rx.Component:
    return template(services_page())
