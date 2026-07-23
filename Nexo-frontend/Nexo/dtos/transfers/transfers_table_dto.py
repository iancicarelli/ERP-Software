from pydantic import BaseModel
from typing import Optional

class TransferenciaDTO(BaseModel):
    id: int
    fecha: str
    cliente_str: str 
    #cliente_rut: str mismo que rut_transferencia
    rut_transferencia: str
    nombre: str
    banco_origen: str
    cuenta_destino: str
    monto: str  
    estado: str
    codigo_transferencia: str
    cliente_existe: bool = False
    voucher_generado: str
    ## 
    documento_pagado: bool = False
    documento_venta: str
    documento_vencimiento: str

