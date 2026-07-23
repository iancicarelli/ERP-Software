from ..utils.elementos_elementos_config import ELEMENTOS
SERVICE_FILTER_CONFIG = {
    "activo": {
        "label": "Activo",
        "type": "boolean", 
        "options": ["Si", "No"]
    },

    "elemento_elemento": {
        "label": "Elemento Servicio", 
        "type": "list",
        "options": ELEMENTOS,
    },
    ############ INPUTS
    "cliente_rut": {
        "label": "Buscar por RUT",
        "type": "search",
        "placeholder": "Ej: 99.597.800-8"
    },
    "cliente_nombre1": {
        "label": "Primer Nombre",
        "type": "search",
        "placeholder": "Ej: Maria"
    },
    "cliente_apellido1": {
        "label": "Apellido Paterno",
        "type": "search",
        "placeholder": "Ej: Rain"
    },
    "cliente_apellido2": {
        "label": "Apellido Materno",
        "type": "search",
        "placeholder": "Ej: Huentelicán"
    },

}