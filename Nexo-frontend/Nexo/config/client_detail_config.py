FIELDS_PERSONAL = [
    {
        "key": "id",
        "label": "ID",
        "type": "text",
        "readonly": True,
        "display": "text",
    },
    {"key": "rut", "label": "RUT", "type": "text"},
    {"key": "nombre1", "label": "Nombre", "type": "text"},
    {"key": "nombre2", "label": "Segundo Nombre", "type": "text"},
    {"key": "nombre3", "label": "Tercer Nombre", "type": "text"},
    {"key": "apellido1", "label": "Apellido Paterno", "type": "text"},
    {"key": "apellido2", "label": "Apellido Materno", "type": "text"},
    {"key": "email", "label": "Email", "type": "email"},
    {"key": "tel", "label": "Teléfono", "type": "tel"},
    {"key": "co_titular1", "label": "Cotitular 1", "type": "text"},
    {"key": "co_titular2", "label": "Cotitular 2", "type": "text"},
]

FIELDS_ADMINISTRATIVA = [
    {"key": "fecha_creacion", "label": "Fecha Creación", "type": "date"},
    {"key": "activo", "label": "Cliente Activo", "type": "boolean"},
    {"key": "analogo", "label": "Análogo", "type": "boolean"},
    {"key": "moroso", "label": "Estado Moroso", "type": "boolean"},
    {"key": "moroso_desde", "label": "Moroso Desde", "type": "date"},
    {"key": "deuda", "label": "Deuda Total", "type": "number"},
    {"key": "monto_total", "label": "Monto Total", "type": "number"},
    {"key": "por_instalar", "label": "Pendiente Instalar", "type": "boolean"},
    {"key": "donacion", "label": "Donación", "type": "boolean"},
    {"key": "fecha_de_baja", "label": "Fecha de Baja", "type": "date"},
    {"key": "causa_de_baja_str", "label": "Causa de Baja", "type": "select"},
    {"key": "corte_poste", "label": "Corte en Poste", "type": "boolean"},
    {"key": "baja_por_renuncia", "label": "Baja por Renuncia", "type": "boolean"},
    {"key": "baja_por_morosidad", "label": "Baja por Mora", "type": "boolean"},
    {"key": "rut_validado", "label": "RUT Validado", "type": "boolean"},
]

FIELDS_INTEGRACIONES = [
    {"key": "defontana", "label": "Defontana", "type": "boolean"},
    {"key": "zammad", "label": "Zammad", "type": "boolean"},
    {"key": "krill", "label": "Krill", "type": "boolean"},
    {"key": "sector", "label": "Sector", "type": "select"},
    {"key": "zona", "label": "Zona", "type": "select"},
    {"key": "cpes_todos", "label": "CPES Todos", "type": "number"},
    {"key": "cpes_inactivos", "label": "CPES Inactivos", "type": "number"},
]
