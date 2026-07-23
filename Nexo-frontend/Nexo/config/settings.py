import os

# URL base del NUEVO backend de Nexo (aún por construir en ../Nexo-backend).
# Se toma de la variable de entorno API_BASE_URL (ver .env / .env.example).
# Si no está definida, se usa un backend local por defecto para poder levantar
# el frontend de forma aislada durante el desarrollo, sin depender del backend
# antiguo. El contrato de endpoints/entidades esperado está documentado en el
# esquema de BD del nuevo backend (Nexo-backend/DATABASE_SCHEMA.md, git-ignored).
DEFAULT_API_BASE_URL = "http://localhost:8000/api"

API_BASE_URL = os.getenv("API_BASE_URL") or DEFAULT_API_BASE_URL
