import reflex as rx
from ...template import template
from ...components.forms.order_form import order_form
from ...components.navigation.back_button import back_button
from ...states.work_orders.orders_detail_state import OrderDetailState
from ...states.relations.order_dropdown_state import OrderDropdownState
from ...utils.generic_form_utils import inject_options
from ...states.login.login_state import AuthState
from ...components.forms.order_notas_component import order_notas_section

from ...config.order.order_detail_config import (
    FIELDS_ORDER_CLIENTE,
    FIELDS_ORDER_SERVICIO,
    FIELDS_ORDER_INSTALACION,
    FIELDS_ORDER_ESTADO,
    FIELDS_UBICACION_PERSONAL,
)

def order_detail_content() -> rx.Component:

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
            rx.hstack(
                back_button(),
                rx.spacer(),
                width="100%",
            ),

            rx.heading("Ficha de Orden de Trabajo", size="6", margin_bottom="4"),

            rx.cond(
                OrderDetailState.loading,
                rx.center(rx.spinner(), padding="20"),

                rx.cond(
                    OrderDetailState.orden,
                    rx.vstack(
                        order_form(
                            title="INFORMACION DE KOBOTOOLBOX",
                            data=OrderDetailState.orden,
                            fields=FIELDS_ORDER_CLIENTE,
                            mode="view",
                            columns="2",
                        ),

                        order_form(
                            title="INFORMACION ADMINISTRATIVA",
                            data=OrderDetailState.orden,
                            fields=inject_options(FIELDS_UBICACION_PERSONAL, OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        order_form(
                            title="INFORMACION DE SERVICIO",
                            data=OrderDetailState.orden,
                            fields=inject_options(FIELDS_ORDER_SERVICIO, OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        order_form(
                            title="INFORMACION DE FACTIBILIDAD",
                            data=OrderDetailState.orden,
                            fields=FIELDS_ORDER_INSTALACION,
                            mode="edit",
                            columns="2",
                        ),

                        order_form(
                            title="INFORMACION DE GESTION",
                            data=OrderDetailState.orden,
                            fields=inject_options(FIELDS_ORDER_ESTADO, OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        order_notas_section(),

                        rx.hstack(
                            rx.button(
                                rx.cond(
                                    OrderDetailState.is_saving,
                                    rx.hstack(
                                        rx.spinner(size="1"),
                                        rx.text("Guardando..."),
                                        spacing="2",
                                        align="center",
                                    ),
                                    rx.text("Guardar Cambios"),
                                ),
                                on_click=OrderDetailState.save_entity,
                                disabled=OrderDetailState.is_saving,
                                color_scheme="green",
                            ),
                            rx.cond(
                                OrderDetailState.error,
                                rx.text(
                                    OrderDetailState.error,
                                    color="red",
                                    size="2",
                                ),
                            ),
                            width="100%",
                            justify="end",
                            padding_top="4",
                            align="center",
                            spacing="4",
                        ),

                        spacing="6",
                        width="100%",
                        align_items="center",
                    ),
                    rx.center(rx.text("No se encontraron datos de la orden"), padding="20"),
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
    route="/order/detail",
    title="Detalle de Ordenes",
    on_load=[
        AuthState.verify_token,
        OrderDetailState.redirect_if_empty,
        OrderDropdownState.load_all_order_dropdowns,
    ]
)
def order_view() -> rx.Component:
    return template(order_detail_content())
