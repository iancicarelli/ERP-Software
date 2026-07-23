import reflex as rx
from ...template import template
from ...components.navigation.back_button import back_button
from ...components.forms.generic_form import generic_detail_form
from ...states.work_orders.orders_add_state import OrdersAddState
from ...states.relations.order_dropdown_state import OrderDropdownState
from ...states.login.login_state import AuthState
from ...utils.generic_form_utils import inject_options

from ...config.order.order_detail_config import (
    FIELDS_ORDER_SERVICIO,
    FIELDS_ORDER_INSTALACION,
    FIELDS_ORDER_ESTADO,
    FIELDS_UBICACION_PERSONAL,
)


def order_add_form(
    *,
    title: str,
    data,
    fields: list[dict],
    mode: str = "edit",
    columns: str = "1",
) -> rx.Component:
    return generic_detail_form(
        title=title,
        data=data,
        fields=fields,
        on_change_text=OrdersAddState.update_field,
        on_change_bool=OrdersAddState.toggle_bool,
        on_change_value=OrdersAddState.update_value,
        mode=mode,
        columns=columns,
    )


def order_add_content() -> rx.Component:
    OPTIONS = {
        "vendedor_str": OrderDropdownState.vendedores_options,
        "zona_str": OrderDropdownState.zonas_options,
        "sector_str": OrderDropdownState.sectores_filtrados_options,
        "servicio_str": OrderDropdownState.servicios_options,
        "estado_str": OrderDropdownState.estados_options,
        "causa_str": OrderDropdownState.causas_options,
        "tecnico_str": OrderDropdownState.tecnicos_options,
    }

    return rx.box(
        rx.vstack(
            back_button(),
            rx.heading("Nueva Orden de Trabajo", size="6", margin_bottom="4"),

            rx.cond(
                OrdersAddState.loading,
                rx.center(rx.spinner(), padding="20"),

                rx.cond(
                    OrdersAddState.orden,
                    rx.vstack(
                        order_add_form(
                            title="INFORMACION ADMINISTRATIVA",
                            data=OrdersAddState.orden,
                            fields=inject_options(FIELDS_UBICACION_PERSONAL, OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        order_add_form(
                            title="INFORMACION DE SERVICIO",
                            data=OrdersAddState.orden,
                            fields=inject_options(FIELDS_ORDER_SERVICIO, OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        order_add_form(
                            title="INFORMACION DE FACTIBILIDAD",
                            data=OrdersAddState.orden,
                            fields=FIELDS_ORDER_INSTALACION,
                            mode="edit",
                            columns="2",
                        ),

                        order_add_form(
                            title="INFORMACION DE GESTION",
                            data=OrdersAddState.orden,
                            fields=inject_options(FIELDS_ORDER_ESTADO, OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        rx.hstack(
                            rx.button(
                                "Cancelar",
                                on_click=rx.redirect("/orders"),
                                variant="soft",
                            ),
                            rx.button(
                                rx.cond(
                                    OrdersAddState.is_saving,
                                    rx.hstack(
                                        rx.spinner(size="1"),
                                        rx.text("Creando..."),
                                        spacing="2",
                                        align="center",
                                    ),
                                    rx.text("Crear Orden"),
                                ),
                                on_click=OrdersAddState.add_entity,
                                disabled=OrdersAddState.is_saving,
                                color_scheme="green",
                            ),
                            spacing="4",
                            justify="end",
                            width="100%",
                            padding_top="4",
                        ),

                        rx.cond(
                            OrdersAddState.error,
                            rx.callout(
                                OrdersAddState.error,
                                icon="triangle_alert",
                                color_scheme="red",
                                width="100%",
                            ),
                        ),

                        spacing="6",
                        width="100%",
                        align_items="center",
                    ),
                    rx.center(
                        rx.text("Error al inicializar el formulario"),
                        padding="20",
                    ),
                ),
            ),
            width="100%",
            max_width="1000px",
            margin_x="auto",
        ),
        padding="5",
        min_height="100vh",
    )


@rx.page(
    route="/order/add",
    title="Nueva Orden de Trabajo",
    on_load=[
        AuthState.verify_token,
        OrdersAddState.init_new_order,
        OrderDropdownState.load_all_order_dropdowns,
    ],
)
def order_add_view() -> rx.Component:
    return template(order_add_content())
