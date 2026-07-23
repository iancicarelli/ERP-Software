# Nexo

Panel administrativo para gestión de clientes, servicios, órdenes, pagos y transferencias. Construido con Reflex, que compila Python a React/Next.js.

---

## Tecnologías

- **[Reflex](https://reflex.dev/) 0.8.24** — framework Python → React/Next.js
- **Python 3.10+**
- **Pydantic** — validación de DTOs
- **LocalStorage** — manejo de tokens de autenticación

---

## Requisitos

- Python 3.10 o superior
- Node.js 18 o superior (Reflex lo usa internamente)
- pip

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Nexo-frontend

# 2. Crear entorno virtual e instalar dependencias
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL del backend y otros valores necesarios

# 4. Iniciar la aplicación
reflex run
```

La app queda disponible en `http://localhost:3000`.

---

## Estructura de carpetas

```
Nexo/
│
├── Nexo.py   # Entry point: inicializa la app y registra páginas
│
├── pages/                    # Vistas de la aplicación
│   ├── index.py              # Dashboard principal (/)
│   ├── login.py              # Login (/login)
│   ├── management/           # Módulos de clientes, servicios, pagos, transferencias y direcciones
│   ├── work_orders/          # Módulo de órdenes de trabajo
│   └── metrics/              # Métricas y dashboards Grafana
│
├── components/               # Componentes reutilizables
│   ├── tables/               # Tabla genérica, paginación, selector de columnas
│   ├── forms/                # Formulario genérico y wrappers por módulo
│   ├── filters/              # Filtros genéricos y wrappers por módulo
│   ├── buttons/              # Botones reutilizables (add, confirm, back)
│   ├── sidebar.py            # Navegación lateral
│   ├── template.py           # Layout compartido de todas las páginas protegidas
│   └── user_profile.py       # Perfil de usuario en el sidebar
│
├── states/                   # Lógica de estado (Reflex State)
│   ├── api/                  # APIState: base para llamadas HTTP
│   ├── login/                # AuthState: autenticación y tokens
│   ├── table/                # BaseTableState y FilterableTableState
│   ├── clients/              # Estados del módulo clientes
│   ├── services/             # Estados del módulo servicios
│   ├── orders/               # Estados del módulo órdenes
│   ├── payments/             # Estados del módulo pagos
│   ├── transfers/            # Estados del módulo transferencias
│   └── cache/                # CacheSignalState: invalidación de datos
│
├── dtos/                     # Modelos Pydantic (Data Transfer Objects)
├── config/                   # Configuración de campos y filtros por módulo
└── utils/                    # Utilidades compartidas
```

---

## Arquitectura

**Organización del código** — el proyecto se divide en capas con responsabilidades separadas:

```
DTOs → States → Components → Pages
```

**Patrón de presentación** — Reflex implementa MVVM, donde los componentes reaccionan automáticamente a cambios en el estado:

- **Model** — DTOs (Pydantic) y llamadas a la API REST del backend
- **ViewModel** — States: contienen el estado de la UI, lógica de negocio y disparan las llamadas al Model
- **View** — Pages y Components: renderizan el estado y emiten eventos hacia el ViewModel

**Herencia de states** — los states heredan de bases genéricas para evitar duplicación:

```
AuthState
  └── APIState
        └── BaseTableState / PaginatedState
              └── FilterableTableState
                    └── [ClientTableState, OrderTableState, ...]
```

**Patrón dominante** — componente genérico + wrapper ligero (`generic_table`, `generic_detail_form`). Agregar un módulo nuevo implica: nuevo DTO → state heredando la base → wrapper de componente → página.

---

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard con KPIs |
| `/login` | Autenticación |
| `/client` | Listado de clientes |
| `/client/detail` | Detalle y edición de cliente |
| `/orders` | Órdenes de trabajo |
| `/service` | Servicios |
| `/payments` | Pagos |
| `/transfers` | Transferencias |
| `/metrics` | Métricas (Grafana embebido) |
