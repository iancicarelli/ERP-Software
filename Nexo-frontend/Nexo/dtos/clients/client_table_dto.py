from pydantic import BaseModel

class ClientDTO(BaseModel):
    id: int
    rut: str
    nombre_completo: str
    email: str
    telefono: str
    sector: str
    estado: str