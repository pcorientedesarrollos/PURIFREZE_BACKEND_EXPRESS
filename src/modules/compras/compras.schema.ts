import { z } from 'zod';

// Schema para detalle de compra (crear)
export const createCompraDetalleSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }),
  PrecioUnitario: z.number({ required_error: 'PrecioUnitario es requerido' }),
  DescuentoPorcentaje: z.number({ required_error: 'DescuentoPorcentaje es requerido' }),
  DescuentoEfectivo: z.number({ required_error: 'DescuentoEfectivo es requerido' }),
  GastosOperativos: z.number({ required_error: 'GastosOperativos es requerido' }),
  GastosImportacion: z.number({ required_error: 'GastosImportacion es requerido' }),
  SubTotal: z.number({ required_error: 'SubTotal es requerido' }),
  Total: z.number({ required_error: 'Total es requerido' }),
});

// Schema para encabezado de compra (crear)
export const createCompraSchema = z.object({
  ProveedorID: z.number({ required_error: 'ProveedorID es requerido' }),
  CuentaBancariaID: z.number({ required_error: 'CuentaBancariaID es requerido' }),
  FechaCompra: z.string({ required_error: 'FechaCompra es requerida' }),
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
});

// Schema para detalle de compra (actualizar)
export const updateCompraDetalleSchema = z.object({
  CompraDetalleID: z.number().optional(),
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }),
  PrecioUnitario: z.number({ required_error: 'PrecioUnitario es requerido' }),
  DescuentoPorcentaje: z.number({ required_error: 'DescuentoPorcentaje es requerido' }),
  DescuentoEfectivo: z.number({ required_error: 'DescuentoEfectivo es requerido' }),
  GastosOperativos: z.number({ required_error: 'GastosOperativos es requerido' }),
  GastosImportacion: z.number({ required_error: 'GastosImportacion es requerido' }),
  SubTotal: z.number({ required_error: 'SubTotal es requerido' }),
  Total: z.number({ required_error: 'Total es requerido' }),
});

// Schema para encabezado de compra (actualizar)
export const updateCompraSchema = z.object({
  ProveedorID: z.number().optional(),
  CuentaBancariaID: z.number().optional(),
  FechaCompra: z.string().optional(),
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
});

// Schema para params
export const compraIdParamSchema = z.object({
  CompraEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Types
export type CreateCompraDetalleDto = z.infer<typeof createCompraDetalleSchema>;
export type CreateCompraDto = z.infer<typeof createCompraSchema>;
export type UpdateCompraDetalleDto = z.infer<typeof updateCompraDetalleSchema>;
export type UpdateCompraDto = z.infer<typeof updateCompraSchema>;
