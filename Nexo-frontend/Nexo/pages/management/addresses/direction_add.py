import reflex as rx
from ....template import template
from ....components.forms.direction_form import direction_form
from ....components.navigation.back_button import back_button
from ....components.buttons.confirm_action_button import confirm_action_button
from ....components.relations.dropdown import generic_dropdown
from ....states.relations.dropdown_state import DropdownState
from ....states.addresses.direction_detail_state import DirectionDetailState
from ....states.login.login_state import AuthState
from ....dtos.addresses.direction_detail_dto import DirectionDetailDTO
from ....utils.generic_form_utils import generate_auto_fields
from ....config.addresses.direction_detail_config import (
    FIELDS_DIRECCION,
    FIELDS_CLIENTE,
)


def direction_add_content() -> rx.Component:
    keys_ya_usadas = [f["key"] for f in FIELDS_DIRECCION] + [
        f["key"] for f in FIELDS_CLIENTE
    ]

    campos_extra = generate_auto_fields(
        DirectionDetailDTO,
        exclude=keys_ya_usadas + [
            "id",
            "sector",
            "sector_str",
            "sector_zona",
            "cliente",
            "contrato",
            "sucursal",
            "monto",
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
            rx.heading("Nueva Dirección", size="6", margin_bottom="4"),

            rx.cond(
                DirectionDetailState.loading,
                rx.center(rx.spinner(), padding="20"),

                rx.cond(
                    DirectionDetailState.direccion,

                    rx.vstack(
                        # Cliente (solo lectura, siempre viene pre-cargado)
                        direction_form(
                            title="CLIENTE ASOCIADO",
                            data=DirectionDetailState.direccion,
                            fields=FIELDS_CLIENTE,
                            mode="view",
                            columns="2",
                        ),

                        # Datos de la dirección
                        direction_form(
                            title="INFORMACIÓN DE LA DIRECCIÓN",
                            data=DirectionDetailState.direccion,
                            fields=FIELDS_DIRECCION,
                            mode="edit",
                            columns="2",
                        ),

                        # Sector FK
                        rx.card(
                            rx.vstack(
                                rx.box(
                                    rx.heading(
                                        "SECTOR",
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
                                generic_dropdown(
                                    label="Sector de instalación",
                                    value=DirectionDetailState.direccion.sector.to_string(),
                                    options=DropdownState.sectores_options,
                                    on_change=DirectionDetailState.set_sector,
                                    placeholder="Seleccione un sector...",
                                    loading=DropdownState.loading_sectores,
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
                            direction_form(
                                title="INFORMACIÓN ADICIONAL",
                                data=DirectionDetailState.direccion,
                                fields=campos_extra,
                                mode="edit",
                                columns="2",
                            ),
                        ),

                        rx.box(
                            confirm_action_button(
                                text="Crear Dirección",
                                icon="save",
                                color_scheme="green",
                                confirm_title="Confirmar creación",
                                confirm_text="¿Está seguro que desea crear esta nueva dirección?",
                                on_confirm=DirectionDetailState.add_entity,
                                loading=DirectionDetailState.is_saving,
                                disabled=DirectionDetailState.is_saving,
                            ),
                            width="100%",
                            display="flex",
                            justify_content="center",
                            margin_top="6",
                        ),

                        rx.cond(
                            DirectionDetailState.error,
                            rx.callout(
                                DirectionDetailState.error,
                                icon="triangle-alert",
                                color_scheme="red",
                                role="alert",
                                width="100%",
                            ),
                        ),

                        spacing="6",
                        width="100%",
                        align_items="center",
                    ),

                    # Sin cliente — no debería llegar aquí normalmente
                    rx.center(
                        rx.vstack(
                            rx.icon("triangle-alert", color=rx.color("red", 9), size=32),
                            rx.text("No se pudo inicializar el formulario.", weight="bold"),
                            rx.text("Vuelve al cliente e intenta nuevamente.", size="2", color="gray"),
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
    route="/direction/add",
    title="Agregar Nueva Dirección",
    on_load=[
        AuthState.verify_token,
        DirectionDetailState.check_or_init_direction,
    ],
)
def direction_add_view() -> rx.Component:
    return template(direction_add_content())