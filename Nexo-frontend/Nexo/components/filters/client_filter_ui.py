import reflex as rx
from ...states.clients.client_table_state import ClientTableState
from ...config.client_filter_config import CLIENT_FILTER_CONFIG
from .generic_filter_ui import render_filter_card, filter_menu_generic, static_search_bar


def client_search_bar():
    return static_search_bar(
        state=ClientTableState,
        config_dict=CLIENT_FILTER_CONFIG,
    )


def client_filter_input():
    return rx.flex(
        rx.foreach(
            ClientTableState.client_filters_list,
            lambda filter_item: render_filter_card(
                state=ClientTableState,
                filter_info=filter_item,
            )
        ),
        spacing="4",
        width="100%",
        wrap="wrap",
    )


def client_filter_menu():
    return filter_menu_generic(
        state=ClientTableState,
        config_dict=CLIENT_FILTER_CONFIG,
    )
