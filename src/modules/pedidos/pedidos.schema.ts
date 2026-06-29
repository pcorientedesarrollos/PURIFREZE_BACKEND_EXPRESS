import { z } from 'zod';

// Schema para detalle de pedido (crear)
export const createPedidoDetalleSchema = z.object({
  RefaccionID: z.number().optional().nullable(),
  EquipoID: z.number().optional().nullable(),
  EquipoVirtualID: z.number().optional().nullable(),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).int().positive('Cantidad debe ser mayor a 0'),
  PrecioUnitario: z.number({ required_error: 'PrecioUnitario es requerido' }).nonnegative('PrecioUnitario no puede ser negativo'),
  SubTotal: z.number().optional(),
  Total: z.number().optional(),
}).refine(
  (data) => data.RefaccionID || data.EquipoID || data.EquipoVirtualID,
  { message: 'Debe especificar RefaccionID, EquipoID o EquipoVirtualID', path: ['RefaccionID'] }
);

// Schema para encabezado de pedido (crear)
export const createPedidoSchema = z.object({
  ProveedorID: z.number({ required_error: 'ProveedorID es requerido' }),
  NumeroPedido: z.string().max(100).optional().nullable(),
  FechaPedido: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  FormaPago: z.enum(['CONTADO', 'CREDITO']).default('CREDITO'),
  AplicaIVA: z.boolean().default(true),
  TasaIVA: z.number().default(0.16),
  DiasCredito: z.number().optional().nullable(),
  FechaVencimientoCredito: z.string().optional().transform((val) => val ? new Date(val) : undefined).nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number().optional().nullable(),
  Detalles: z.array(createPedidoDetalleSchema).min(1, 'Debe incluir al menos un detalle'),
});

// Schema para detalle de pedido (actualizar)
export const updatePedidoDetalleSchema = z.object({
  PedidoDetalleID: z.number().optional(),
  RefaccionID: z.number().optional().nullable(),
  EquipoID: z.number().optional().nullable(),
  EquipoVirtualID: z.number().optional().nullable(),
  Cantidad: z.number().int().positive('Cantidad debe ser mayor a 0'),
  PrecioUnitario: z.number().nonnegative('PrecioUnitario no puede ser negativo'),
  SubTotal: z.number().optional(),
  Total: z.number().optional(),
}).refine(
  (data) => data.RefaccionID || data.EquipoID || data.EquipoVirtualID,
  { message: 'Debe especificar RefaccionID, EquipoID o EquipoVirtualID', path: ['RefaccionID'] }
);

// Schema para encabezado de pedido (actualizar)
export const updatePedidoSchema = z.object({
  ProveedorID: z.number().optional(),
  NumeroPedido: z.string().max(100).optional().nullable(),
  FechaPedido: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  FormaPago: z.enum(['CONTADO', 'CREDITO']).optional(),
  AplicaIVA: z.boolean().optional(),
  TasaIVA: z.number().optional(),
  DiasCredito: z.number().optional().nullable(),
  FechaVencimientoCredito: z.string().optional().transform((val) => val ? new Date(val) : undefined).nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number().optional().nullable(),
  Detalles: z.array(updatePedidoDetalleSchema).optional(),
  DetallesEliminar: z.array(z.number()).optional(),
});

// Schema para params
export const pedidoIdParamSchema = z.object({
  PedidoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para asociar factura
export const asociarFacturaSchema = z.object({
  FacturaID: z.number({ required_error: 'FacturaID es requerido' }),
});

// Schema para desasociar factura (params)
export const desasociarFacturaParamSchema = z.object({
  PedidoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
  FacturaID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Types
export type CreatePedidoDetalleDto = z.infer<typeof createPedidoDetalleSchema>;
export type CreatePedidoDto = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoDetalleDto = z.infer<typeof updatePedidoDetalleSchema>;
export type UpdatePedidoDto = z.infer<typeof updatePedidoSchema>;
export type AsociarFacturaDto = z.infer<typeof asociarFacturaSchema>;
