# ============================================================================
# Frontend de Nexo (Reflex)
#
# Reflex compila Python a React/Next.js: el contenedor corre DOS procesos,
# el servidor de UI (3000) y el backend de estado de Reflex (8000).
#
# Nota: el CMD por defecto usa `--env prod`, que dispara el build de vite al
# arrancar. En desarrollo, docker-compose.override.yml lo pisa con `--env dev`.
# Optimizar el camino de producción (build en tiempo de imagen) queda para la
# Fase 12.
# ============================================================================

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    REFLEX_TELEMETRY_ENABLED=false \
    PATH="/home/app/.local/bin:${PATH}"

# curl/unzip: Reflex descarga bun para construir el frontend.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1000 app
WORKDIR /app
RUN chown app:app /app
USER app

COPY --chown=app:app requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=app:app . .

# Descarga bun + los paquetes de node y genera .web/.
# Se hace en tiempo de imagen para que el arranque del contenedor sea rápido.
RUN reflex init

EXPOSE 3000 8000

CMD ["reflex", "run", "--env", "prod", "--backend-host", "0.0.0.0"]
