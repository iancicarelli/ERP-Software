from pydantic import BaseModel
from typing import Optional

class OrderDTO(BaseModel):
    id: int
    koboid: Optional[int] = None

    # Contrato
    contrato_nuevo: bool = False
    fecha_contrato: Optional[str] = None

    # Cliente
    rut: str
    nombre1: str
    apellido1: str
    apellido2: Optional[str] = None
    nombre_completo: str # Campo calculado en el state

    # Tipo de orden
    modificacion_plan: bool = False
    migracion: bool = False
    traslado: bool = False

    # Servicio (Nombre Backend)
    servicio_servicio: Optional[str] = None

    # Costos
    pago_instalacion: bool = False
    costo_instalacion: int = 0

    # Ubicación
    coordenadas: Optional[str] = "Sin datos"

    # Estado (Nombre Backend)
    abierto: bool = True
    estado_estado: Optional[str] = None

    # Comisión
    comision: bool = False
    comision_pagada: bool = False

    # Fechas
    fecha_programado: Optional[str] = None
    fecha_instalado: Optional[str] = None


    # Técnicos (Nombre Backend)
    tecnico_str: Optional[str] = "Sin asignar"

    # Zona / Sector (Nombres Backend)
    zona_str: Optional[str] = None
    sector_str: Optional[str] = None
