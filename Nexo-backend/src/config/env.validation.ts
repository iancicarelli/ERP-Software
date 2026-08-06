import * as Joi from 'joi';

/**
 * Validación del entorno. Se ejecuta al arrancar: si falta o está mal una
 * variable, el proceso muere con un mensaje claro en vez de fallar más tarde
 * con un error opaco de conexión o de firma de JWT.
 *
 * Las variables JWT_* todavía no las usa nadie (la Fase 3 monta el auth), pero
 * ya vienen en `.env.example` y en `docker-compose.yml`, así que se validan
 * acá para que el contrato del entorno sea uno solo.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3001),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});
