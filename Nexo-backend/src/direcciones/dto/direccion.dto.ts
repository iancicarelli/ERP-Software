import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo de `POST /api/direcciones/` y `PUT /api/direcciones/{id}/`.
 *
 * FUENTE: los `post_payload` / `put_payload` de `DirectionDetailState`. Son
 * idénticos entre sí, por eso un solo DTO.
 *
 * `cliente` y `sector` viajan como **id plano**, no como `cliente_id`. El
 * frontend valida por su cuenta que `sector != 0` antes de mandar; acá se
 * exige positivo porque un 0 no es una FK válida y terminaría en un P2003
 * opaco.
 */
export class DireccionWriteDto {
  @IsString({ message: 'Este campo debe ser un texto.' })
  @IsNotEmpty({ message: 'Este campo es obligatorio.' })
  direccion: string;

  @IsInt({ message: 'Debe ser el ID de un cliente.' })
  @IsPositive({ message: 'Debe ser el ID de un cliente.' })
  cliente: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser el ID de un sector.' })
  @IsPositive({ message: 'Debe seleccionar un sector.' })
  sector?: number;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  activo?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Este campo debe ser verdadero o falso.' })
  principal?: boolean;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  contrato?: number;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(160, { message: 'Máximo 160 caracteres.' })
  sucursal?: string;

  @IsOptional()
  @IsString({ message: 'Este campo debe ser un texto.' })
  @MaxLength(80, { message: 'Máximo 80 caracteres.' })
  coordenadas?: string;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  monto?: number;
}
