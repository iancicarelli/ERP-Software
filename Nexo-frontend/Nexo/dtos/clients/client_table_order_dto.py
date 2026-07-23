from pydantic import BaseModel
from typing import Optional
from datetime import date


class ClientTableOrderDTO(BaseModel):
    id: int
    fecha_contrato: Optional[date] = None
    modificacion_plan: bool = False
    migracion: bool = False
    traslado: bool = False
    servicio_str: str
    abierto: bool
    estado_str: str
    fecha_programado: Optional[date] = None
    fecha_instalado: Optional[date] = None

    monto: int = 0
