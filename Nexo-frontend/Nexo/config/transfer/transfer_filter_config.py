from ..utils.bancos import BANCOS

TRANSFER_FILTER_CONFIG = {
    "search": {
        "label": "Buscar por Nombre",
        "type": "search",
        "placeholder": "Nombre o apellido...",
    },
    ### Fechas (Calendar)
    "fecha_after": {"label": "Fecha (Desde)", "type": "date", "group": "Fechas"},
    "fecha_before": {"label": "Fecha (Hasta)", "type": "date", "group": "Fechas"},

    ### Listas (Dropdowns)
    "estado": {
        "label": "Estado",
        "type": "boolean",
        "options": ["Ok"] 
    },
    "estado__not": {
        "label": "Estado NO es",
        "type": "boolean",
        "options": ["Ok"]
    },
    "cliente_existe": {
        "label": "Cliente Existe",
        "type": "boolean",
        "options": ["Si", "No"]
    },
    "documento_pagado": {
        "label": "Documento Pagado",
        "type": "boolean",
        "options": ["Si", "No"]
    },
    "cliente_zona": {
        "label": "Zona",
        "type": "list",
        "options_source": "zona"
    },
    "banco_origen": {
        "label": "Banco Origen",
        "type": "list",
        "options": BANCOS
    },
    "cliente_sector": {
        "label": "Sector",
        "type": "list",
        "options_source": "sector"
    },
    ################## INPUTS
    "cliente_rut": {
        "label": "Buscar por RUT Cliente",
        "type": "search",
        "placeholder": "Ej: 16.204.579-2"
    },
    "id": {
        "label": "Buscar por ID Transferencia",
        "type": "search",
        "placeholder": "Ej: 12345"
    },
}