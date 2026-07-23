from pydantic import BaseModel
from typing import Optional
from datetime import date


class ClientDetailDTO(BaseModel):
    id: int
    rut: str
    rut_validado: bool = False

    nombre1: str
    nombre2: Optional[str] = None
    nombre3: Optional[str] = None
    apellido1: str
    apellido2: Optional[str] = None

    email: Optional[str] = None
    tel: Optional[str] = None

    co_titular1: Optional[str] = None
    co_titular2: Optional[str] = None

    sector: Optional[str] = None
    zona: Optional[str] = None

    activo: bool = False
    por_instalar: bool = False
    moroso: bool = False
    moroso_desde: Optional[date] = None
    ####NUmerico
    deuda: float = 0.0
    monto_total: float = 0.0
    #######
    krill: bool = False
    defontana: bool = False
    zammad: bool = False
    ##NUmerico
    cpes_todos: int = 0
    cpes_inactivos: int = 0

    fecha_creacion: Optional[date] = None
    fecha_de_baja: Optional[date] = None
    causa_de_baja: Optional[int] = None
    causa_de_baja_str: Optional[str] = None

    donacion: bool = False
    analogo: bool = False

    corte_poste: bool = False
    baja_por_renuncia: bool = False
    baja_por_morosidad: bool = False
