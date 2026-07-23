from ..utils.elementos_elementos_config import ELEMENTOS
FIELDS_SERVICIO = [
    {
        "key": "id",
        "label": "ID Servicio",
        "type": "text",
        "readonly": True,
        "display": "text",
    },
    {"key": "activo", "label": "Servicio Activo", "type": "boolean"},
    {"key": "cantidad", "label": "Cantidad", "type": "number"},
    {"key": "personalizado", "label": "Personalizado", "type": "boolean"},
    {"key": "monto", "label": "Monto", "type": "number"},

]

FIELDS_CLIENTE = [


    {
        "key": "cliente_str",
        "label": "Nombre del cliente",
        "type": "text",
        "readonly": True,
    },
    {
        "key": "cliente_rut",
        "label": "Rut del cliente",
        "type": "text",
        "readonly": True,
    },
    {
        "key": "direccion_str",
        "label": "Direccion",
        "type": "text",
        "readonly": True,
    },
]

