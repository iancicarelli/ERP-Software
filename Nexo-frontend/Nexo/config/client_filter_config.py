from .utils.causas_baja_config import CAUSAS_BAJA
from .utils.elementos_elementos_config import ELEMENTOS
CLIENT_FILTER_CONFIG = {
    "search": {
        "label": "Buscar por Nombre",
        "type": "search",
        "placeholder": "Nombre o apellido...",
    },
    ###Fechas
    "fecha_creacion_after": {"label": "Creado (Desde)", "type": "date", "group": "Fechas"},
    "fecha_creacion_before": {"label": "Creado (Hasta)", "type": "date", "group": "Fechas"},
    "moroso_desde_after": {"label": "Moroso (Desde)", "type": "date", "group": "Fechas"},
    "moroso_desde_before": {"label": "Moroso (Hasta)", "type": "date", "group": "Fechas"},
    "fecha_de_baja_after": {"label": "Dado de baja (Desde)", "type": "date", "group": "Fechas"},
    "fecha_de_baja_before": {"label": "Dado de baja (Hasta)", "type": "date", "group": "Fechas"},
    ###ubicacion
    "sector": {
        "label": "Sector",
        "type": "list",
        "options_source": "sector",
    },
    "zona": {
        "label": "Zona",
        "type": "list",
        "options_source": "zona",
    },
    "zona_exclude": {
        "label": "Excluir Zona",
        "type": "list",
        "options_source": "zona",
    },
    "activo": {"label": "Cliente Activo", "type": "boolean", "options": ["Si", "No"],},
    "por_instalar": {"label": "Por instalar", "type": "boolean", "options": ["Si", "No"],},
    "moroso": {"label": "Moroso", "type": "boolean", "options": ["Si", "No"],},
    "analogo": {"label": "Analogo", "type": "boolean", "options": ["Si", "No"],},
    "corte_poste": {"label": "Corte poste", "type": "boolean", "options": ["Si", "No"],},
    "baja_por_renuncia": {"label": "Baja por renuncia", "type": "boolean", "options": ["Si", "No"],},
    "baja_por_morosidad": {"label": "Baja por morosidad", "type": "boolean", "options": ["Si", "No"],},
    "causa_de_baja": {"label": "Causa de Baja", "type": "list", "options": CAUSAS_BAJA,},
    "donacion": {"label": "Donacion", "type": "boolean", "options": ["Si", "No"],},
    "servicio_elemento": {"label": "Elemento Servicio", "type": "list", "options": ELEMENTOS},                                                                  
    #####
    
    "krill": {"label": "krill", "type": "boolean", "options": ["Si", "No"],},

    "cpes_todos": {"label": "Total CPEs", "type": "list", "options": ["0", "1","2","3"],},
    "cpes_inactivos": {"label": "CPES inactivos", "type": "list", "options": ["0", "1","2"],},

    ### FIltros min Maximo
    "cantidad_direcciones_min": {"label": "Cant. Direcciones (Min)", "type": "number", "group": "Cantidades"},
    "cantidad_direcciones_max": {"label": "Cant. Direcciones (Max)", "type": "number", "group": "Cantidades"},

    # CPES Todos
    "cpes_todos_min": {"label": "CPEs Totales (Min)", "type": "number", "group": "CPEs"},
    "cpes_todos_max": {"label": "CPEs Totales (Max)", "type": "number", "group": "CPEs"},

    # Montos
    "monto_total_min": {"label": "Monto Total (Min)", "type": "number", "group": "Montos"},
    "monto_total_max": {"label": "Monto Total (Max)", "type": "number", "group": "Montos"},
    "monto_total": {"label": "Monto Total (Exacto)", "type": "number", "group": "Montos"},

    #CPES 
    "cpes_inactivos_min": {"label": "CPEs inactivos (Min)", "type": "number", "group": "CPEs inactivos"},
    "cpes_inactivos_max": {"label": "CPEs inactivos (Max)", "type": "number", "group": "CPEs inactivos"},

    ########### INPUTS
    "rut": {
        "label": "Buscar por RUT",
        "type": "search",  
        "placeholder": "08.291.711-K"
    },
    "id": {
        "label": "Buscar por ID",
        "type": "search",
        "placeholder": "6329"
    },
}
