import reflex as rx
from ...states.work_orders.orders_table_state import OrderTableState
from ...config.order.order_filter_config import ORDER_FILTER_CONFIG
from .generic_filter_ui import render_filter_card, filter_menu_generic, static_search_bar


def order_search_bar():
    return static_search_bar(
        state=OrderTableState,
        config_dict=ORDER_FILTER_CONFIG,
    )


def order_filter_input_list():
    return rx.flex(
        rx.foreach(
            OrderTableState.order_filters_list,
            lambda filter_item: render_filter_card(
                state=OrderTableState,
                filter_info=filter_item,
            )
        ),
        spacing="4",
        width="100%",
        wrap="wrap",
    )


def order_filter_menu():
    return filter_menu_generic(
        state=OrderTableState,
        config_dict=ORDER_FILTER_CONFIG,
    )
