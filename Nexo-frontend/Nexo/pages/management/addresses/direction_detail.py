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


def direction_detail_content() -> rx.Component:
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
            rx.heading("Ficha de Dirección", size="6", margin_bottom="4"),

            rx.cond(
                DirectionDetailState.loading,
                rx.center(rx.spinner(), padding="20"),

                rx.cond(
                    DirectionDetailState.direccion,

                    rx.vstack(
                        # Info del cliente (solo lectura)
                        direction_form(
                            title="CLIENTE ASOCIADO",
                            data=DirectionDetailState.direccion,
                            fields=FIELDS_CLIENTE,
                            mode="view",
                            columns="2",
                        ),

                        # Datos editables de la dirección
                        direction_form(
                            title="INFORMACIÓN DE LA DIRECCIÓN",
                            data=DirectionDetailState.direccion,
                            fields=FIELDS_DIRECCION,
                            mode="edit",
                            columns="2",
                        ),

                        # Dropdown sector (FK)
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
                                confirm_text="¿Seguro que desea guardar los cambios en esta dirección?",
                                on_confirm=DirectionDetailState.save_entity,
                                loading=DirectionDetailState.is_saving,
                                disabled=DirectionDetailState.loading,
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
                        rx.text("No se encontraron datos de la dirección"),
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
    route="/direction/detail",
    title="Detalle de la dirección",
    on_load=AuthState.verify_token,
)
def direction_view() -> rx.Component:
    return template(direction_detail_content())