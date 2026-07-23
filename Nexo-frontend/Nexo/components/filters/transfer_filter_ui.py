import reflex as rx
from ...states.transfers.transfer_table_state import TransferTableState
from ...config.transfer.transfer_filter_config import TRANSFER_FILTER_CONFIG
from .generic_filter_ui import render_filter_card, filter_menu_generic, static_search_bar


def transfer_search_bar():
    return static_search_bar(
        state=TransferTableState,
        config_dict=TRANSFER_FILTER_CONFIG,
    )


def transfer_filter_input_list():
    return rx.flex(
        rx.foreach(
            TransferTableState.transfer_filters_list,
            lambda filter_item: render_filter_card(
                state=TransferTableState,
                filter_info=filter_item,
            )
        ),
        spacing="4",
        wrap="wrap",
        width="100%",
    )


def transfer_filter_menu():
    return filter_menu_generic(
        state=TransferTableState,
        config_dict=TRANSFER_FILTER_CONFIG,
    )
