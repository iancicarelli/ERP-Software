import reflex as rx
from ..template import template
from ..states.index.index_state import IndexState
from ..states.login.login_state import AuthState
from Nexo.pages.management.erros.loading_screen import loading_screen

def quick_stat(label: str, value) -> rx.Component:
    return rx.vstack(
        rx.text(
            label,
            size="2",
            color="gray",
        ),
        rx.heading(
            value,
            size="6",
        ),
        spacing="1",
        align_items="start",
    )


def module_card(
    title: str,
    icon: str,
    content: rx.Component,
    route: str,
) -> rx.Component:
    return rx.link(
        rx.card(
            rx.vstack(
                rx.hstack(
                    rx.hstack(
                        rx.icon(tag=icon, size=20),
                        rx.heading(title, size="5"),
                        spacing="2",
                        align_items="center",
                    ),
                    rx.spacer(),
                    rx.icon(tag="arrow-right", size=18, color="gray"),
                    width="100%",
                    align_items="center",
                ),

                rx.divider(),

                content,

                spacing="4",
                width="100%",
            ),
            size="3",
            width="100%",
            style={
                "transition": "all 0.2s ease",
            },
            _hover={
                "transform": "translateY(-4px)",
                "box_shadow": "0 10px 25px rgba(0,0,0,0.08)",
            },
        ),
        href=route,
        text_decoration="none",
        width="100%",
    )


def index_content() -> rx.Component:
    return rx.vstack(

        # Header principal
        rx.vstack(
            rx.heading("Dashboard", size="8"),
            rx.text(
                "Vista general rápida de cada módulo del sistema.",
                color="gray",
                size="4",
            ),
            spacing="2",
            margin_bottom="2.5em",
        ),

        rx.grid(

            # 🧑 CLIENTES
            module_card(
                "Clientes",
                "users",
                rx.vstack(
                    rx.text("Por Estado", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Activos", IndexState.total_clientes_activos),
                        quick_stat("Por instalar", IndexState.clientes_por_instalar),
                        quick_stat("Morosos", IndexState.clientes_morosos),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),

                    rx.divider(margin_y="2"),

                    rx.text("Mes Actual", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Creados", IndexState.clientes_creados_mes_actual),
                        quick_stat("Morosos", IndexState.clientes_morosos_mes_actual),
                        quick_stat("Bajas", IndexState.clientes_bajas_mes_actual),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),

                    rx.text("Mes Anterior", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Creados", IndexState.clientes_creados_mes_anterior),
                        quick_stat("Morosos", IndexState.clientes_morosos_mes_anterior),
                        quick_stat("Bajas", IndexState.clientes_bajas_mes_anterior),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),
                    spacing="3",
                    width="100%",
                ),
                "/client",
            ),

            # 📦 ÓRDENES (Actualizado)
            module_card(
                "Órdenes",
                "shopping-cart",
                rx.vstack(
                    rx.text("Por Estado", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Por instalar", IndexState.ordenes_por_instalar),
                        quick_stat("Factibilidad", IndexState.ordenes_factibilidad),
                        quick_stat("Programado", IndexState.ordenes_programado),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),
                    
                    rx.divider(margin_y="2"),

                    rx.text("Mes Actual", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Ingresos", IndexState.ingresos_mes_actual),
                        quick_stat("Programados", IndexState.programados_mes_actual),
                        quick_stat("Contratos", IndexState.contratos_mes_actual),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),

                    # Sección Mes Anterior
                    rx.text("Mes Anterior", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Ingresos", IndexState.ingresos_mes_anterior),
                        quick_stat("Programados", IndexState.programados_mes_anterior),
                        quick_stat("Contratos", IndexState.contratos_mes_anterior),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),
                    spacing="3",
                    width="100%"
                ),
                "/orders",
            ),

            # 🔧 SERVICIOS
            module_card(
                "Servicios",
                "wrench",
                rx.vstack(
                    rx.text("Por Estado y Tipo", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Activos", IndexState.servicios_activos),
                        quick_stat("Plan Duo Clasico", IndexState.servicios_plan_duo_clasico),
                        quick_stat("Plan Duo Premium", IndexState.servicios_plan_duo_premium),
                        quick_stat("Plan Duo Superior", IndexState.servicios_plan_duo_superior),
                        quick_stat("Internet Clasico", IndexState.servicios_internet_clasico),
                        quick_stat("Internet Premium", IndexState.servicios_internet_premium),
                        quick_stat("Internet Superior", IndexState.servicios_internet_superior),
                        quick_stat("TV Fibra Optica", IndexState.servicios_tv_fibra_optica),
                        quick_stat("TV Analogo", IndexState.servicios_tv_analogo),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),
                    spacing="3",
                    width="100%",
                ),
                "/service",
            ),

            # 💳 PAGOS
            module_card(
                "Pagos",
                "credit-card",
                rx.vstack(
                    rx.text("Por Periodo", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Hoy", IndexState.pagos_hoy),
                        quick_stat("Esta Semana", IndexState.pagos_semana_actual),
                        quick_stat("Este Mes", IndexState.pagos_mes_actual),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),

                    rx.divider(margin_y="2"),

                    rx.text("Por Cliente", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Clientes Existentes", IndexState.pagos_clientes_existentes),
                        quick_stat("Sin Cliente Registrado", IndexState.pagos_sin_cliente_registrado),
                        columns="2",
                        spacing="4",
                        width="100%",
                    ),
                    spacing="3",
                    width="100%",
                ),
                "/payment",
            ),

            # 🔁 TRANSFERENCIAS
            module_card(
                "Transferencias",
                "arrow-right-left",
                rx.vstack(
                    rx.text("Por Periodo", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Hoy", IndexState.transferencias_hoy),
                        quick_stat("Esta Semana", IndexState.transferencias_semana_actual),
                        quick_stat("Este Mes", IndexState.transferencias_mes_actual),
                        columns="3",
                        spacing="4",
                        width="100%",
                    ),

                    rx.divider(margin_y="2"),

                    rx.text("Por Cliente", size="2", weight="bold", color="gray"),
                    rx.grid(
                        quick_stat("Con Cliente", IndexState.transferencias_con_cliente),
                        quick_stat("Sin Cliente Registrado", IndexState.transferencias_sin_cliente_registrado),
                        columns="2",
                        spacing="4",
                        width="100%",
                    ),
                    spacing="3",
                    width="100%",
                ),
                "/transfers",
            ),

            columns={"initial": "1", "md": "2", "xl": "3"},
            spacing="6",
            width="100%",
        ),

        spacing="6",
        padding={"initial": "1.5em", "md": "3em"},
        width="100%",
    )


@rx.page(
    route="/",
    title="Inicio",
    on_load=[
        IndexState.load_stats,
        AuthState.verify_token,
    ],
)
def index() -> rx.Component:
    return rx.cond(
        AuthState.is_checking_auth,
        loading_screen(),           
        template(index_content())   
    )
