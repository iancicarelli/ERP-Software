import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/**
 * ============================================================================
 * Cuerpo de `POST /api/notas-ordenes/` — Fase 7
 * ----------------------------------------------------------------------------
 * FUENTE: `OrderNotasState.add_nota()`, que manda exactamente dos claves:
 *
 *   { "orden_trabajo": 123, "nota": "texto" }
 *
 * **`added_by` no se declara y no se acepta del payload**: sale del token, vía
 * `@CurrentUser()`. Si viniera del cuerpo, cualquiera podría firmar una nota
 * con el nombre de otro.
 * ============================================================================
 */
export class NotaWriteDto {
  @IsInt({ message: 'Debe indicar la orden de trabajo.' })
  @Min(1, { message: 'Debe indicar la orden de trabajo.' })
  orden_trabajo: number;

  @IsString({ message: 'Este campo es obligatorio.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  nota: string;
}
