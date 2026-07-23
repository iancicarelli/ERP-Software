PAYMENT_FILTER_CONFIG = {
    "search": {
        "label": "Buscar por Nombre",
        "type": "search",
        "placeholder": "Nombre o apellido...",
    },
    ### Fechas
    "entryDate_after": {"label": "Fecha Ingreso (Desde)", "type": "date", "group": "Fechas"},
    "entryDate_before": {"label": "Fecha Ingreso (Hasta)", "type": "date", "group": "Fechas"},
    
    ### Cliente / Ubicación
    "cliente_sector": {
        "label": "Sector Cliente",
        "type": "list",
        "options_source": "sector",
    },
    "cliente_zona": {
        "label": "Zona Cliente",
        "type": "list",
        "options_source": "zona",
    },
    
    ### Detalles del Pago
    "fiscalYear": {
        "label": "Año Fiscal", 
        "type": "list",
        "options": ["2023","2024", "2025", "2026", "2027","2028"], 
    },

    ### solo hay ingreso?
    "voucherType": {
        "label": "Tipo Voucher",
        "type": "list",
        "options": ["INGRESO", "EGRESO", "TRASPASO"],
    },

    "documentType": {
        "label": "Tipo Documento",
        "type": "list",
        "options": ["BOLETAELEC", "BOLETAELECRS", "BOLETA", "FCA","FVAELEC"],
    },
    
    ### Otros
    "cliente_existe": {"label": "Cliente Existe", "type": "boolean", "options": ["Si", "No"]},
    "entryUser": {"label": "Usuario Ingreso", "type": "list","options": ["ADMIN", "adminyfinanz", "CAJAVECINA", "canteras","consultoria","CSOSA","CVECINA",
                                                                         "DESARROLLO COMERCIAL","DjangoSimulator","EJECUTIVA COMERCIAL","EJECUTIVO COMERCIAL",
                                                                         "IOLIVOS","LACOBOQ","MPARRA","QUILLECO","scholomit","SOPORTEGN","SUPERVISOR OPERATIVO",
                                                                         "tucahuep","USUARIOAPI"],}, 

    ############# INPUTS
    "cliente_rut": {
        "label": "Buscar por RUT Cliente",
        "type": "search",
        "placeholder": "Ej: 16.204.579-2"
    },
    "id": {
        "label": "Buscar por ID Pago",
        "type": "search",
        "placeholder": "Ej: 12345"
    },
}