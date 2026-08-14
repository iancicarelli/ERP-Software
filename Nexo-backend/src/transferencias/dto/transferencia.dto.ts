import { IsInt, Min } from 'class-validator';

/**
 * ============================================================================
 * Cuerpo de `PATCH` / `PUT /api/transferencias/{id}/` — Fase 8
 * ----------------------------------------------------------------------------
 * FUENTE: `TransferAssignClientState.save_assignment()`
 * (`states/transfers/transfer_assign_client_state.py`). Manda **una sola
 * clave**:
 *
 *   { "cliente": 42 }
 *
 * Es el único write de toda la pantalla de transferencias: el diálogo "asignar
 * cliente" concilia una transferencia suelta con un cliente ya existente. No
 * hay alta, no hay edición de importes ni de fechas — esos datos vienen del
 * banco y el operador no los toca.
 *
 * La FK va con nombre plano (`cliente`, no `cliente_id`), igual que en
 * servicios: es la convención que ya usa el frontend en todos sus payloads.
 *
 * El `whitelist: true` del ValidationPipe global descarta en silencio cualquier
 * otra clave, así que si mañana el diálogo reenviara la transferencia entera,
 * el guardado seguiría funcionando sin tocar nada de acá.
 * ============================================================================
 */
export class AsignarClienteDto {
  /**
   * `@Min(1)` y no `@Min(0)`: el frontend inicializa `selected_client_id` en 0
   * y valida `if not self.selected_client_id` antes de mandar, así que un 0 que
   * llegue hasta acá es un cliente sin seleccionar —un bug del diálogo—, no una
   * intención de desasignar. Rechazarlo con un 400 legible es mejor que
   * guardar un `cliente_id: null` que nadie pidió.
   */
  @IsInt({ message: 'Este campo debe ser un número entero.' })
  @Min(1, { message: 'Debe seleccionar un cliente.' })
  cliente: number;
}
