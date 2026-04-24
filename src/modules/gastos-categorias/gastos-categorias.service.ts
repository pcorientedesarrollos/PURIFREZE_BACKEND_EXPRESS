import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateGastoCategoriaDto, UpdateGastoCategoriaDto } from './gastos-categorias.schema';

const CATEGORIAS_DEFAULT = [
    { Nombre: 'Materiales y Suministros',    Descripcion: 'Compra de materiales, insumos y suministros para operaciones', Grupo: 'OPERATIVO' },
    { Nombre: 'Herramientas y Equipos',      Descripcion: 'Adquisición de herramientas o equipos menores',                 Grupo: 'OPERATIVO' },
    { Nombre: 'Combustible y Transporte',    Descripcion: 'Gasolina, diesel, peajes, fletes y traslados',                  Grupo: 'OPERATIVO' },
    { Nombre: 'Mantenimiento y Reparaciones',Descripcion: 'Mantenimiento preventivo y correctivo de equipos e instalaciones', Grupo: 'OPERATIVO' },
    { Nombre: 'Servicios Externos',          Descripcion: 'Subcontratación de servicios y mano de obra externa',           Grupo: 'OPERATIVO' },
    { Nombre: 'Nómina y Salarios',           Descripcion: 'Pagos de nómina, sueldos y compensaciones al personal',        Grupo: 'FINANCIERO' },
    { Nombre: 'Impuestos y Contribuciones',  Descripcion: 'ISR, IVA, IMSS, INFONAVIT y otras obligaciones fiscales',      Grupo: 'FINANCIERO' },
    { Nombre: 'Servicios Financieros',       Descripcion: 'Comisiones bancarias, intereses y cargos financieros',         Grupo: 'FINANCIERO' },
    { Nombre: 'Arrendamiento y Renta',       Descripcion: 'Renta de inmuebles, locales o equipos',                        Grupo: 'FINANCIERO' },
    { Nombre: 'Papelería y Oficina',         Descripcion: 'Material de oficina, papelería e impresiones',                 Grupo: 'ADMINISTRATIVO' },
    { Nombre: 'Servicios Digitales y Software', Descripcion: 'Suscripciones y licencias de software',                    Grupo: 'ADMINISTRATIVO' },
    { Nombre: 'Comunicaciones',              Descripcion: 'Internet, telefonía, mensajería y correo',                     Grupo: 'ADMINISTRATIVO' },
    { Nombre: 'Publicidad y Marketing',      Descripcion: 'Promoción, publicidad y redes sociales',                       Grupo: 'ADMINISTRATIVO' },
    { Nombre: 'Gastos Imprevistos',          Descripcion: 'Gastos no planeados o de emergencia',                          Grupo: 'EXTRAORDINARIO' },
    { Nombre: 'Otros',                       Descripcion: 'Gastos no clasificados en otras categorías',                   Grupo: 'EXTRAORDINARIO' },
];

class GastosCategoriasService {
    async findAll() {
        const data = await prisma.gastos_categorias.findMany({
            where: { IsActive: true },
            orderBy: [{ Grupo: 'asc' }, { Nombre: 'asc' }],
        });
        return { message: 'Categorías de gastos obtenidas', data };
    }

    async findAllAdmin() {
        const data = await prisma.gastos_categorias.findMany({
            orderBy: [{ Grupo: 'asc' }, { Nombre: 'asc' }],
        });
        return { message: 'Categorías de gastos obtenidas', data };
    }

    async create(data: CreateGastoCategoriaDto) {
        const categoria = await prisma.gastos_categorias.create({
            data: { ...data, IsActive: true },
        });
        return { message: 'Categoría creada', data: categoria };
    }

    async update(CategoriaGastoID: number, data: UpdateGastoCategoriaDto) {
        const exist = await prisma.gastos_categorias.findUnique({ where: { CategoriaGastoID } });
        if (!exist) throw new HttpError('Categoría no encontrada', 404);

        const updated = await prisma.gastos_categorias.update({
            where: { CategoriaGastoID },
            data,
        });
        return { message: 'Categoría actualizada', data: updated };
    }

    async baja(CategoriaGastoID: number) {
        const exist = await prisma.gastos_categorias.findUnique({ where: { CategoriaGastoID } });
        if (!exist) throw new HttpError('Categoría no encontrada', 404);
        if (!exist.IsActive) throw new HttpError('La categoría ya está inactiva', 300);

        const updated = await prisma.gastos_categorias.update({
            where: { CategoriaGastoID },
            data: { IsActive: false },
        });
        return { message: 'Categoría desactivada', data: updated };
    }

    async activar(CategoriaGastoID: number) {
        const exist = await prisma.gastos_categorias.findUnique({ where: { CategoriaGastoID } });
        if (!exist) throw new HttpError('Categoría no encontrada', 404);
        if (exist.IsActive) throw new HttpError('La categoría ya está activa', 300);

        const updated = await prisma.gastos_categorias.update({
            where: { CategoriaGastoID },
            data: { IsActive: true },
        });
        return { message: 'Categoría activada', data: updated };
    }

    async seed() {
        const existentes = await prisma.gastos_categorias.findMany({
            select: { Nombre: true },
        });
        const nombresExistentes = new Set(existentes.map(c => c.Nombre));
        const nuevas = CATEGORIAS_DEFAULT.filter(c => !nombresExistentes.has(c.Nombre));

        if (nuevas.length === 0) {
            return { message: 'Las categorías default ya existen', data: { insertadas: 0 } };
        }

        await prisma.gastos_categorias.createMany({
            data: nuevas.map(c => ({ ...c, IsActive: true })),
        });

        return { message: `${nuevas.length} categorías insertadas`, data: { insertadas: nuevas.length } };
    }
}

export const gastosCategoriasService = new GastosCategoriasService();
