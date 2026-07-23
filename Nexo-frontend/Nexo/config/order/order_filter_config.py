from ..utils.vendedores_config import VENDEDORES
from ..utils.elementos_elementos_config import ELEMENTOS
from ..utils.estado_config import ESTADO
from ..utils.causas_baja_config import CAUSAS_BAJA

ORDER_FILTER_CONFIG = {
        "search": {
            "label": "Buscar por Nombre",
            "type": "search",
            "placeholder": "Nombre, apellido o RUT...",
        },
######### dates
        "fecha_ingreso_after": {
            "label": "Fecha ingreso (Desde)",
            "type": "date",
            "group": "Fechas",
        },
        "fecha_ingreso_before": {
            "label": "Fecha ingreso (Hasta)",
            "type": "date",
            "group": "Fechas",
        },

        "fecha_contrato_after": {
            "label": "Fecha contrato (Desde)",
            "type": "date",
            "group": "Fechas",
        },
        "fecha_contrato_before": {
            "label": "Fecha contrato (Hasta)",
            "type": "date",
            "group": "Fechas",
        },

        "fecha_pago_after": {
            "label": "Fecha pago (Desde)",
            "type": "date",
            "group": "Fechas",
        },
        "fecha_pago_before": {
            "label": "Fecha pago (Hasta)",
            "type": "date",
            "group": "Fechas",
        },

        "fecha_programado_after": {
            "label": "Fecha programado (Desde)",
            "type": "date",
            "group": "Fechas",
        },
        "fecha_programado_before": {
            "label": "Fecha programado (Hasta)",
            "type": "date",
            "group": "Fechas",
        },

        "fecha_instalado_after": {
            "label": "Fecha instalado (Desde)",
            "type": "date",
            "group": "Fechas",
        },
        "fecha_instalado_before": {
            "label": "Fecha instalado (Hasta)",
            "type": "date",
            "group": "Fechas",
        },
        ######## Estado dropdown
        "estado_estado": {
            "label": "Estado",
            "type": "list",
            "group": "estado",
            "options": ESTADO,
        },
        ### Ubi (DROPDOWNS)
        "sector_sector": {
            "label": "Sector",
            "type": "list",
            "group": "Ubicación",
            "options_source": "sector_ordenes",
        },
        "zona_zona": {
            "label": "Zona",
            "type": "list",
            "group": "Ubicación",
            "options_source": "zona_ordenes",
        },
        "zona_exclude": {
            "label": "Excluir Zona",
            "type": "list",
            "group": "Ubicación",
            "options_source": "zona_ordenes",
        },

        ######### DROPDOWNS BOOLEAN 
        "contrato_nuevo": {
            "label": "Contrato nuevo",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "comision": {
            "label": "Comisión",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "comision_pagada": {
            "label": "Comisión pagada",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "pago_instalacion": {
            "label": "Pago instalación",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
         "abierto": {
            "label": "Abierto",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "modificacion_plan": {
            "label": "Plan modificado",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "migracion": {
            "label": "Migración",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
          "traslado": {
            "label": "Traslado",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "evaluacion": {
            "label": "Evaluación",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "bienvenida": {
            "label": "Bienvenida",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "medidor_luz": {
            "label": "Medidor de luz",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
         "ducto": {
            "label": "Ducto",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "poda": {
            "label": "Poda",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "postacion": {
            "label": "Postación",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        "vecino": {
            "label": "Vecino",
            "type": "boolean",
            "group": "Flags",
            "options": ["Si", "No"],
        },
        # =========================
        # CAUSA
        # =========================
        "causa_causa": {
            "label": "Causa",
            "type": "list",
            "group": "Causa",
            "options": CAUSAS_BAJA,
        },
        "servicio_servicio": {
            "label": "Servicio",
            "type": "list",
            "group": "Servicio",
            "options": ELEMENTOS,
        },

        # =========================
        # CANTIDADES
        # =========================
        "anexos_extras": {
            "label": "Anexos extras",
            "type": "number",
            "group": "Cantidades",
        },
        "anexos_extras_min": {
            "label": "Anexos extras (Mín)",
            "type": "number",
            "group": "Cantidades",
        },
        "anexos_extras_max": {
            "label": "Anexos extras (Máx)",
            "type": "number",
            "group": "Cantidades",
        },
        "anexos_extras_exterior": {
            "label": "Anexos extras exterior",
            "type": "number",
            "group": "Cantidades",
        },
        "anexos_extras_exterior_min": {
            "label": "Anexos extras exterior (Mín)",
            "type": "number",
            "group": "Cantidades",
        },
        "anexos_extras_exterior_max": {
            "label": "Anexos extras exterior (Máx)",
            "type": "number",
            "group": "Cantidades",
        },
        ########## Sinotonizadores
         "sintonizadores": {
            "label": "Sintonizadores",
            "type": "number",
            "group": "Cantidades",
        },
        "sintonizadores_min": {
            "label": "Sintonizadores (Mín)",
            "type": "number",
            "group": "Cantidades",
        },
        "sintonizadores_max": {
            "label": "Sintonizadores (Máx)",
            "type": "number",
            "group": "Cantidades",
        },
        #####################
         "extensores_wifi": {
            "label": "Extensores WiFi",
            "type": "number",
            "group": "Cantidades",
        },
        "extensores_wifi_min": {
            "label": "Extensores WiFi (Mín)",
            "type": "number",
            "group": "Cantidades",
        },
        "extensores_wifi_max": {
            "label": "Extensores WiFi (Máx)",
            "type": "number",
            "group": "Cantidades",
        },

        ########### INPUTS 
        "rut": {
            "label": "RUT Cliente",
            "type": "search",
            "placeholder": "08.291.711-K"
        },
        "id": {
            "label": "ID Orden",
            "type": "search",
            "placeholder": "6329"
        },
        "vendedor_nombre1": {
            "label": "Vendedor: Nombre",
            "type": "search",
            "placeholder": "Ej: Paulina"
        },
        "vendedor_apellido1": {
            "label": "Vendedor: Apellido P.",
            "type": "search",
            "placeholder": "Ej: Pino"
        },
        "vendedor_apellido2": {
            "label": "Vendedor: Apellido M.",
            "type": "search",
            "placeholder": "Apellido Materno"
        },
        "tecnico_nombre1": {
            "label": "Técnico: Nombre",
            "type": "search",
            "placeholder": "Ej: Cristian"
        },
        "tecnico_apellido1": {
            "label": "Técnico: Apellido P.",
            "type": "search",
            "placeholder": "Ej: Quiroz"
        },
        "tecnico_apellido2": {
            "label": "Técnico: Apellido M.",
            "type": "search",
            "placeholder": "Apellido Materno"
        },
}