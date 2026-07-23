import reflex as rx

def render_filter_card(state, filter_info: dict):
    key = filter_info["key"].to(str)
    label = rx.cond(
        filter_info["key"].to(str) == "search",
        "Buscar",
        filter_info["label"].to(str),
    )
    field_type = filter_info["type"].to(str).lower().strip()
    placeholder = filter_info["placeholder"].to(str)
    current_value = filter_info["value"].to(str)
    options = filter_info["options"].to(list)

    display_value_boolean = rx.cond(
        (current_value == "True") | (current_value == "true") | (current_value == "Si") | (current_value == "Ok"),
        "Si",
        rx.cond(
            (current_value == "False") | (current_value == "false") | (current_value == "No"),
            "No",
            ""
        )
    )

    select_list = rx.select(
        options,
        placeholder="Seleccione...",
        value=current_value,
        on_change=lambda v: state.set_filter_value(key, v, True),
        size="2",
        width="100%",
    )

    select_boolean = rx.select(
        ["Si", "No"],
        placeholder="Seleccione...",
        value=display_value_boolean,
        on_change=lambda v: state.set_filter_value(key, v, True),
        size="2",
        width="100%",
    )

    input_date = rx.input(
        type="date",
        value=current_value,
        on_change=lambda v: state.set_filter_value(key, v, True),
        size="2",
        width="100%",
    )

    input_number = rx.input(
        type="number",
        placeholder=placeholder,
        value=current_value,
        on_change=lambda v: state.set_filter_value(key, v, False),
        on_blur=lambda e: state.trigger_search(),
        on_key_down=state.handle_key_down,
        size="2",
        width="100%",
    )

    input_search = rx.input(
        type="search",
        placeholder=placeholder,
        value=current_value,
        on_change=lambda v: state.set_filter_value(key, v, False),
        on_blur=lambda e: state.trigger_search(),
        on_key_down=state.handle_key_down,
        size="2",
        width="100%",
    )

    input_default = rx.input(
        placeholder=placeholder,
        value=current_value,
        on_change=lambda v: state.set_filter_value(key, v, False),
        on_blur=lambda e: state.trigger_search(),
        on_key_down=state.handle_key_down,
        size="2",
        width="100%",
    )

    filter_input = rx.cond(
        field_type == "list",
        select_list,
        rx.cond(
            field_type == "boolean",
            select_boolean,
            rx.cond(
                field_type == "date",
                input_date,
                rx.cond(
                    field_type == "number",
                    input_number,
                    rx.cond(
                        field_type == "search",
                        input_search,
                        input_default,
                    ),
                ),
            ),
        ),
    )

    standard_card = rx.card(
        rx.vstack(
            rx.hstack(
                rx.text(label, size="2", weight="bold"),
                rx.spacer(),
                rx.icon(
                    "x",
                    size=18,
                    color="tomato",
                    cursor="pointer",
                    on_click=lambda: state.remove_filter(key),
                ),
                width="100%",
                align="center",
            ),
            filter_input,
            spacing="2",
            width="100%",
        ),
        size="2",
        width=["100%", "280px"],
    )

    # Barra de búsqueda prominente: full-width, ícono decorativo a la izquierda
    # y type="text" para quitar la "X" nativa del navegador. La lógica de
    # disparo (on_blur / Enter) es la misma del input de búsqueda estándar.
    search_card = rx.card(
        rx.hstack(
            rx.icon("search", size=20, color=rx.color("blue", 9)),
            rx.input(
                type="text",
                placeholder=placeholder,
                value=current_value,
                on_change=lambda v: state.set_filter_value(key, v, False),
                on_blur=lambda e: state.trigger_search(),
                on_key_down=state.handle_key_down,
                size="3",
                width="100%",
            ),
            rx.icon(
                "x",
                size=18,
                color="tomato",
                cursor="pointer",
                on_click=lambda: state.remove_filter(key),
            ),
            width="100%",
            align="center",
            spacing="3",
        ),
        size="2",
        width="100%",
    )

    # La búsqueda principal (key == "search") ahora vive SIEMPRE visible en
    # static_search_bar, por lo que no debe renderizarse por este camino (evita
    # duplicados si quedara en active_filter_keys por código viejo). Las búsquedas
    # avanzadas (type "search" con otra key, ej. "rut"/"id") sí se siguen mostrando.
    return rx.cond(
        key == "search",
        rx.fragment(),
        rx.cond(field_type == "search", search_card, standard_card),
    )


def static_search_bar(state, config_dict: dict):
    """Barra de búsqueda SIEMPRE visible (estilo Django admin).

    Busca la key "search" (type "search") en la config. Si no existe
    (caso Servicios), no renderiza nada. La barra lee/escribe directamente
    sobre state.filter_values sin pasar por active_filter_keys.
    """
    search_key = (
        "search"
        if str(config_dict.get("search", {}).get("type", "")).lower().strip() == "search"
        else None
    )
    if not search_key:
        return rx.fragment()

    placeholder = config_dict[search_key].get("placeholder", "")

    return rx.card(
        rx.hstack(
            rx.icon("search", size=20, color=rx.color("blue", 9)),
            rx.input(
                type="text",
                placeholder=placeholder,
                value=state.filter_values.get(search_key, ""),
                on_change=lambda v: state.set_filter_value(search_key, v, False),
                on_blur=lambda e: state.trigger_search(),
                on_key_down=state.handle_key_down,
                size="3",
                width="100%",
            ),
            width="100%",
            align="center",
            spacing="3",
        ),
        size="2",
        width="100%",
    )


def filter_menu_generic(state, config_dict: dict):
    list_filters = []
    boolean_filters = []
    date_filters = []
    number_filters = []
    search_filters = []

    for key, conf in config_dict.items():
        t = str(conf.get("type", "text")).lower().strip()
        item = (key, conf)

        if t == "list":         list_filters.append(item)
        elif t == "boolean":    boolean_filters.append(item)
        elif t == "date":       date_filters.append(item)
        elif t == "number":     number_filters.append(item)
        else:                   search_filters.append(item)

    # La búsqueda principal (key == "search") ya no se activa desde el menú:
    # vive SIEMPRE visible en static_search_bar. Por eso se excluye del menú
    # "Búsqueda" cualquier filtro de type "search". La avanzada (resto + number)
    # se mantiene en su propio menú.
    basic_search = [
        item for item in search_filters
        if item[0] == "search"
        and str(item[1].get("type", "")).lower().strip() != "search"
    ]
    advanced_search = [item for item in search_filters if item[0] != "search"] + number_filters

    def make_menu_items(items_list):
        return [
            rx.menu.item(
                conf.get("label", key),
                on_click=state.add_filter(key),
                disabled=state.active_filter_keys.contains(key),
            )
            for key, conf in items_list
        ]

    def menu_button(icon_name, text):
        return rx.button(
            rx.icon(icon_name, size=18),
            text,
            variant="solid",
            color_scheme="blue",
            size="2",
            cursor="pointer",
        )

    return rx.hstack(
        rx.cond(
            len(list_filters) + len(boolean_filters) > 0,
            rx.menu.root(
                rx.menu.trigger(
                    menu_button("filter", "Categorías")
                ),
                rx.menu.content(
                    *make_menu_items(list_filters),
                    rx.cond(
                        len(boolean_filters) > 0,
                        rx.fragment(
                            rx.separator(),
                            *make_menu_items(boolean_filters),
                        )
                    ),
                    max_height="300px",
                    overflow="auto",
                ),
            ),
        ),

        rx.cond(
            len(date_filters) > 0,
            rx.menu.root(
                rx.menu.trigger(
                    menu_button("calendar", "Fechas")
                ),
                rx.menu.content(
                    *make_menu_items(date_filters)
                ),
            ),
        ),

        rx.cond(
            len(basic_search) > 0,
            rx.menu.root(
                rx.menu.trigger(
                    menu_button("search", "Búsqueda")
                ),
                rx.menu.content(
                    *make_menu_items(basic_search)
                ),
            ),
        ),

        rx.cond(
            len(advanced_search) > 0,
            rx.menu.root(
                rx.menu.trigger(
                    menu_button("search-code", "Búsqueda Avanzada")
                ),
                rx.menu.content(
                    *make_menu_items(advanced_search)
                ),
            ),
            rx.fragment(),
        ),

        rx.cond(
            state.active_filter_keys.length() > 0,
            rx.button(
                rx.icon("trash-2", size=18),
                "Limpiar filtros",
                variant="soft",
                color_scheme="crimson",
                on_click=state.clear_all_filters,
                size="2",
                cursor="pointer",
            ),
        ),
        direction={"initial": "column", "sm": "row"},
        spacing="3",
        wrap="wrap",
        align="center",
    )