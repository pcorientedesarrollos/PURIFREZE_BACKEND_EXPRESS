import { z } from 'zod';

// Schema para detalle de compra (crear)
export const createCompraDetalleSchema = z.object({
  RefaccionID: z.number().optional().nullable(),
  EquipoID: z.number().optional().nullable(),
  EquipoVirtualID: z.number().optional().nullable(),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }),
  PrecioUnitario: z.number({ required_error: 'PrecioUnitario es requerido' }),
  DescuentoPorcentaje: z.number({ required_error: 'DescuentoPorcentaje es requerido' }),
  DescuentoEfectivo: z.number({ required_error: 'DescuentoEfectivo es requerido' }),
  GastosOperativos: z.number({ required_error: 'GastosOperativos es requerido' }),
  GastosImportacion: z.number({ required_error: 'GastosImportacion es requerido' }),
  SubTotal: z.number({ required_error: 'SubTotal es requerido' }),
  Total: z.number({ required_error: 'Total es requerido' }),
}).refine(
  (data) => data.RefaccionID || data.EquipoID || data.EquipoVirtualID,
  { message: 'Debe especificar RefaccionID, EquipoID o EquipoVirtualID', path: ['RefaccionID'] }
);

// Schema para encabezado de compra (crear)
export const createCompraSchema = z.object({
  ProveedorID: z.number({ required_error: 'ProveedorID es requerido' }),
  CuentaBancariaID: z.number().optional(), // Ahora opcional, solo requerido para CONTADO
  FechaCompra: z.string({ required_error: 'FechaCompra es requerida' }).transform((val) => new Date(val)),
  TotalBruto: z.number({ required_error: 'TotalBruto es requerido' }),
  TotalDescuentosPorcentaje: z.number({ required_error: 'TotalDescuentosPorcentaje es requerido' }),
  TotalDescuentoEfectivo: z.number({ required_error: 'TotalDescuentoEfectivo es requerido' }),
  TotalGastosOperativos: z.number({ required_error: 'TotalGastosOperativos es requerido' }),
  TotalGastosImportacion: z.number({ required_error: 'TotalGastosImportacion es requerido' }),
  TotalIVA: z.number({ required_error: 'TotalIVA es requerido' }),
  TotalNeto: z.number({ required_error: 'TotalNeto es requerido' }),
  UsuarioID: z.number().optional(),
  Estatus: z.string({ required_error: 'Estatus es requerido' }),
  MetodoPagoID: z.number().optional(),
  Detalles: z.array(createCompraDetalleSchema).min(1, 'Debe incluir al menos un detalle'),
  // Nuevos campos para sistema de ejes independientes
  FormaPago: z.enum(['CONTADO', 'CREDITO']).default('CREDITO'),
  DiasCredito: z.number().optional(),
  FechaVencimientoCredito: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  // Número de pedido del proveedor (ingresado por usuario)
  NumeroPedido: z.string().max(100).optional(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para detalle de compra (actualizar)
export const updateCompraDetalleSchema = z.object({
  CompraDetalleID: z.number().optional(),
  RefaccionID: z.number().optional().nullable(),
  EquipoID: z.number().optional().nullable(),
  EquipoVirtualID: z.number().optional().nullable(),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }),
  PrecioUnitario: z.number({ required_error: 'PrecioUnitario es requerido' }),
  DescuentoPorcentaje: z.number({ required_error: 'DescuentoPorcentaje es requerido' }),
  DescuentoEfectivo: z.number({ required_error: 'DescuentoEfectivo es requerido' }),
  GastosOperativos: z.number({ required_error: 'GastosOperativos es requerido' }),
  GastosImportacion: z.number({ required_error: 'GastosImportacion es requerido' }),
  SubTotal: z.number({ required_error: 'SubTotal es requerido' }),
  Total: z.number({ required_error: 'Total es requerido' }),
}).refine(
  (data) => data.RefaccionID || data.EquipoID || data.EquipoVirtualID,
  { message: 'Debe especificar RefaccionID, EquipoID o EquipoVirtualID', path: ['RefaccionID'] }
);

// Schema para encabezado de compra (actualizar)
export const updateCompraSchema = z.object({
  ProveedorID: z.number().optional(),
  CuentaBancariaID: z.number().optional(),
  FechaCompra: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  TotalBruto: z.number().optional(),
  TotalDescuentosPorcentaje: z.number().optional(),
  TotalDescuentoEfectivo: z.number().optional(),
  TotalGastosOperativos: z.number().optional(),
  TotalGastosImportacion: z.number().optional(),
  TotalIVA: z.number().optional(),
  TotalNeto: z.number().optional(),
  UsuarioID: z.number().optional(),
  Estatus: z.string().optional(),
  MetodoPagoID: z.number().optional(),
  Detalles: z.array(updateCompraDetalleSchema).optional(),
  DetallesEliminar: z.array(z.number()).optional(),
  // Nuevos campos para sistema de ejes independientes
  FormaPago: z.enum(['CONTADO', 'CREDITO']).optional(),
  DiasCredito: z.number().nullable().optional(),
  FechaVencimientoCredito: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  // Número de pedido del proveedor (ingresado por usuario)
  NumeroPedido: z.string().max(100).optional(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para params
export const compraIdParamSchema = z.object({
  CompraEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para aplicar descuentos desde modal de pagos
export const aplicarDescuentosSchema = z.object({
  DescuentoPorcentaje: z.number().min(0).max(100).optional(),
  DescuentoEfectivo: z.number().min(0).optional(),
}).refine(
  (data) => data.DescuentoPorcentaje !== undefined || data.DescuentoEfectivo !== undefined,
  { message: 'Debe especificar al menos un tipo de descuento (porcentaje o efectivo)' }
);

// Schema para actualizar factura desde modal de pagos
export const updateFacturaSchema = z.object({
  Factura: z.string().max(100).nullish(),
});

// Types
export type CreateCompraDetalleDto = z.infer<typeof createCompraDetalleSchema>;
export type CreateCompraDto = z.infer<typeof createCompraSchema>;
export type UpdateCompraDetalleDto = z.infer<typeof updateCompraDetalleSchema>;
export type UpdateCompraDto = z.infer<typeof updateCompraSchema>;
export type AplicarDescuentosDto = z.infer<typeof aplicarDescuentosSchema>;
export type UpdateFacturaDto = z.infer<typeof updateFacturaSchema>;
