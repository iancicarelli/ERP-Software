# Inicio rápido — Nexo ERP

Todo lo necesario para levantar el proyecto y entrar. Proyecto privado: las
credenciales de desarrollo están acá a propósito.

---

## 1. Levantar el entorno

Requisitos: Docker y Docker Compose. Desde la raíz del repo:

```bash
docker compose up -d
```

Eso levanta los tres servicios (`db`, `backend`, `frontend`). El
`docker-compose.override.yml` se aplica solo y agrega lo de desarrollo: puertos
publicados y hot-reload.

La primera vez (o si borraste la base con `down -v`), sembrar el usuario admin:

```bash
docker compose exec backend npm run prisma:seed
```

El seed es idempotente: si el usuario ya existe, no le cambia la contraseña.

Comprobar que todo quedó arriba:

```bash
docker compose ps                          # los tres deben decir (healthy)
curl -s http://localhost:3001/api/health   # {"status":"ok","service":"nexo-backend","db":"ok"}
```

---

## 2. Entrar a la app

**Abrí 👉 http://localhost:3000/login**

| | |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin` |

Escribís usuario y contraseña, clic en **Iniciar sesión**, y caés en el
Dashboard. Estos valores salen de `ADMIN_USERNAME` / `ADMIN_PASSWORD` en el
`.env` de la raíz; si los cambiás ahí, hay que volver a correr el seed sobre una
base limpia para que tengan efecto.

---

## 3. Direcciones

| Servicio | URL | Para qué |
|----------|-----|----------|
| **Frontend (UI)** | **http://localhost:3000** | lo que abrís en el navegador |
| Estado de Reflex | http://localhost:8000 | websocket interno, no se navega |
| Backend (API) | http://localhost:3001/api | |
| Health del backend | http://localhost:3001/api/health | único endpoint público sin token |
| PostgreSQL | `localhost:5433` | desde tu máquina |
| PostgreSQL | `db:5432` | entre contenedores |

El backend **no tiene Swagger ni ninguna UI navegable**: se lo mira por logs o
pegándole con `curl`.

---

## 4. Credenciales

### App

| | |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin` |

### PostgreSQL

| | |
|---|---|
| Usuario | `nexo` |
| Contraseña | `cambiar_en_produccion` |
| Base | `nexo` |
| Puerto (host) | `5433` |
| Puerto (interno) | `5432` |

El `JWT_SECRET` está en el `.env` de la raíz. No hace falta para entrar, así que
no se replica acá.

> Estos valores son de desarrollo. Antes de cualquier despliegue real hay que
> rotar la contraseña de Postgres y el `JWT_SECRET`.

---

## 5. Ver la API a mano

El endpoint de login es **`/api/token`** (estilo SimpleJWT), no
`/api/auth/login`. Devuelve `200` — no `201` — porque el frontend compara contra
200 exacto.

```bash
# Obtener el token
ACC=$(curl -s -X POST http://localhost:3001/api/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | jq -r .access)

# Usarlo
curl -s -H "Authorization: Bearer $ACC" http://localhost:3001/api/clientes | jq
curl -s -H "Authorization: Bearer $ACC" http://localhost:3001/api/ordenes  | jq
```

Salvo `/api/health` y `/api/token*`, todas las rutas exigen el `Bearer`.

Rutas disponibles: `/clientes`, `/direcciones`, `/servicios`, `/ordenes`,
`/notas-ordenes`, `/pagos`, `/transferencias`, más los catálogos
`/estados-ordenes`, `/causas-ordenes`, `/tecnicos-ordenes`,
`/vendedores-ordenes`, `/sectores`, `/zonas`.

Pagos y transferencias son **solo lectura** (los datos llegan por conciliación,
no por formulario), con una excepción: asignar el cliente de una transferencia.

```bash
curl -s -X PATCH http://localhost:3001/api/transferencias/3/ \
  -H "Authorization: Bearer $ACC" -H 'Content-Type: application/json' \
  -d '{"cliente": 9}'
```

---

## 6. Ver la base de datos

Prisma Studio corre desde tu máquina contra el Postgres del contenedor. Ojo: hay
que **sobrescribir** el `DATABASE_URL`, porque el del `.env` apunta a `db:5432`,
que es DNS interno de Docker y no resuelve desde el host.

```bash
cd Nexo-backend
DATABASE_URL="postgresql://nexo:cambiar_en_produccion@localhost:5433/nexo?schema=public" npx prisma studio
```

Abre en http://localhost:5555.

---

## 7. Ver front y backend mientras desarrollás

Los dos servicios están en modo dev con hot-reload. Para seguir ambos logs en
una sola terminal:

```bash
docker compose logs -f backend frontend
```

Cada línea viene prefijada con `backend-1 |` o `frontend-1 |`.

**Las llamadas a la API no aparecen en la pestaña Network del navegador.** El
state de Reflex corre server-side: las peticiones HTTP salen del contenedor
`frontend` hacia `backend:3001`, no desde tu navegador. Lo único que viaja por el
navegador es el websocket de estado contra `:8000`. Para ver qué le pide el front
al backend, mirá los logs del backend.

```
navegador ──> frontend:3000  (UI)
          └─> frontend:8000  (websocket de estado)
                    │
                    └─> backend:3001/api ──> db:5432
```

---

## 8. Comandos frecuentes

```bash
docker compose ps                    # estado y healthchecks
docker compose logs -f backend       # logs de un servicio
docker compose restart backend
docker compose down                  # bajar (conserva los datos)
docker compose down -v               # bajar Y BORRAR la base de datos
docker compose build --no-cache      # reconstruir de cero
docker compose up -d --build frontend  # tras tocar requirements.txt
```

Modo producción (sin los overrides de desarrollo):

```bash
docker compose -f docker-compose.yml up -d
```

---

## 9. Si no podés entrar al login

Las credenciales `admin`/`admin` están verificadas. Si el login no responde, casi
siempre es estado viejo en el navegador, no un problema del backend.

**Primero, descartá el backend.** Si esto devuelve un par de tokens, el servidor
está bien y el problema es del lado del navegador:

```bash
curl -s -X POST http://localhost:3001/api/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}'
```

Después, por orden:

1. **Recarga forzada**: `Ctrl` + `Shift` + `R`. El frontend se reinicia seguido en
   modo dev; si la pestaña quedó abierta desde antes de un reinicio, el websocket
   contra `:8000` está muerto y el clic en "Iniciar sesión" no llega al servidor
   — no ves ningún error, simplemente no pasa nada.
2. **Ventana de incógnito** (`Ctrl` + `Shift` + `N`). Si ahí entra, era
   `localStorage` sucio: un JWT viejo (de otra corrida, o firmado con un
   `JWT_SECRET` distinto) te rebota a `/login`.
3. **Limpiar el storage** en tu ventana normal — F12 → Console:

   ```js
   localStorage.clear(); location.reload();
   ```

Cómo leer el síntoma:

| Qué ves al hacer clic | Qué significa |
|---|---|
| No pasa nada | Websocket muerto → recarga forzada |
| "Credenciales incorrectas" y **no** aparece `POST /api/token` en los logs del backend | La petición nunca salió del front |
| "Credenciales incorrectas" y **sí** aparece el `POST` con 401 | Falta correr el seed |
| Entra y te devuelve a `/login` | Token viejo en `localStorage` → limpiarlo |
