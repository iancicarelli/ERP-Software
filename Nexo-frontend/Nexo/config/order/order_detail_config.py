FIELDS_ORDER_CLIENTE = [
    {
        "key": "koboid",
        "label": "Kobo ID",
        "type": "number",
        "readonly": True,
    },
    {
        "key": "koboid_serie",
        "label": "Kobo Serie",
        "type": "number",
        "readonly": True,
    },
    {
        "key": "kobo_asset_uid",
        "label": "Kobo UID",
        "type": "text",
        "readonly": True,
    },
    {
        "key": "kobo_submission_time",
        "label": "Fecha de Ingreso (Kobo)",
        "type": "date", 
        "readonly": True,
    },
]

FIELDS_UBICACION_PERSONAL = [
    {
        "key": "vendedor_str",
        "label": "Vendedor",
        "type": "select",
        "options": [],
    },
    {
        "key": "contrato_nuevo",
        "label": "Contrato Nuevo",
        "type": "boolean",
    },
    {
        "key": "fecha_contrato",
        "label": "Fecha Contrato",
        "type": "date"
    },
    {
        "key": "zona_str",
        "label": "Zona",
        "type": "select",
        "options": [],

    },
    {
        "key": "sector_str",
        "label": "Sector",
        "type": "select",
        "options": [],

    },
    {
        "key": "rut",
        "label": "RUT Cliente",
        "type": "text",
    },
    {
        "key": "nombre1",
        "label": "Nombre",
        "type": "text",
    },
    # Nombre2 no existe en el DTO, se omite.
    {
        "key": "apellido1",
        "label": "Apellido Paterno",
        "type": "text",
    },
    {
        "key": "apellido2",
        "label": "Apellido Materno",
        "type": "text",
    },
    # Dirección no existe explícitamente en el DTO (usualmente son coordenadas en seccion factibilidad), se omite.
    {
        "key": "email",
        "label": "Email",
        "type": "text",
    },
    {
        "key": "tel",
        "label": "Teléfono",
        "type": "text",
    },
    {
        "key": "direccion",
        "label": "Dirección",
        "type": "text",
    },
]

FIELDS_ORDER_SERVICIO = [
    {
        "key": "modificacion_plan", 
        "label": "Modificación de Plan", 
        "type": "boolean"
    },
    {
        "key": "migracion", 
        "label": "Migración", 
        "type": "boolean"
    },
    {
        "key": "traslado", 
        "label": "Traslado", 
        "type": "boolean"
    },
    {
        "key": "servicio_str",
        "label": "Servicio",
        "type": "select",
        "options": [],
    },
    {
        "key": "anexos_extras",
        "label": "Anexos extras interior",
        "type": "number"
    },
    {
        "key": "anexos_extras_exterior",
        "label": "Anexos extras exterior",
        "type": "number"
    },
    {
        "key": "sintonizadores",
        "label": "Sintonizadores",
        "type": "number"
    },
    {
        "key": "extensores_wifi",
        "label": "Extensores Wifi",
        "type": "number"
    },
]

FIELDS_ORDER_INSTALACION = [
    {
        "key": "metros_extras",
        "label": "Metros Extras",
        "type": "number"
    },
    {
        "key": "coordenadas",
        "label": "Coordenadas",
        "type": "text",
    },
    {
        "key": "medidor_luz",
        "label": "Medidor de Luz",
        "type": "boolean"
    },
    {
        "key": "ducto",
        "label": "Ducto",
        "type": "boolean"
    },
    {
        "key": "metros_ducto",
        "label": "Metros de Ducto",
        "type": "number"
    },
    {
        "key": "poda",
        "label": "Poda",
        "type": "boolean"
    },
    {
        "key": "vecino",
        "label": "Permiso Vecino",
        "type": "boolean"
    },
    {
        "key": "postacion",
        "label": "Postación",
        "type": "boolean"
    },
    {
        "key": "postes",
        "label": "Cantidad de Postes",
        "type": "number"
    },
    {
        "key": "observacion_vendedor",
        "label": "Observación Vendedor",
        "type": "text",
        "readonly": True,
    },
]

FIELDS_ORDER_ESTADO = [
    {
        "key": "estado_str",
        "label": "Estado",
        "type": "select",
        "options": [],

    },
    {
        "key": "causa_str",
        "label": "Causa",
        "type": "select",
        "options": [],

    },
    {
        "key": "comision", 
        "label": "Aplica Comisión", 
        "type": "boolean"
    },
    {
        "key": "comision_pagada", 
        "label": "Comisión Pagada", 
        "type": "boolean",
        "readonly": True,
    },
    {
        "key": "costo_instalacion", 
        "label": "Costo Instalación", 
        "type": "number",
        "readonly": True,
        

    },
    {
        "key": "fecha_pago", 
        "label": "Fecha Pago", 
        "type": "date"
    },
    {
        "key": "fecha_programado", 
        "label": "Fecha Programada", 
        "type": "datetime-local"
    },
    {
        "key": "fecha_instalado", 
        "label": "Fecha Instalación", 
        "type": "date"
    },
    {
        "key": "tecnico_str",
        "label": "Técnico Principal",
        "type": "select",
        "options": [],

    },
    {
        "key": "tecnico2",
        "label": "Técnico 2",
        "type": "text",
    },
    {
        "key": "observacion",
        "label": "Observación",
        "type": "text",
    },
    {
        "key": "abierto",
        "label": "Abierto",
        "type": "boolean",
    },
    {
        "key": "evaluacion",
        "label": "Evaluacion",
        "type": "boolean",
    },
    {
        "key": "bienvenida",
        "label": "Bienvenida",
        "type": "boolean",
    },
]