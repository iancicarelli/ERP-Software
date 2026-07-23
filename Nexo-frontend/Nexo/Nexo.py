from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

import reflex as rx
from .pages.index import index
from .pages.management.management import management
from .pages.management.clients.client import client
from .pages.management.clients.client_detail import client_view
from .pages.management.clients.client_add import client_add_view
from .pages.management.services.service import services
from .pages.management.payments.payment import payment
from .pages.management.transfers.transfer import transfers
from .pages.work_orders.orders import orders
from .pages.management.services.service_detail import service_view
from .pages.management.services.service_detail_add import service_add_view
from .pages.work_orders.orders_detail import order_view
from .pages.work_orders.orders_add import order_add_view
from .pages.login import login
from .pages.management.erros.error_page import not_found
from .pages.metrics.metrics_menu import metrics_menu
from .pages.metrics.tickets.ticket import mensual_ticket
from .pages.management.addresses.direction_add import direction_add_view
from .pages.management.addresses.direction_detail import direction_view




app = rx.App(
    theme=rx.theme(
        has_background=True,
        accent_color="green",
        gray_color="slate",
        radius="large",
    ),

)

app.add_page(direction_view)
app.add_page(direction_add_view)
app.add_page(index)
app.add_page(management)
app.add_page(client)
app.add_page(client_view)
app.add_page(client_add_view)
app.add_page(services)
app.add_page(service_view)
app.add_page(service_add_view)
app.add_page(payment)
app.add_page(transfers)
app.add_page(orders)
app.add_page(order_view)
app.add_page(order_add_view)
app.add_page(metrics_menu)
app.add_page(mensual_ticket)
app.add_page(login)
app.add_page(not_found)