/**
 * El hotel opera unicamente en hora de Colombia. Cualquier fecha/hora que se
 * muestre, compare o exporte en la app debe pasar por aqui: nunca confiar en
 * la zona horaria del navegador o del sistema donde corre el servidor,
 * porque ambos pueden estar en UTC (u otra zona) y desfasan lo que ve el
 * personal del hotel frente a lo que realmente paso en Bogota.
 */
export const ZONA_HOTEL = 'America/Bogota'

function partesFecha(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HOTEL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha)
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '01'
  return {
    anio: Number(obtener('year')),
    mes: Number(obtener('month')) - 1, // 0-indexado, igual que Date nativo
    dia: Number(obtener('day')),
  }
}

function partesHora(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_HOTEL,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)
  const obtener = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? '0')
  return { hora: obtener('hour'), minuto: obtener('minute'), segundo: obtener('second') }
}

/** Fecha (YYYY-MM-DD) del dia calendario en Bogota para el instante dado. */
export function fechaBogotaISO(fecha: Date | number = new Date()): string {
  const { anio, mes, dia } = partesFecha(fecha instanceof Date ? fecha : new Date(fecha))
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Año y mes (0-indexado, como Date nativo) del dia calendario en Bogota. */
export function anioMesBogota(fecha: Date = new Date()): { anio: number; mes: number } {
  const { anio, mes } = partesFecha(fecha)
  return { anio, mes }
}

export const formatoFechaBogota = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  timeZone: ZONA_HOTEL,
})

export const formatoFechaLargaBogota = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: ZONA_HOTEL,
})

export const formatoHoraBogota = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: ZONA_HOTEL,
})

export const formatoFechaHoraBogota = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: ZONA_HOTEL,
})

/**
 * Convierte un instante real a un Date "disfrazado" cuyos componentes UTC
 * coinciden con la hora de pared en Bogota. El formato .xlsx no guarda zona
 * horaria (es solo un numero serial): si le pasas el Date real, Excel lo
 * muestra segun la hora del computador donde se abrio el archivo. Pasando
 * por aqui, se ve igual en Bogota sin importar donde se abra.
 */
export function fechaExcelBogota(valor: string | number | Date | null): Date | null {
  if (valor === null) return null
  const fecha = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  const { anio, mes, dia } = partesFecha(fecha)
  const { hora, minuto, segundo } = partesHora(fecha)
  return new Date(Date.UTC(anio, mes, dia, hora, minuto, segundo))
}
