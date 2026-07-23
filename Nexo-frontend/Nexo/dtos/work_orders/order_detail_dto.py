from pydantic import BaseModel
from typing import Optional


class OrderDetailDTO(BaseModel):
    # =========================
    # Identificación
    # =========================
    id: int
    koboid: Optional[int] = None
    koboid_serie: Optional[int] = None
    kobo_asset_uid: Optional[str] = None
    kobo_submission_time: Optional[str] = None

    # =========================
    # Contrato
    # =========================
    contrato_nuevo: bool = False
    fecha_contrato: Optional[str] = None

    # =========================
    # Cliente
    # =========================
    rut: str
    nombre1: str
    apellido1: str
    apellido2: Optional[str] = None
    email: Optional[str] = None
    tel: Optional[str] = None

    # =========================
    # Tipo de orden
    # =========================
    modificacion_plan: bool = False
    migracion: bool = False
    traslado: bool = False

    # =========================
    # Servicio
    # =========================
    servicio_str: Optional[str] = None

    # =========================
    # Equipamiento / Extras
    # =========================
    anexos_extras: int = 0
    anexos_extras_exterior: int = 0
    sintonizadores: int = 0
    extensores_wifi: int = 0

    # =========================
    # Costos
    # =========================
    metros_extras: int = 0
    costo_metros_extras: int = 0
    pago_instalacion: bool = False
    costo_instalacion: int = 0

    # =========================
    # Ubicación / Instalación
    # =========================
    coordenadas: Optional[str] = None
    medidor_luz: bool = False
    ducto: bool = False
    metros_ducto: int = 0
    poda: bool = False
    vecino: bool = False
    postacion: bool = False
    postes: int = 0

    # =========================
    # Observaciones
    # =========================
    observacion_vendedor: Optional[str] = None
    observacion: Optional[str] = None

    # =========================
    # Estado
    # =========================
    abierto: bool = True
    evaluacion: bool = False
    estado_str: Optional[str] = None
    causa_str: Optional[str] = None

    # =========================
    # Comisión
    # =========================
    comision: bool = False
    comision_pagada: bool = False
    fecha_pago: Optional[str] = None

    # =========================
    # Fechas de gestión
    # =========================
    fecha_programado: Optional[str] = None
    fecha_instalado: Optional[str] = None

    # =========================
    # Técnicos
    # =========================
    tecnico_str: Optional[str] = None
    tecnico2: Optional[str] = None

    # =========================
    # Vendedor
    # =========================
    vendedor_str: Optional[str] = None

    # =========================
    # Zona / Sector
    # =========================
    zona_zona: Optional[str] = None
    zona_str: Optional[str] = None
    sector_sector: Optional[str] = None
    sector_str: Optional[str] = None

    # =========================
    # FKs como IDs (para payload POST/PUT)
    # =========================
    servicio_id: Optional[int] = None
    estado_id: Optional[int] = None
    causa_id: Optional[int] = None
    zona_id: Optional[int] = None
    sector_id: Optional[int] = None
    vendedor_id: Optional[int] = None
    tecnico_id: Optional[int] = None

    # =========================
    # Writable FK fields — exact names returned by the API
    # =========================
    servicio: Optional[int] = None
    estado: Optional[int] = None
    zona: Optional[int] = None
    sector: Optional[int] = None
    vendedor: Optional[int] = None
    tecnico: Optional[int] = None
    causa: Optional[int] = None

    # =========================
    # Campos adicionales del modelo
    # =========================
    direccion: Optional[str] = None
    bienvenida: bool = False
    monto: int = 0
    pago_instalacion: bool = True
    costo_metros_extras: int = 0
