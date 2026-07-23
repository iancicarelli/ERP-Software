import reflex as rx

def not_found_card() -> rx.Component:
    return rx.card(
        rx.vstack(
            rx.center(
                rx.icon("circle-alert", size=48, color="tomato"), 
                rx.heading(
                    "Error 404",
                    size="6",
                    as_="h2",
                    text_align="center",
                    width="100%",
                ),
                direction="column",
                spacing="4",
                width="100%",
            ),
            
            rx.link(
                rx.button(
                    rx.icon("house"), 
                    "Volver al Inicio", 
                    size="3", 
                    width="100%", 
                    variant="solid"
                ),
                href="/",
                width="100%",
            ),
            spacing="6",
            width="100%",
        ),
        max_width="28em",
        size="4",
        width="100%",
        border_width="1.5px",       
        border_color="gray.300",
    )


@rx.page(
    route="/404", 
    title="Página no encontrada",
)
def not_found() -> rx.Component:
    return rx.center(
        rx.vstack(

            rx.image(
                src="/error.png",
                width="45em",  
                height="auto",
                border_radius="10px", 
                alt="404 Page Not Found",
            ),

            not_found_card(),
            
            align="center",
            spacing="8", 
        ),
        height="100vh",  
        width="100%",    
        bg="gray.50",
        padding="2em", 
    )