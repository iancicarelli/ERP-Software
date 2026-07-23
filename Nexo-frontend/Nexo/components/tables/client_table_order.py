import reflex as rx
from .table import generic_table, get_auto_columns
from ...states.clients.client_table_order_state import ClientTableOrderState
from ...dtos.clients.client_table_order_dto import ClientTableOrderDTO
from ...states.work_orders.orders_detail_state import OrderDetailState

MANUAL_COLUMNS = ["abierto", "monto", "fecha_contrato", "fecha_programado", "fecha_instalado"]


DYNAMIC_FIELDS = get_auto_columns(ClientTableOrderDTO, MANUAL_COLUMNS)

HEADERS_MAP = {
    "id": "ID",
    "fecha_contrato": "F. Contrato",
    "modificacion_plan": "Mod. Plan", 
    "migracion": "Migración",
    "traslado": "Traslado",
    "servicio_str": "Servicio",
    "abierto": "Estado",
    "estado_str": "Etapa",
    "fecha_programado": "F. Programada",
    "fecha_instalado": "F. Instalada",
    "monto": "Monto"
}

def render_order_row(order: ClientTableOrderDTO):
    final_order = ["id"] + DYNAMIC_FIELDS + MANUAL_COLUMNS
    
    cells = []
    for field in final_order:
        if field == "abierto":
            cells.append(
                rx.table.cell(
                    rx.cond(
                        order.abierto,
                        rx.badge("Abierto", color_scheme="green", variant="surface"),
                        rx.badge("Cerrado", color_scheme="gray", variant="soft"),
                    )
                )
            )
        elif field == "monto":
            cells.append(rx.table.cell(rx.text(f"${order.monto}")))
        
        elif field in ["fecha_contrato", "fecha_programado", "fecha_instalado"]:
            cells.append(
                rx.table.cell(
                    rx.cond(
                        getattr(order, field),
                        rx.text(getattr(order, field).to_string()), 
                        rx.text("-")
                    )
                )
            )

        else:
            style = {"font_weight": "bold"} if field == "tipo_str" else {}

            val = getattr(order, field)

            if field in ["migracion", "traslado", "modificacion_plan"]:
                 cell_content = rx.cond(val, "Sí", "No")
            else:

                 cell_content = val

            cells.append(rx.table.cell(cell_content, **style))

    cells.append(
        rx.table.cell(
            rx.hstack(
                rx.icon_button(
                    rx.icon("pencil", size=18),
                    on_click=[
                        OrderDetailState.load_order_by_id(order.id.to_string()),
                        rx.redirect("/order/detail"),
                    ],
                    variant="ghost",
                    color_scheme="violet",
                    cursor="pointer",
                ),
                rx.cond(
                    ClientTableOrderState.pending_delete_id == order.id,
                    rx.tooltip(
                        rx.icon_button(
                            rx.icon("trash-2", size=18),
                            on_click=ClientTableOrderState.confirm_delete(order.id),
                            variant="soft",
                            color_scheme="red",
                            cursor="pointer",
                        ),
                        content="¿Confirmar eliminación? Click para confirmar",
                    ),
                    rx.icon_button(
                        rx.icon("trash-2", size=18),
                        on_click=ClientTableOrderState.request_delete(order.id),
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

def client_orders_table() -> rx.Component:
    final_order = ["id"] + DYNAMIC_FIELDS + MANUAL_COLUMNS
    
    display_columns = [
        HEADERS_MAP.get(field, field.replace("_", " ").capitalize())
        for field in final_order
    ]

    display_columns.append("Acciones")

    return rx.vstack(
        generic_table(
            columns=display_columns,
            data=ClientTableOrderState.ordenes,
            render_row=render_order_row,
            actions=None, 
        ),
        width="100%",
        spacing="4",
    )