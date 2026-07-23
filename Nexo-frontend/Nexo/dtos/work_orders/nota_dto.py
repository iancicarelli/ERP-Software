from pydantic import BaseModel
from typing import Optional


class NotaDTO(BaseModel):
    id: int
    orden_trabajo: int
    orden_trabajo_str: Optional[str] = None
    nota: str
    fecha_creacion: Optional[str] = None
    added_by: Optional[int] = None
    added_by_username: Optional[str] = None
