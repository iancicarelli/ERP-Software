from pydantic import BaseModel
from typing import Optional

class ServiceDetailDTO(BaseModel):
    id: int = 0
    activo: bool = True
    cantidad: int = 1
    monto: int = 0
    personalizado: bool = False
    cliente: int = 0
    cliente_rut: str = ""      
    #cliente_nombre1: str        
    #cliente_apellido1: str
    #cliente_apellido2: str
    cliente_str: str = ""      
    direccion: int = 0
    direccion_str: str = ""    
    elemento: int = 0
    elemento_elemento: str = "" 