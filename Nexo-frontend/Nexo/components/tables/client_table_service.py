import reflex as rx
from .table import generic_table, get_auto_columns 
from ...states.clients.client_table_service_state import ClientTableServiceState
from ...dtos.clients.client_table_service_dto import ClientTableServiceDTO
from ...states.service.service_detail_state import ServiceDetailState


MANUAL_COLUMNS = ["activo", "monto", "personalizado"]

DYNAMIC_FIELDS = get_auto_columns(ClientTableServiceDTO, MANUAL_COLUMNS)

HEADERS_MAP = {
    "id": "ID",
    "elemento": "Elemento/Servicio",
    "cantidad": "Cant.",
    "direccion": "Dirección Asoc.",
    "activo": "Estado",
    "monto": "Precio",
    "personalizado": "Personalizado"
}

def render_service_row(service: ClientTableServiceDTO):
    final_order = ["id"] + DYNAMIC_FIELDS + MANUAL_COLUMNS
    
    cells = []
    for field in final_order:
        if field == "activo":
            cells.append(
                rx.table.cell(
                    rx.cond(
                        service.activo,
                        rx.badge("Activo", color_scheme="blue", variant="solid"),
                        rx.badge("Inactivo", color_scheme="gray", variant="soft"),
                    )
                )
            )
        elif field == "personalizado":
            cells.append(
                rx.table.cell(
                    rx.cond(
                        service.personalizado,
                        rx.badge("Sí", color_scheme="purple", variant="surface"),
                        rx.badge("No", color_scheme="gray", variant="surface"),
                    )
                )
            )
        elif field == "monto":
            cells.append(rx.table.cell(rx.text(f"${service.monto}")))

        else:
            style = {"font_weight": "bold"} if field == "elemento" else {}
            cells.append(rx.table.cell(getattr(service, field), **style))

    cells.append(
        rx.table.cell(
            rx.hstack(
                rx.icon_button(
                    rx.icon("pencil", size=18),
                    on_click=[
                        ServiceDetailState.load_service_by_id(service.id.to_string()),
                        rx.redirect("/service/detail"),
                    ],
                    variant="ghost",
                    color_scheme="violet",
                    cursor="pointer",
                ),
                rx.cond(
                    ClientTableServiceState.pending_delete_id == service.id,
                    rx.tooltip(
                        rx.icon_button(
                            rx.icon("trash-2", size=18),
                            on_click=ClientTableServiceState.confirm_delete(service.id),
                            variant="soft",
                            color_scheme="red",
                            cursor="pointer",
                        ),
                        content="¿Confirmar eliminación? Click para confirmar",
                    ),
                    rx.icon_button(
                        rx.icon("trash-2", size=18),
                        on_click=ClientTableServiceState.request_delete(service.id),
                        variant="ghost",
                        color_scheme="gray",
                        cursor="pointer",
                    ),
                ),
                spacing="1",
                align_items="center",
            ),
            padding_x="2",
        )
    )

    return cells

def client_table_service() -> rx.Component:
    final_order = ["id"] + DYNAMIC_FIELDS + MANUAL_COLUMNS
    
    display_columns = [
        HEADERS_MAP.get(field, field.replace("_", " ").capitalize()) 
        for field in final_order
    ]

    display_columns.append("Acciones")

    return rx.vstack(
        generic_table(
            columns=display_columns,
            data=ClientTableServiceState.servicios,
            render_row=render_service_row,
            actions=None, 
        ),
        width="100%",
        spacing="4",
    )