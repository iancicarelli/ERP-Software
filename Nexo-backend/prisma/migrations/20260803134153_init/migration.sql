-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(254),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "date_joined" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas" (
    "id" SERIAL NOT NULL,
    "zona" VARCHAR(120) NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectores" (
    "sector" VARCHAR(120) NOT NULL,
    "id" SERIAL NOT NULL,
    "zona_id" INTEGER NOT NULL,

    CONSTRAINT "sectores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elementos" (
    "id" SERIAL NOT NULL,
    "elemento" VARCHAR(160) NOT NULL,
    "monto_base" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "elementos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios_orden" (
    "id" SERIAL NOT NULL,
    "servicio" VARCHAR(160) NOT NULL,

    CONSTRAINT "servicios_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados_orden" (
    "id" SERIAL NOT NULL,
    "estado" VARCHAR(120) NOT NULL,

    CONSTRAINT "estados_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "causas_orden" (
    "id" SERIAL NOT NULL,
    "causa" VARCHAR(160) NOT NULL,

    CONSTRAINT "causas_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "causas_baja" (
    "id" SERIAL NOT NULL,
    "causa" VARCHAR(160) NOT NULL,

    CONSTRAINT "causas_baja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores" (
    "id" SERIAL NOT NULL,
    "nombre1" VARCHAR(80) NOT NULL,
    "apellido1" VARCHAR(80) NOT NULL,
    "apellido2" VARCHAR(80),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" INTEGER,

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tecnicos" (
    "id" SERIAL NOT NULL,
    "nombre1" VARCHAR(80) NOT NULL,
    "apellido1" VARCHAR(80) NOT NULL,
    "apellido2" VARCHAR(80),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" INTEGER,

    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "rut" VARCHAR(20) NOT NULL,
    "rut_validado" BOOLEAN NOT NULL DEFAULT false,
    "nombre1" VARCHAR(80) NOT NULL,
    "nombre2" VARCHAR(80),
    "nombre3" VARCHAR(80),
    "apellido1" VARCHAR(80) NOT NULL,
    "apellido2" VARCHAR(80),
    "email" VARCHAR(254),
    "tel" VARCHAR(30),
    "co_titular1" VARCHAR(160),
    "co_titular2" VARCHAR(160),
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "por_instalar" BOOLEAN NOT NULL DEFAULT false,
    "moroso" BOOLEAN NOT NULL DEFAULT false,
    "moroso_desde" DATE,
    "deuda" INTEGER NOT NULL DEFAULT 0,
    "monto_total" INTEGER NOT NULL DEFAULT 0,
    "krill" BOOLEAN NOT NULL DEFAULT false,
    "defontana" BOOLEAN NOT NULL DEFAULT false,
    "zammad" BOOLEAN NOT NULL DEFAULT false,
    "cpes_todos" INTEGER NOT NULL DEFAULT 0,
    "cpes_inactivos" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_de_baja" DATE,
    "causa_de_baja_id" INTEGER,
    "donacion" BOOLEAN NOT NULL DEFAULT false,
    "analogo" BOOLEAN NOT NULL DEFAULT false,
    "corte_poste" BOOLEAN NOT NULL DEFAULT false,
    "baja_por_renuncia" BOOLEAN NOT NULL DEFAULT false,
    "baja_por_morosidad" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direcciones" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "sector_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "contrato" INTEGER,
    "sucursal" VARCHAR(160),
    "direccion" TEXT NOT NULL,
    "coordenadas" VARCHAR(80),
    "monto" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "direccion_id" INTEGER,
    "elemento_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "monto" INTEGER NOT NULL DEFAULT 0,
    "personalizado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_trabajo" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER,
    "koboid" INTEGER,
    "koboid_serie" INTEGER,
    "kobo_asset_uid" VARCHAR(64),
    "kobo_submission_time" TIMESTAMPTZ(6),
    "rut" VARCHAR(20) NOT NULL,
    "nombre1" VARCHAR(80) NOT NULL,
    "apellido1" VARCHAR(80) NOT NULL,
    "apellido2" VARCHAR(80),
    "email" VARCHAR(254),
    "tel" VARCHAR(30),
    "contrato_nuevo" BOOLEAN NOT NULL DEFAULT false,
    "fecha_contrato" DATE,
    "modificacion_plan" BOOLEAN NOT NULL DEFAULT false,
    "migracion" BOOLEAN NOT NULL DEFAULT false,
    "traslado" BOOLEAN NOT NULL DEFAULT false,
    "servicio_id" INTEGER,
    "anexos_extras" INTEGER NOT NULL DEFAULT 0,
    "anexos_extras_exterior" INTEGER NOT NULL DEFAULT 0,
    "sintonizadores" INTEGER NOT NULL DEFAULT 0,
    "extensores_wifi" INTEGER NOT NULL DEFAULT 0,
    "metros_extras" INTEGER NOT NULL DEFAULT 0,
    "costo_metros_extras" INTEGER NOT NULL DEFAULT 0,
    "pago_instalacion" BOOLEAN NOT NULL DEFAULT true,
    "costo_instalacion" INTEGER NOT NULL DEFAULT 0,
    "monto" INTEGER NOT NULL DEFAULT 0,
    "direccion" TEXT,
    "direccion_id" INTEGER,
    "coordenadas" VARCHAR(80),
    "medidor_luz" BOOLEAN NOT NULL DEFAULT false,
    "ducto" BOOLEAN NOT NULL DEFAULT false,
    "metros_ducto" INTEGER NOT NULL DEFAULT 0,
    "poda" BOOLEAN NOT NULL DEFAULT false,
    "vecino" BOOLEAN NOT NULL DEFAULT false,
    "postacion" BOOLEAN NOT NULL DEFAULT false,
    "postes" INTEGER NOT NULL DEFAULT 0,
    "observacion_vendedor" TEXT,
    "observacion" TEXT,
    "abierto" BOOLEAN NOT NULL DEFAULT true,
    "evaluacion" BOOLEAN NOT NULL DEFAULT false,
    "estado_id" INTEGER,
    "causa_id" INTEGER,
    "bienvenida" BOOLEAN NOT NULL DEFAULT false,
    "comision" BOOLEAN NOT NULL DEFAULT false,
    "comision_pagada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_pago" DATE,
    "fecha_ingreso" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_programado" TIMESTAMPTZ(6),
    "fecha_instalado" TIMESTAMPTZ(6),
    "vendedor_id" INTEGER,
    "tecnico_id" INTEGER,
    "tecnico2" VARCHAR(160),
    "zona_id" INTEGER,
    "sector_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ordenes_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_orden" (
    "id" SERIAL NOT NULL,
    "orden_trabajo_id" INTEGER NOT NULL,
    "nota" TEXT NOT NULL,
    "added_by_id" INTEGER,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER,
    "cliente_rut" VARCHAR(20),
    "voucher_rut" VARCHAR(20),
    "voucher_type" VARCHAR(20),
    "voucher_number" INTEGER,
    "fiscal_year" SMALLINT,
    "date" DATE NOT NULL,
    "entry_date" DATE,
    "entry_user" VARCHAR(150),
    "credit" INTEGER NOT NULL DEFAULT 0,
    "document_type" VARCHAR(40),
    "folio_number" VARCHAR(40),
    "expiration_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER,
    "fecha" DATE NOT NULL,
    "rut_transferencia" VARCHAR(20),
    "nombre" VARCHAR(200),
    "banco_origen" VARCHAR(120),
    "cuenta_destino" VARCHAR(60),
    "monto" INTEGER NOT NULL DEFAULT 0,
    "estado" VARCHAR(40),
    "codigo_transferencia" VARCHAR(80),
    "voucher_generado" VARCHAR(80),
    "documento_pagado" BOOLEAN NOT NULL DEFAULT false,
    "documento_venta" VARCHAR(80),
    "documento_vencimiento" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "zonas_zona_key" ON "zonas"("zona");

-- CreateIndex
CREATE UNIQUE INDEX "sectores_sector_key" ON "sectores"("sector");

-- CreateIndex
CREATE INDEX "sectores_zona_id_idx" ON "sectores"("zona_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_orden_servicio_key" ON "servicios_orden"("servicio");

-- CreateIndex
CREATE UNIQUE INDEX "estados_orden_estado_key" ON "estados_orden"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "causas_orden_causa_key" ON "causas_orden"("causa");

-- CreateIndex
CREATE UNIQUE INDEX "causas_baja_causa_key" ON "causas_baja"("causa");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_usuario_id_key" ON "vendedores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "tecnicos_usuario_id_key" ON "tecnicos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_rut_key" ON "clientes"("rut");

-- CreateIndex
CREATE INDEX "clientes_rut_idx" ON "clientes"("rut");

-- CreateIndex
CREATE INDEX "clientes_activo_idx" ON "clientes"("activo");

-- CreateIndex
CREATE INDEX "clientes_moroso_idx" ON "clientes"("moroso");

-- CreateIndex
CREATE INDEX "clientes_fecha_creacion_idx" ON "clientes"("fecha_creacion");

-- CreateIndex
CREATE INDEX "clientes_causa_de_baja_id_idx" ON "clientes"("causa_de_baja_id");

-- CreateIndex
CREATE INDEX "direcciones_cliente_id_idx" ON "direcciones"("cliente_id");

-- CreateIndex
CREATE INDEX "direcciones_sector_id_idx" ON "direcciones"("sector_id");

-- CreateIndex
CREATE INDEX "servicios_cliente_id_idx" ON "servicios"("cliente_id");

-- CreateIndex
CREATE INDEX "servicios_elemento_id_idx" ON "servicios"("elemento_id");

-- CreateIndex
CREATE INDEX "servicios_direccion_id_idx" ON "servicios"("direccion_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_cliente_id_idx" ON "ordenes_trabajo"("cliente_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_abierto_idx" ON "ordenes_trabajo"("abierto");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_estado_id_idx" ON "ordenes_trabajo"("estado_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_tecnico_id_idx" ON "ordenes_trabajo"("tecnico_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_vendedor_id_idx" ON "ordenes_trabajo"("vendedor_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_sector_id_idx" ON "ordenes_trabajo"("sector_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_zona_id_idx" ON "ordenes_trabajo"("zona_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_fecha_ingreso_idx" ON "ordenes_trabajo"("fecha_ingreso");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_fecha_programado_idx" ON "ordenes_trabajo"("fecha_programado");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_fecha_instalado_idx" ON "ordenes_trabajo"("fecha_instalado");

-- CreateIndex
CREATE INDEX "notas_orden_orden_trabajo_id_idx" ON "notas_orden"("orden_trabajo_id");

-- CreateIndex
CREATE INDEX "pagos_cliente_id_idx" ON "pagos"("cliente_id");

-- CreateIndex
CREATE INDEX "pagos_date_idx" ON "pagos"("date");

-- CreateIndex
CREATE INDEX "pagos_entry_date_idx" ON "pagos"("entry_date");

-- CreateIndex
CREATE INDEX "pagos_cliente_rut_idx" ON "pagos"("cliente_rut");

-- CreateIndex
CREATE INDEX "transferencias_cliente_id_idx" ON "transferencias"("cliente_id");

-- CreateIndex
CREATE INDEX "transferencias_estado_idx" ON "transferencias"("estado");

-- CreateIndex
CREATE INDEX "transferencias_fecha_idx" ON "transferencias"("fecha");

-- AddForeignKey
ALTER TABLE "sectores" ADD CONSTRAINT "sectores_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tecnicos" ADD CONSTRAINT "tecnicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_causa_de_baja_id_fkey" FOREIGN KEY ("causa_de_baja_id") REFERENCES "causas_baja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_direccion_id_fkey" FOREIGN KEY ("direccion_id") REFERENCES "direcciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_elemento_id_fkey" FOREIGN KEY ("elemento_id") REFERENCES "elementos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios_orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_direccion_id_fkey" FOREIGN KEY ("direccion_id") REFERENCES "direcciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados_orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_causa_id_fkey" FOREIGN KEY ("causa_id") REFERENCES "causas_orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_orden" ADD CONSTRAINT "notas_orden_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_orden" ADD CONSTRAINT "notas_orden_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Constraints que el DSL de Prisma no puede expresar.
-- Se agregan a mano acá; `prisma migrate diff` los ignora, así que NO hay que
-- borrarlos si una migración futura se regenera. Están replicados como
-- comentario en `schema.prisma` para que queden a la vista.
-- ============================================================================

-- Como máximo UNA dirección principal por cliente (DATABASE_SCHEMA.md §5).
-- Índice único PARCIAL: solo restringe las filas con principal = true.
CREATE UNIQUE INDEX "uq_direccion_principal"
    ON "direcciones" ("cliente_id")
    WHERE "principal";

-- Un servicio contratado siempre tiene cantidad positiva (DATABASE_SCHEMA.md §6).
ALTER TABLE "servicios"
    ADD CONSTRAINT "ck_servicios_cantidad_positiva" CHECK ("cantidad" > 0);
