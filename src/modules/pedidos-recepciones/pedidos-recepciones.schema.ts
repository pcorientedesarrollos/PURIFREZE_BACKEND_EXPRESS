import { z } from 'zod';

// Schema de UN renglon recibido (un elemento del array Detalles)
export const createPedidoRecepcionDetalleSchema = z.object({
  PedidoDetalleID: z.number({ required_error: 'PedidoDetalleID requerido' }),
  CantidadRecibida: z.number({ required_error: 'Cantidad recibida es requerida' }).positive('Debe ser mayor a 0'),
});

// Schema del body completo para crear una recepcion
export const createPedidoRecepcionSchema = z.object({
  PedidoID: z.number({ required_error: 'PedidoID es requerido' }),
  FechaRecepcion: z.string().optional(),
  NumeroFactura: z.string().max(100).optional(),
  Observaciones: z.string().max(500).optional(),
  UsuarioID: z.number().optional(),
  Detalles: z.array(createPedidoRecepcionDetalleSchema).min(1, 'Debe incluir al menos un detalle'),
});

// Schema para el parametro :PedidoID de la URL
export const pedidoIdParamSchema = z.object({
  PedidoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para el parametro :PedidoRecepcionID de la URL
export const pedidoRecepcionIdParamSchema = z.object({
  PedidoRecepcionID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para query params del reporte de entregas
export const reporteQuerySchema = z.object({
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  proveedorId: z.string().regex(/^\d+$/, 'proveedorId debe ser un número').transform(Number).optional(),
  tieneFactura: z.enum(['si', 'no', 'todos']).optional().default('todos'),
});

// Types inferidos (lo que tu service va a recibir, ya validado)
export type CreatePedidoRecepcionDetalleDto = z.infer<typeof createPedidoRecepcionDetalleSchema>;
export type CreatePedidoRecepcionDto = z.infer<typeof createPedidoRecepcionSchema>;
export type ReporteQueryDto = z.infer<typeof reporteQuerySchema>;
