import reflex as rx
from ....template import template
from ....components.forms.generic_form import generic_detail_form
from ....components.navigation.back_button import back_button
from ....states.clients.client_add_state import ClientAddState
from ....states.relations.client_dropdown_state import ClientDropdownState
from ....states.login.login_state import AuthState
from ....utils.generic_form_utils import inject_options, generate_auto_fields
from ....dtos.clients.client_detail_dto import ClientDetailDTO
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


def client_add_form(
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
        on_change_text=ClientAddState.update_field,
        on_change_bool=ClientAddState.toggle_bool,
        on_change_value=ClientAddState.update_value,
        mode=mode,
        columns=columns,
    )


def client_add_content() -> rx.Component:
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
            back_button(),
            rx.heading("Nuevo Cliente", size="6", margin_bottom="4"),

            rx.cond(
                ClientAddState.loading,
                rx.center(rx.spinner(), padding="20"),

                rx.cond(
                    ClientAddState.cliente,
                    rx.vstack(
                        client_add_form(
                            title="INFORMACION PERSONAL",
                            data=ClientAddState.cliente,
                            fields=FIELDS_PERSONAL,
                            mode="edit",
                            columns="2",
                        ),

                        client_add_form(
                            title="INFORMACION ADMINISTRATIVA",
                            data=ClientAddState.cliente,
                            fields=inject_options(FIELDS_ADMINISTRATIVA, DROPDOWN_OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        client_add_form(
                            title="INTEGRACIONES Y ZONA",
                            data=ClientAddState.cliente,
                            fields=inject_options(FIELDS_INTEGRACIONES, DROPDOWN_OPTIONS),
                            mode="edit",
                            columns="2",
                        ),

                        rx.cond(
                            len(campos_extra) > 0,
                            client_add_form(
                                title="INFORMACION ADICIONAL",
                                data=ClientAddState.cliente,
                                fields=campos_extra,
                                mode="edit",
                                columns="2",
                            ),
                        ),

                        rx.hstack(
                            rx.button(
                                "Cancelar",
                                on_click=rx.redirect("/client"),
                                variant="soft",
                            ),
                            rx.button(
                                rx.cond(
                                    ClientAddState.is_saving,
                                    rx.hstack(
                                        rx.spinner(size="1"),
                                        rx.text("Creando..."),
                                        spacing="2",
                                        align="center",
                                    ),
                                    rx.text("Crear Cliente"),
                                ),
                                on_click=ClientAddState.add_entity,
                                disabled=ClientAddState.is_saving,
                                color_scheme="green",
                            ),
                            spacing="4",
                            justify="end",
                            width="100%",
                            padding_top="4",
                        ),

                        rx.cond(
                            ClientAddState.error,
                            rx.callout(
                                ClientAddState.error,
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
    route="/client/add",
    title="Nuevo Cliente",
    on_load=[
        AuthState.verify_token,
        ClientAddState.init_new_client,
        ClientDropdownState.load_all_client_dropdowns,
    ],
)
def client_add_view() -> rx.Component:
    return template(client_add_content())
