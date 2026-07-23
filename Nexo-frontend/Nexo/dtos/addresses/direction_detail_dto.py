from pydantic import BaseModel, field_validator
from typing import Optional


class DirectionDetailDTO(BaseModel):
    id: int = 0
    activo: bool = True
    principal: bool = False
    contrato: int = 0
    sucursal: str = ""        # null en DB → ""
    direccion: str = ""
    coordenadas: str = ""     # null en DB → ""
    monto: int = 0
    # FK cliente
    cliente: int = 0
    cliente_rut: str = ""
    cliente_str: str = ""
    # FK sector
    sector: int = 0
    sector_str: str = ""
    sector_zona: str = ""

    @field_validator("sucursal", "coordenadas", "cliente_rut", "cliente_str",
                     "sector_str", "sector_zona", mode="before")
    @classmethod
    def none_to_empty_string(cls, v):
        """Convierte None a '' para campos string nullable del backend."""
        if v is None:
            return ""
        return v

    @field_validator("sector", "cliente", "contrato", "monto", mode="before")
    @classmethod
    def none_to_zero(cls, v):
        """Convierte None a 0 para FK enteras y campos numéricos nullable."""
        if v is None:
            return 0
        return v