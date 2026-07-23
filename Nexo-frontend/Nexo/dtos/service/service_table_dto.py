from pydantic import BaseModel

class ServiceDTO(BaseModel):
    id: int
    cantidad: int
    rut: str  
    cliente: str
    elemento_elemento: str
    calle: str
    monto: int
    estado: str