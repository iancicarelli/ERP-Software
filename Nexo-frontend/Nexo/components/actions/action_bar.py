import reflex as rx
from typing import List


def action_bar(
    *,
    selected_count: rx.Var,
    selected_action: rx.Var,
    actions_loading: rx.Var,
    actions: List[dict],        # [{"value": "...", "label": "..."}, ...]
    on_action_change,
    on_ejecutar,
    on_clear,
) -> rx.Component:
    """
    Barra de acciones bulk reutilizable.
    Solo visible cuando selected_count > 0.

    Uso:
        action_bar(
            selected_count=ClientActionsState.selected_ids.length(),
            selected_action=ClientActionsState.selected_action,
            actions_loading=ClientActionsState.actions_loading,
            actions=[
                {"value": "sumar_montos_deuda_action", "label": "Sumar montos y deuda"},
            ],
            on_action_change=ClientActionsState.set_selected_action,
            on_ejecutar=ClientActionsState.ejecutar_accion,
            on_clear=ClientActionsState.clear_selection,
        )
    """
    return rx.cond(
        selected_count > 0,
        rx.hstack(
            # Contador
            rx.hstack(
                rx.icon("square-check-big", size=16, color=rx.color("indigo", 9)),
                rx.text(selected_count.to_string(), size="2", weight="bold"),
                rx.text("seleccionados", size="2", color=rx.color("gray", 11)),
                align="center",
                spacing="1",
            ),

            rx.separator(orientation="vertical", size="2"),

            # Dropdown de acciones (misma forma que generic_form.py)
            rx.select.root(
                rx.select.trigger(placeholder="Seleccionar acción...", width="260px"),
                rx.select.content(
                    *[
                        rx.select.item(action["label"], value=action["value"])
                        for action in actions
                    ],
                ),
                value=selected_action,
                on_change=on_action_change,
                size="2",
            ),

            # Botón ejecutar
            rx.button(
                rx.icon("play", size=15),
                "Ejecutar",
                on_click=on_ejecutar,
                color_scheme="indigo",
                variant="solid",
                size="2",
                loading=actions_loading,
                disabled=actions_loading,
            ),

            rx.spacer(),

            # Limpiar
            rx.button(
                rx.icon("x", size=14),
                "Limpiar selección",
                on_click=on_clear,
                variant="ghost",
                color_scheme="gray",
                size="2",
            ),

            width="100%",
            align="center",
            padding_x="4",
            padding_y="3",
            background=rx.color("indigo", 2),
            border=f"1px solid {rx.color('indigo', 4)}",
            border_radius="8px",
            spacing="3",
        ),
        rx.fragment(),
    )
