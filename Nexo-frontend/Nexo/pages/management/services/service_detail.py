import reflex as rx
from ....template import template
from ....components.forms.service_form import service_form
from ....components.navigation.back_button import back_button
from ....components.buttons.confirm_action_button import confirm_action_button
from ....components.relations.dropdown import generic_dropdown
from ....states.relations.dropdown_state import DropdownState
from ....states.service.service_detail_state import ServiceDetailState
from ....states.login.login_state import AuthState
from ....dtos.service.service_detail_dto import ServiceDetailDTO
from ....utils.generic_form_utils import generate_auto_fields

from ....config.service.service_detail_config import (
    FIELDS_SERVICIO,
    FIELDS_CLIENTE,
)

def service_detail_content() -> rx.Component:

    keys_ya_usadas = [f["key"] for f in FIELDS_SERVICIO] + [
        f["key"] for f in FIELDS_CLIENTE
    ]

    campos_extra = generate_auto_fields(
        ServiceDetailDTO,
        exclude=keys_ya_usadas + [
            "id",
            "elemento",
            "elemento_elemento",
            "direccion",
            "direccion_str",
            "cliente",
        ],
    )

    return rx.box(
        rx.vstack(

            rx.hstack(
                back_button(),
                rx.spacer(),
                width="100%",
                align_items="center",
            ),

            rx.heading(
                "Ficha de Servicio",
                size="6",
                margin_bottom="4",
            ),

            rx.cond(
                ServiceDetailState.loading,

                rx.center(
                    rx.spinner(),
                    padding="20",
                ),

                rx.cond(
                    ServiceDetailState.servicio,

                    rx.vstack(

                        service_form(
                            title="INFORMACIÓN DEL SERVICIO",
                            data=ServiceDetailState.servicio,
                            fields=FIELDS_SERVICIO,
                            mode="edit",
                            columns="2",
                        ),

                        service_form(
                            title="CLIENTE ASOCIADO",
                            data=ServiceDetailState.servicio,
                            fields=FIELDS_CLIENTE,
                            mode="view",
                            columns="2",
                        ),

                        rx.card(
                            rx.vstack(
                                rx.box(
                                    rx.heading(
                                        "ASIGNACIÓN",
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
                                    generic_dropdown(
                                        label="Elemento Asociado",
                                        value=ServiceDetailState.servicio.elemento.to_string(),
                                        options=DropdownState.elementos_options,
                                        on_change=ServiceDetailState.set_elemento,
                                        placeholder="Seleccione un elemento...",
                                        loading=DropdownState.loading_elementos,
                                    ),
                                    generic_dropdown(
                                        label="Dirección de Instalación",
                                        value=ServiceDetailState.servicio.direccion.to_string(),
                                        options=DropdownState.direcciones_options,
                                        on_change=ServiceDetailState.set_direccion,
                                        placeholder="Seleccione una dirección...",
                                        loading=DropdownState.loading_direcciones,
                                        # Deshabilitar si no hay cliente seleccionado
                                        disabled=ServiceDetailState.servicio.cliente == 0,
                                    ),
                                    columns="2",
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
                        ),

                        rx.cond(
                            len(campos_extra) > 0,
                            service_form(
                                title="INFORMACIÓN ADICIONAL",
                                data=ServiceDetailState.servicio,
                                fields=campos_extra,
                                mode="view",
                                columns="2",
                            ),
                        ),

                        rx.box(
                            confirm_action_button(
                                text="Guardar Cambios",
                                icon="check",
                                color_scheme="violet",
                                confirm_title="Confirmar cambios",
                                confirm_text="¿Seguro que desea guardar los cambios en este servicio?",
                                on_confirm=ServiceDetailState.save_entity,
                                loading=ServiceDetailState.is_saving,
                                disabled=ServiceDetailState.loading,
                            ),
                            width="100%",
                            display="flex",
                            justify_content="center",
                            margin_top="6",
                        ),

                        spacing="6",
                        width="100%",
                        align_items="center",
                    ),

                    rx.center(
                        rx.text("No se encontraron datos del servicio"),
                        padding="20",
                    ),
                ),
            ),
            width="100%",
            max_width="1000px",
            margin_x="auto",
            spacing="6",
        ),
        padding="5",
        min_height="100vh",
    )


@rx.page(
    route="/service/detail",
    title="Detalle del servicio",
    on_load=AuthState.verify_token,
)
def service_view() -> rx.Component:
    return template(service_detail_content())