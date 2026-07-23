from pydantic import BaseModel
from typing import Optional

class PaymentDTO(BaseModel):
    id: int
    cliente_existe: bool
    cliente_str: str
    cliente_rut: str
    voucher_rut: str
    voucher_type: str
    voucher_number: int
    fiscal_year: int
    date: str
    entry_date: str
    entry_user: str
    credit: int
    document_type: str
    folio_number: str
    expiration_date: str
    cliente_sector: str