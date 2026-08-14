# Nexo ERP

Sistema de gestión de clientes, servicios, órdenes de trabajo, pagos y transferencias.

| Componente | Stack | Directorio |
|-----------|-------|-----------|
| Frontend | Reflex (Python → React) | `Nexo-frontend/` |
| Backend | NestJS (TypeScript) | `Nexo-backend/` |
| Base de datos | PostgreSQL 16 | contenedor `db` |

---

## Levantar el entorno

Requisitos: Docker y Docker Compose.

```bash
cp .env.example .env      # ajustar credenciales y JWT_SECRET
docker compose up -d
docker compose exec backend npm run prisma:seed   # crea el usuario admin
```

Eso levanta los tres servicios. `docker-compose.override.yml` se aplica solo y
agrega lo propio de desarrollo (puertos publicados, hot-reload).

El login está activo: entrá en http://localhost:3000/login con el usuario que
sembró el seed (`ADMIN_USERNAME` / `ADMIN_PASSWORD` del `.env`, por defecto
`admin` / `admin`). El seed es idempotente — si el usuario ya existe no le
cambia la contraseña.

| Servicio | URL | Notas |
|----------|-----|-------|
| Frontend (UI) | http://localhost:3000 | lo que abre el navegador |
| Frontend (estado Reflex) | http://localhost:8000 | websocket, uso interno |
| Backend (API) | http://localhost:3001/api | |
| PostgreSQL | `localhost:5433` | puerto configurable con `POSTGRES_HOST_PORT` |

> Si ya tenés un PostgreSQL corriendo en la máquina, cambiá `POSTGRES_HOST_PORT`
> en `.env`. Eso no afecta la comunicación entre contenedores, que siempre usa
> `db:5432`.

### Comandos frecuentes

```bash
docker compose ps                    # estado y healthchecks
docker compose logs -f backend       # logs de un servicio
docker compose restart backend
docker compose down                  # bajar (conserva los datos)
docker compose down -v               # bajar Y BORRAR la base de datos
docker compose build --no-cache      # reconstruir de cero
```

Modo producción (sin los overrides de desarrollo):

```bash
docker compose -f docker-compose.yml up -d
```

---

## Cómo se comunican

El state de Reflex corre **server-side**: las llamadas HTTP al backend salen del
contenedor `frontend`, no del navegador. Por eso dentro de Docker el frontend
usa `API_BASE_URL=http://backend:3001/api`, resuelto por el DNS de la red de
compose.

```
navegador ──> frontend:3000  (UI)
          └─> frontend:8000  (websocket de estado)
                    │
                    └─> backend:3001/api ──> db:5432
```

---

## Estado del proyecto

El frontend está construido. El backend cubre login real y los módulos de
clientes, direcciones, servicios y órdenes de trabajo de punta a punta.

| Área | Endpoints |
|------|-----------|
| Salud | `GET /api/health` |
| Autenticación | `POST /api/token/`, `/token/refresh/`, `/token/verify/` — el resto exige `Authorization: Bearer` |
| Catálogos | `/zonas/`, `/sectores/`, `/elementos/`, `/causadebajas/`, `/servicios-ordenes/`, `/estados-ordenes/`, `/causas-ordenes/`, `/tecnicos-ordenes/`, `/vendedores-ordenes/` |
| Clientes | `/clientes/` (GET, POST), `/clientes/{id}/` (GET, PUT, DELETE), `/clientes/all-ids/` |
| Direcciones | `/direcciones/` (GET, POST), `/direcciones/{id}/` (GET, PUT, DELETE) |
| Servicios | `/servicios/` (GET, POST), `/servicios/{id}/` (GET, PUT, DELETE) |
| Órdenes | `/ordenes/` (GET, POST), `/ordenes/{id}/` (GET, PUT), `/ordenes/all-ids/` |
| Notas de orden | `/notas-ordenes/` (GET `?orden_trabajo_id=`, POST) |

Pagos y transferencias todavía no existen, así que esas tablas —y la parte del
dashboard que cuenta sobre ellas— cargan vacías. Las acciones masivas
(`bulk-action`: exportar CSV, imprimir la orden en PDF) tampoco. La hoja de ruta
completa está en `ROADMAP.md` (git-ignored).

> Una orden guarda los datos del cliente **como copia** (`rut`, `nombre1`,
> `apellido1`, `email`, `tel`), y el vínculo con la ficha se resuelve por RUT al
> guardar. Si el RUT no corresponde a ningún cliente, la orden se guarda igual y
> queda sin vincular: es el caso de una venta a alguien que todavía no está dado
> de alta.

> Las zonas y los sectores del seed (`prisma/seeds/zonas-sectores.ts`) son 10
> comunas del Biobío y La Araucanía con sus sectores reales. Editar ese archivo
> y volver a correr el seed alcanza para cambiarlos: la función reconcilia y
> borra lo que ya no está en la lista, salvo lo que tenga direcciones u órdenes
> colgando, que se conserva y se avisa por consola. El resto de los catálogos
> son los valores que el frontend tenía hardcodeados.

> Al agregar una dependencia npm hay que reconstruir la imagen
> (`docker compose up -d --build backend`): el bind mount de desarrollo solo
> monta `src/` y `prisma/`, no `node_modules`.
