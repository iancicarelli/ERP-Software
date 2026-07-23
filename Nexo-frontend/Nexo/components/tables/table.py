from typing import Callable, Type, Any
import reflex as rx
from pydantic import BaseModel

def get_auto_columns(dto_class: Type[BaseModel], manual_fields: list[str]) -> list[str]:
    all_fields = []
    if hasattr(dto_class, "model_fields"):
        all_fields = list(dto_class.model_fields.keys())

    else:
        v1_fields = getattr(dto_class, "__fields__", {})
        all_fields = list(v1_fields.keys())
    return [
        f for f in all_fields 
        if f not in manual_fields and not f.startswith("_") and f != "id"
    ]

def generic_table(
    columns: list[str | dict[str, Any]],
    data: rx.Var,
    render_row: Callable,
    actions: Callable | None = None,
    hidden_columns: rx.Var[list[str]] | None = None,
    actions_position: str = "end",
) -> rx.Component:

    actions_at_start = actions is not None and actions_position == "start"

    col_names = [col["name"] if isinstance(col, dict) else col for col in columns]
    table_class_id = f"table-{hash(tuple(col_names))}"

    style_injections = []
    if hidden_columns is not None:
        for i, col in enumerate(columns):
            col_name = col["name"] if isinstance(col, dict) else col
            css_index = i + 1
            # Si la columna "Acciones" se inserta tras el checkbox, todas las
            # columnas de datos posteriores se desplazan una posición en el DOM.
            if actions_at_start and i >= 1:
                css_index += 1
            style_rule = f".{table_class_id} tr > *:nth-child({css_index}) {{ display: none !important; }}"

            should_hide = hidden_columns.contains(col_name)

            style_injections.append(
                rx.cond(
                    should_hide,
                    rx.html(f"<style>{style_rule}</style>"),
                    rx.fragment(),
                )
            )

    header_cells = []
    for col in columns:
        col_name = col["name"] if isinstance(col, dict) else col
        col_display = col.get("display") if isinstance(col, dict) else None
        
        kwargs = {
            "color": rx.color("blue", 12),
            "font_weight": "bold",
            "padding_y": "0.75rem",
            "white_space": "nowrap",
        }
        if col_display is not None:
            kwargs["display"] = col_display

        header_cells.append(rx.table.column_header_cell(col_name, **kwargs))

    def build_header_cells() -> list:
        if actions is None:
            return header_cells
        action_header = rx.table.column_header_cell(
            "Acciones",
            width="100px",
            color=rx.color("blue", 12),
            white_space="nowrap",
        )
        if actions_at_start:
            return header_cells[:1] + [action_header] + header_cells[1:]
        return header_cells + [action_header]

    def build_row(item) -> rx.Component:
        cells = list(render_row(item))
        if actions is not None:
            action_cell = rx.table.cell(
                actions(item),
                padding_y="0.75rem",
                white_space="nowrap",
            )
            if actions_at_start:
                cells = cells[:1] + [action_cell] + cells[1:]
            else:
                cells = cells + [action_cell]
        return rx.table.row(
            *cells,
            _hover={"background_color": rx.color("blue", 3)},
            border_bottom=f"1px solid {rx.color('blue', 4)}",
            transition="background-color 0.2s",
        )

    return rx.box(
        *style_injections,
        rx.table.root(
            rx.table.header(
                rx.table.row(
                    *build_header_cells(),
                    background_color=rx.color("blue", 4),
                    border_bottom=f"1px solid {rx.color('blue', 5)}",
                )
            ),

            rx.table.body(
                rx.foreach(
                    data,
                    build_row,
                )
            ),
            variant="surface",
            size="2",
            width="100%",
            table_layout="fixed",
            class_name=table_class_id,
        ),
        width="100%",
        border_radius="0.5rem",
        overflow="hidden",
        overflow_x="auto",
        background_color=rx.color("blue", 2),
    )