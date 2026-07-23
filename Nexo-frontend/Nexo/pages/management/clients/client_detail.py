import reflex as rx
from ....template import template
from ....components.forms.client_form import detail_form
from ....components.navigation.back_button import back_button
from ....components.buttons.add_button import add_button
from ....components.tables.direction import directions_table
from ....states.clients.client_detail_state import ClientDetailState
from ....dtos.clients.client_detail_dto import ClientDetailDTO
from ....utils.generic_form_utils import generate_auto_fields, inject_options
from ....components.tables.client_table_service import client_table_service
from ....components.tables.client_table_order import client_orders_table
from ....states.login.login_state import AuthState
from ....states.service.service_detail_state import ServiceDetailState
from ....states.addresses.direction_detail_state import DirectionDetailState
from ....states.work_orders.orders_add_state import OrdersAddState
from ....states.relations.client_dropdown_state import ClientDropdownState
from ....config.client_detail_config import (
    FIELDS_PERSONAL,
    FIELDS_ADMINISTRATIVA,
    FIELDS_INTEGRACIONES,
)

DROPDOWN_OPTIONS = {
    "causa_de_baja_str": ClientDropdownState.causas_baja_options,
    "sector": ClientDropdownState.sectores_filtrados_options,
    "zona": ClientDropdownState.zonas_options,
}

def client_detail_content() -> rx.Component:

    keys_manuales = (
        [f["key"] for f in FIELDS_PERSONAL] +
        [f["key"] for f in FIELDS_ADMINISTRATIVA] +
        [f["key"] for f in FIELDS_INTEGRACIONES]
    )

    campos_extra = generate_auto_fields(
        ClientDetailDTO,
        exclude=keys_manuales + ["id", "causa_de_baja"]
    )

    return rx.box(
        rx.vstack(
            rx.hstack(
                back_button(),
                rx.spacer(),
                width="100%",
            ),

            rx.heading("Ficha de Cliente", size="6", margin_bottom="4"),

            rx.cond(
                ClientDetailState.loading,
                rx.center(rx.spinner(), padding="20"),

                rx.cond(
                    ClientDetailState.cliente,
                    rx.vstack(
                        detail_form(
                            title="INFORMACION PERSONAL",
                            data=ClientDetailState.cliente,
                            fields=FIELDS_PERSONAL,
                            mode="edit",
                            columns="2",
                        ),

                        detail_form(
                            title="INFORMACION ADMINISTRATIVA",
                            data=ClientDetailState.cliente,
                            fields=inject_options(FIELDS_ADMINISTRATIVA, DROPDOWN_OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        detail_form(
                            title="INTEGRACIONES Y ZONA",
                            data=ClientDetailState.cliente,
                            fields=inject_options(FIELDS_INTEGRACIONES, DROPDOWN_OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        rx.cond(
                            len(campos_extra) > 0,
                            detail_form(
                                title="INFORMACION ADICIONAL",
                                data=ClientDetailState.cliente,
                                fields=campos_extra,
                                mode="edit",
                                columns="2",
                            ),
                        ),

                        rx.hstack(
                            rx.button(
                                rx.cond(
                                    ClientDetailState.is_saving,
                                    rx.hstack(
                                        rx.spinner(size="1"),
                                        rx.text("Guardando..."),
                                        spacing="2",
                                        align="center",
                                    ),
                                    rx.text("Guardar Cambios"),
                                ),
                                on_click=ClientDetailState.save_entity,
                                disabled=ClientDetailState.is_saving,
                                color_scheme="green",
                            ),
                            justify="end",
                            width="100%",
                            padding_top="4",
                        ),

                        rx.divider(margin_y="4"),

                        rx.vstack(
                            rx.hstack(
                                rx.vstack(
                                    rx.heading("Direcciones Asociadas", size="4"),
                                    rx.text("Listado de direcciones registradas para este cliente.", size="2", color="gray"),
                                    spacing="1",
                                ),
                                rx.spacer(),
                                add_button(
                                    text="",
                                    on_click=[
                                        DirectionDetailState.init_direction_with_client(ClientDetailState.cliente.id.to_string()),
                                        rx.redirect("/direction/add"),
                                    ],
                                ),
                                width="100%",
                                align_items="center",
                            ),
                            directions_table(),
                            width="100%",
                            spacing="3",
                            align_items="start"
                        ),

                        rx.vstack(
                            rx.hstack(
                                rx.vstack(
                                    rx.heading("Servicios Contratados", size="4"),
                                    rx.text("Listado de servicios y elementos activos.", size="2", color="gray"),
                                    spacing="1",
                                ),
                                rx.spacer(),
                                add_button(
                                    text="",
                                    on_click=[
                                            ServiceDetailState.init_service_with_client(ClientDetailState.cliente.id.to_string()),
                                            rx.redirect("/service/add")
                                    ]
                                ),
                                width="100%",
                                align_items="center",
                            ),
                            client_table_service(),
                            width="100%",
                            spacing="3",
                            align_items="start"
                        ),

                        rx.vstack(
                            rx.hstack(
                                rx.vstack(
                                    rx.heading("Ordenes y Trabajos", size="4"),
                                    rx.text("Historial de ordenes, instalaciones y modificaciones.", size="2", color="gray"),
                                    spacing="1",
                                ),
                                rx.spacer(),
                                add_button(
                                    text="",
                                    on_click=[
                                        OrdersAddState.init_new_order_with_client,
                                        rx.redirect("/order/add"),
                                    ],
                                ),
                                width="100%",
                                align_items="center",
                            ),
                            client_orders_table(),
                            width="100%",
                            spacing="3",
                            align_items="start"
                        ),

                        rx.divider(color="red", margin_y="6"),

                        rx.vstack(
                            rx.heading("Zona de Peligro", size="4", color="red"),
                            rx.text(
                                "Acciones irreversibles sobre este cliente.",
                                size="2",
                                color="gray",
                            ),
                            rx.button(
                                "Eliminar Cliente",
                                on_click=ClientDetailState.open_delete_dialog,
                                color_scheme="red",
                                variant="solid",
                            ),
                            width="100%",
                            spacing="3",
                            align_items="start",
                        ),

                        rx.alert_dialog.root(
                            rx.alert_dialog.content(
                                rx.alert_dialog.title("Eliminar cliente?"),
                                rx.alert_dialog.description(
                                    "Esta accion es irreversible. Se eliminara el cliente y todos sus datos asociados.",
                                ),
                                rx.hstack(
                                    rx.alert_dialog.cancel(
                                        rx.button(
                                            "Cancelar",
                                            variant="soft",
                                            color_scheme="gray",
                                        ),
                                    ),
                                    rx.alert_dialog.action(
                                        rx.button(
                                            "Eliminar",
                                            on_click=ClientDetailState.delete_entity,
                                            color_scheme="red",
                                        ),
                                    ),
                                    spacing="3",
                                    justify="end",
                                    width="100%",
                                    margin_top="4",
                                ),
                            ),
                            open=ClientDetailState.show_delete_dialog,
                            on_open_change=ClientDetailState.close_delete_dialog,
                        ),

                        spacing="6",
                        width="100%",
                        align_items="center",
                    ),
                    rx.center(rx.text("No hay datos del cliente"), padding="20"),
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
    route="/client/detail",
    title="Detalle del cliente",
    on_load=[
        AuthState.verify_token,
        ClientDetailState.redirect_if_empty,
        ClientDropdownState.load_all_client_dropdowns,
    ]
)
def client_view() -> rx.Component:
    return template(client_detail_content())
