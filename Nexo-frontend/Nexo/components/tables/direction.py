import reflex as rx
from .table import generic_table, get_auto_columns
from ...states.addresses.direction_table_state import DirectionTableState
from ...states.addresses.direction_detail_state import DirectionDetailState
from ...dtos.addresses.direction_table_dto import DireccionTableDTO

MANUAL_COLUMNS = ["principal", "activo", "monto"]
DYNAMIC_FIELDS = get_auto_columns(DireccionTableDTO, MANUAL_COLUMNS)

HEADERS_MAP = {
    "id": "ID",
    "direccion": "Dirección",
    "sector": "Sector",
    "zona": "Zona",
    "principal": "Tipo",
    "activo": "Estado",
    "monto": "Monto",
    "cliente_str": "Cliente",
}


def render_direction_row(direction: DireccionTableDTO):
    final_order = ["id"] + DYNAMIC_FIELDS + MANUAL_COLUMNS

    cells = []
    for field in final_order:
        if field == "principal":
            cells.append(
                rx.table.cell(
                    rx.cond(
                        direction.principal,
                        rx.badge("Principal", color_scheme="green", variant="solid"),
                        rx.badge("Secundaria", color_scheme="gray", variant="soft"),
                    )
                )
            )
        elif field == "activo":
            cells.append(
                rx.table.cell(
                    rx.cond(
                        direction.activo,
                        rx.badge("Activo", color_scheme="blue", variant="surface"),
                        rx.badge("Inactivo", color_scheme="red", variant="surface"),
                    )
                )
            )
        elif field == "monto":
            cells.append(rx.table.cell(rx.text(f"${direction.monto}")))
        else:
            style = {"font_weight": "bold"} if field == "direccion" else {}
            cells.append(rx.table.cell(getattr(direction, field), **style))

    cells.append(
        rx.table.cell(
            rx.hstack(
                rx.icon_button(
                    rx.icon("pencil", size=18),
                    on_click=[
                        DirectionDetailState.load_direction_by_id(direction.id.to_string()),
                        rx.redirect("/direction/detail"),
                    ],
                    variant="ghost",
                    color_scheme="violet",
                    cursor="pointer",
                ),
                rx.cond(
                    DirectionTableState.pending_delete_id == direction.id,
                    rx.tooltip(
                        rx.icon_button(
                            rx.icon("trash-2", size=18),
                            on_click=DirectionTableState.confirm_delete(direction.id),
                            variant="soft",
                            color_scheme="red",
                            cursor="pointer",
                        ),
                        content="¿Confirmar eliminación? Click para confirmar",
                    ),
                    rx.icon_button(
                        rx.icon("trash-2", size=18),
                        on_click=DirectionTableState.request_delete(direction.id),
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


def directions_table() -> rx.Component:
    final_order = ["id"] + DYNAMIC_FIELDS + MANUAL_COLUMNS

    display_columns = [
        HEADERS_MAP.get(field, field.replace("_", " ").capitalize())
        for field in final_order
    ]
    display_columns.append("Acciones")

    return rx.vstack(
        generic_table(
            columns=display_columns,
            data=DirectionTableState.direcciones,
            render_row=render_direction_row,
            actions=None,
        ),
        width="100%",
        spacing="4",
    )