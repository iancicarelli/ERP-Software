import reflex as rx
from typing import Any, Callable, List, Dict
from reflex.vars import Var

from ...utils.generic_form_utils import (
    normalize_bool,
    normalize_value,
    smart_group_fields,
    LABEL_STYLE,
    INPUT_STYLE,
    SELECT_STYLE,
)


def render_single_switch(
    field: dict,
    data: Any,
    mode: str,
    on_change: Callable,
) -> rx.Component:

    key = field["key"]
    label = field.get("label", key)

    value = getattr(data, key, None)
    if value is None and isinstance(data, dict):
        value = data.get(key)

    is_checked = normalize_bool(value)

    label_color = rx.cond(
        is_checked,
        rx.color("accent", 11),
        rx.color("blue", 11),
    )

    font_weight = rx.cond(is_checked, "bold", "medium")

    return rx.hstack(
        rx.switch(
            checked=is_checked,
            disabled=mode == "view",
            on_change=lambda v: on_change(key, v),
            size="2",
        ),
        rx.text(
            label,
            size="2",
            weight=font_weight,
            color=label_color,
        ),
        align="center",
        spacing="2",
        width="100%",
    )


def render_boolean_group(
    group_field: dict,
    data: Any,
    mode: str,
    on_change_bool: Callable,
) -> rx.Component:

    return rx.vstack(
        rx.text("Opciones", **LABEL_STYLE),
        rx.grid(
            *[
                render_single_switch(f, data, mode, on_change_bool)
                for f in group_field["fields"]
            ],
            columns="3",
            spacing="2",
            width="100%",
        ),
        width="100%",
    )


def render_input_or_select(
    field: dict,
    data: Any,
    mode: str,
    on_change_text: Callable,
    on_change_value: Callable,
) -> rx.Component:

    key = field["key"]
    label = field.get("label", key)
    field_type = field.get("type", "text")
    readonly = field.get("readonly", False)
    display = field.get("display", "input")

    value = getattr(data, key, None)
    if value is None and isinstance(data, dict):
        value = data.get(key)

    default_val = normalize_value(value)

    if (
        field_type == "datetime-local"
        and isinstance(default_val, str)
        and len(default_val) > 16
    ):
        default_val = default_val[:16]

    has_data = default_val != ""

    bg_color = rx.cond(
        has_data,
        rx.color("accent", 3),
        rx.color("blue", 3),
    )

    border_style = rx.cond(
        has_data,
        f"1px solid {rx.color('accent', 9)}",
        "1px solid transparent",
    )

    is_number = field_type == "number"

    current_input_style = INPUT_STYLE.copy()

    if is_number:
        current_input_style["width"] = "100px"
        current_input_style["text_align"] = "center"

    if field_type == "select":
        options = field.get("options", [])

        if isinstance(options, Var):
            select_component = rx.select.root(
                rx.select.trigger(placeholder=label),
                rx.select.content(
                    rx.foreach(
                        options,
                        lambda item: rx.select.item(
                            item[1],
                            value=item[1],
                        )
                    )
                ),
                value=default_val,
                disabled=mode == "view",
                on_change=lambda v: on_change_text(key, v),
                **SELECT_STYLE,
            )
        else:
            select_component = rx.select(
                options,
                value=default_val,
                disabled=mode == "view",
                on_change=lambda v: on_change_text(key, v),
                background_color=bg_color,
                border=border_style,
                **SELECT_STYLE,
            )

        return rx.vstack(
            rx.text(label, **LABEL_STYLE),
            select_component,
            spacing="0",
            width="100%",
        )

    if readonly and display == "text":
        return rx.vstack(
            rx.text(label, **LABEL_STYLE),
            rx.box(
                rx.text(default_val, size="3", weight="medium"),
                padding="2",
                height="40px",
                display="flex",
                align_items="center",
                background_color=bg_color,
                border=border_style,
                border_radius="6px",
                width="100%",
            ),
            spacing="0",
            width="100%",
        )


    return rx.vstack(
        rx.text(label, **LABEL_STYLE),
        rx.input(
            name=key,
            value=default_val,
            type=field_type,
            read_only=readonly,
            disabled=mode == "view",
            on_change=lambda v: (
                on_change_value(key, v)
                if is_number
                else on_change_text(key, v)
            ),
            step="0.01" if field_type == "number" else None,
            background_color=bg_color,
            border=border_style,
            **current_input_style,
        ),
        spacing="0",
        width="100%",
        align_items="start",
    )


def render_item(
    item: dict,
    data: Any,
    mode: str,
    on_change_text: Callable,
    on_change_bool: Callable,
    on_change_value: Callable,
) -> rx.Component:

    if item["type"] == "boolean_group":
        return render_boolean_group(
            item,
            data,
            mode,
            on_change_bool,
        )

    return render_input_or_select(
        item,
        data,
        mode,
        on_change_text,
        on_change_value,
    )

def generic_detail_form(
    *,
    title: str,
    data: Any,
    fields: List[Dict],
    on_change_text: Callable[[str, Any], Any],
    on_change_bool: Callable[[str, bool], Any],
    on_change_value: Callable[[str, Any], Any],
    mode: str = "edit",
    columns: str = "1",
) -> rx.Component:

    smart_fields = smart_group_fields(fields)

    return rx.card(
        rx.vstack(
            rx.box(
                rx.heading(
                    title,
                    size="4",
                    weight="bold",
                    text_align="center",
                    color=rx.color("accent", 9),
                    width="100%",
                ),
                padding_y="3",
                padding_x="3",
                background_color=rx.color("accent", 2),
                border_radius="8px",
                width="100%",
            ),
            rx.grid(
                *[
                    render_item(
                        item,
                        data,
                        mode,
                        on_change_text,
                        on_change_bool,
                        on_change_value,
                    )
                    for item in smart_fields
                ],
                columns=columns,
                spacing="4",
                width="100%",
            ),
            spacing="4",
            width="100%",
        ),
        width="100%",
        padding="4",
        box_shadow="0 4px 12px rgba(0,0,0,0.05)",
        border_radius="12px",
        background_color=rx.color("blue", 2),
    )