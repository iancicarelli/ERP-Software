import reflex as rx

def loading_screen() -> rx.Component:

    return rx.center(
        rx.vstack(
            rx.image(
                src="/loading.png",  
                width="180px",
                height="auto",
                style={
                    "animation": "bounce 2s infinite",
                },
            ),

            rx.heading(
                "Conectando al servidor...", 
                size="6", 
                color_scheme="blue",
                weight="bold",
                text_align="center",
            ),

            rx.text(
                "Ajustando los últimos cables ⚡", 
                size="3", 
                color=rx.color("blue", 12),
                text_align="center",
            ),

            rx.spinner(
                color_scheme="blue", 
                size="3", 
                margin_top="4"
            ),

            spacing="4",
            align_items="center",
            justify_content="center",
        ),

        height="100vh",
        width="100vw",
        background_color=rx.color("blue", 2),
        position="fixed",
        top="0",
        left="0",
        z_index="9999",   
    )