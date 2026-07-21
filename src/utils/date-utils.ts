/**
 * Retorna la fecha actual a mediodía en hora local.
 * Evita el desfase UTC: new Date() en timezone UTC-6 a las 6pm
 * devuelve el día siguiente en UTC, lo que provoca fechas adelantadas en MySQL.
 * Usar mediodía local garantiza la misma fecha para cualquier timezone dentro de ±12h de UTC.
 */
export const localDate = (): Date => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
};
