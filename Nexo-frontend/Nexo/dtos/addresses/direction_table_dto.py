from pydantic import BaseModel

class DireccionTableDTO(BaseModel):
    id: int
    direccion: str
    sector: str
    zona: str
    coordenadas: str
    activo: bool
    principal: bool
    monto: float