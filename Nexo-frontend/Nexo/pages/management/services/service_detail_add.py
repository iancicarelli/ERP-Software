import reflex as rx
from ....template import template
from ....components.forms.service_form import service_form
from ....components.navigation.back_button import back_button
from ....components.buttons.confirm_action_button import confirm_action_button
from ....states.service.service_detail_state import ServiceDetailState
from ....dtos.service.service_detail_dto import ServiceDetailDTO
from ....utils.generic_form_utils import generate_auto_fields
from ....states.login.login_state import AuthState
from ....config.service.service_detail_config import (
    FIELDS_SERVICIO,
    FIELDS_CLIENTE,
)
from ....components.relations.dropdown import generic_dropdown
from ....states.relations.dropdown_state import DropdownState


def service_add_content() -> rx.Component:
    keys_ya_usadas = [f["key"] for f in FIELDS_SERVICIO] + [f["key"] for f in FIELDS_CLIENTE]

    campos_extra = generate_auto_fields(
        ServiceDetailDTO, 
        exclude=keys_ya_usadas + [
            "id", 
            "elemento", 
            "elemento_elemento", 
            "direccion", 
            "direccion_str",
            "cliente",
        ] 
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
                "Nuevo Servicio",
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
                            title="CLIENTE ASOCIADO",
                            data=ServiceDetailState.servicio,
                            fields=FIELDS_CLIENTE,
                            mode="view",
                            columns="2",
                        ),

                        service_form(
                            title="INFORMACIÓN DEL SERVICIO",
                            data=ServiceDetailState.servicio,
                            fields=FIELDS_SERVICIO,
                            mode="edit", 
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
                                mode="edit", 
                                columns="2",
                            ),
                        ),

                        rx.box(
                            confirm_action_button(
                                text="Crear Servicio",
                                icon="save",
                                color_scheme="green",
                                confirm_title="Confirmar creación",
                                confirm_text="¿Está seguro que desea crear este nuevo servicio?",
                                on_confirm=ServiceDetailState.add_entity,
                                loading=ServiceDetailState.is_saving,
                                disabled=ServiceDetailState.is_saving,
                            ),
                            width="100%",
                            display="flex",
                            justify_content="center",
                            margin_top="6",
                        ),

                        rx.cond(
                            ServiceDetailState.error,
                            rx.callout(
                                ServiceDetailState.error,
                                icon="triangle-alert",
                                color_scheme="red",
                                role="alert",
                                width="100%"
                            ),
                        ),

                        spacing="6",
                        width="100%",
                        align_items="center",
                    ),

                    rx.center(
                        rx.vstack(
                            rx.icon("triangle-alert", color=rx.color("red", 9), size=32),
                            rx.text(
                                "No se pudo inicializar el formulario.",
                                weight="bold",
                            ),
                            rx.text(
                                "Vuelve al cliente e intenta nuevamente.",
                                size="2",
                                color="gray",
                            ),
                            back_button(),
                            spacing="3",
                            align_items="center",
                        ),
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
    route="/service/add",
    title="Agregar Nuevo Servicio",
    on_load=[
        AuthState.verify_token,
        ServiceDetailState.check_or_init_service,
    ],
)
def service_add_view() -> rx.Component:
    return template(service_add_content())