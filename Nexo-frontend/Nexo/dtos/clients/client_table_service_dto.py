from pydantic import BaseModel


class ClientTableServiceDTO(BaseModel):
    id: int
    activo: bool
    elemento_elemento: str
    cantidad: int
    monto: float
    personalizado: bool
    direccion_str: str

