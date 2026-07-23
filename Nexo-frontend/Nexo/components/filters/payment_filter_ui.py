import reflex as rx
from ...states.payments.payment_table_state import PaymentTableState
from ...config.payment.payment_filter_config import PAYMENT_FILTER_CONFIG
from .generic_filter_ui import render_filter_card, filter_menu_generic, static_search_bar


def payment_search_bar():
    return static_search_bar(
        state=PaymentTableState,
        config_dict=PAYMENT_FILTER_CONFIG,
    )


def payment_filter_input():
    return rx.flex(
        rx.foreach(
            PaymentTableState.payment_filters_list,
            lambda filter_item: render_filter_card(
                state=PaymentTableState,
                filter_info=filter_item,
            )
        ),
        spacing="4",
        width="100%",
        wrap="wrap",
    )


def payment_filter_menu():
    return filter_menu_generic(
        state=PaymentTableState,
        config_dict=PAYMENT_FILTER_CONFIG,
    )
