FIELDS_DIRECCION = [
    {
        "key": "id",
        "label": "ID Dirección",
        "type": "text",
        "readonly": True,
        "display": "text",
    },
    {"key": "direccion", "label": "Calle / Dirección", "type": "text"},
    {"key": "coordenadas", "label": "Coordenadas", "type": "text"},
    {"key": "activo", "label": "Activa", "type": "boolean"},
    {"key": "principal", "label": "Principal", "type": "boolean"},
]

FIELDS_CLIENTE = [
    {
        "key": "cliente_str",
        "label": "Nombre del cliente",
        "type": "text",
        "readonly": True,
        "display": "text",
    },
    {
        "key": "cliente_rut",
        "label": "Rut del cliente",
        "type": "text",
        "readonly": True,
        "display": "text",
    },
]