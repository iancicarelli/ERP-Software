import reflex as rx
from ...states.service.service_table_state import ServiceTableState
from ...config.service.service_filter_config import SERVICE_FILTER_CONFIG
from .generic_filter_ui import render_filter_card, filter_menu_generic

def service_filter_input():
    return rx.flex(
        rx.foreach(
            ServiceTableState.service_filters_list,
            lambda filter_item: render_filter_card(
                state=ServiceTableState,
                filter_info=filter_item,
            )
        ),
        wrap="wrap",
        spacing="4",
        width="100%",
    )


def service_filter_menu():
    return filter_menu_generic(
        state=ServiceTableState,
        config_dict=SERVICE_FILTER_CONFIG,
    )
