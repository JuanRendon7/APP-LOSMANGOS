import ExcelJS from 'exceljs'
import { fechaExcelBogota } from './tiempo'

/** Colores corporativos Hotel Los Mangos (equivalentes hex de los tokens oklch de index.css). */
export const PALETA_EXCEL = {
  encabezadoFondo: 'FF243A0D',
  encabezadoTexto: 'FFEBF8E8',
  acento: 'FFB38236',
  bandaAlterna: 'FFF3F8F0',
  bordeSuave: 'FFDDE3D6',
  textoPrincipal: 'FF160E0C',
  textoMuted: 'FF7C6556',
  positivo: 'FF005932',
  positivoFondo: 'FFC9EFD9',
  negativo: 'FF901117',
  negativoFondo: 'FFFFDCD6',
} as const

export type FormatoColumnaExcel = 'texto' | 'entero' | 'moneda' | 'fecha' | 'fechahora'

export interface ColumnaExcel {
  titulo: string
  ancho?: number
  formato?: FormatoColumnaExcel
  totalizar?: boolean
  colorPorValor?: (valor: unknown) => string | undefined
}

export interface OpcionesExcel {
  nombreArchivo: string
  hoja?: string
  titulo: string
  subtitulo?: string
  columnas: ColumnaExcel[]
  filas: Array<Array<string | number | Date | null>>
}

const FORMATOS_NUMERO: Partial<Record<FormatoColumnaExcel, string>> = {
  entero: '#,##0',
  moneda: '"$"#,##0',
  fecha: 'dd/mm/yyyy',
  fechahora: 'dd/mm/yyyy hh:mm',
}

function convertirValor(valor: string | number | Date | null, formato: FormatoColumnaExcel) {
  if (valor === null || valor === '') return null
  if (formato === 'fecha' || formato === 'fechahora') {
    // xlsx no guarda zona horaria: sin esta conversion, el archivo se ve con
    // la hora del computador donde se abre en vez de la hora de Bogota.
    return fechaExcelBogota(valor)
  }
  if (formato === 'moneda' || formato === 'entero') {
    if (typeof valor === 'number') return valor
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : null
  }
  return String(valor)
}

function anchoAutomatico(titulo: string, valores: string[]): number {
  const masLargo = valores.reduce((max, v) => Math.max(max, v.length), titulo.length)
  return Math.min(Math.max(masLargo + 2, 11), 42)
}

export async function descargarExcel(opciones: OpcionesExcel): Promise<void> {
  const { nombreArchivo, hoja = 'Datos', titulo, subtitulo, columnas, filas } = opciones

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Hotel Los Mangos'
  workbook.created = new Date()

  const filaEncabezado = subtitulo ? 3 : 2
  const numColumnas = columnas.length

  const sheet = workbook.addWorksheet(hoja.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: filaEncabezado }],
    properties: { defaultRowHeight: 18 },
  })

  sheet.mergeCells(1, 1, 1, numColumnas)
  const celdaTitulo = sheet.getCell(1, 1)
  celdaTitulo.value = titulo
  celdaTitulo.font = { name: 'Calibri', size: 15, bold: true, color: { argb: PALETA_EXCEL.encabezadoTexto } }
  celdaTitulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  celdaTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_EXCEL.encabezadoFondo } }
  sheet.getRow(1).height = 30

  if (subtitulo) {
    sheet.mergeCells(2, 1, 2, numColumnas)
    const celdaSub = sheet.getCell(2, 1)
    celdaSub.value = subtitulo
    celdaSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: PALETA_EXCEL.textoMuted } }
    celdaSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    celdaSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_EXCEL.bandaAlterna } }
    sheet.getRow(2).height = 20
  }

  const filaHeaderRow = sheet.getRow(filaEncabezado)
  columnas.forEach((columna, indice) => {
    const celda = filaHeaderRow.getCell(indice + 1)
    celda.value = columna.titulo
    celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETA_EXCEL.encabezadoTexto } }
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_EXCEL.encabezadoFondo } }
    celda.border = {
      bottom: { style: 'medium', color: { argb: PALETA_EXCEL.acento } },
      left: { style: 'thin', color: { argb: PALETA_EXCEL.encabezadoFondo } },
      right: { style: 'thin', color: { argb: PALETA_EXCEL.encabezadoFondo } },
    }
  })
  filaHeaderRow.height = 22

  const alineacionPorFormato: Record<FormatoColumnaExcel, 'left' | 'right' | 'center'> = {
    texto: 'left',
    entero: 'right',
    moneda: 'right',
    fecha: 'center',
    fechahora: 'center',
  }

  filas.forEach((fila, indiceFila) => {
    const numeroFila = filaEncabezado + 1 + indiceFila
    const filaHoja = sheet.getRow(numeroFila)
    const esBanda = indiceFila % 2 === 1

    columnas.forEach((columna, indiceColumna) => {
      const formato = columna.formato ?? 'texto'
      const valorCrudo = fila[indiceColumna] ?? null
      const valor = convertirValor(valorCrudo, formato)
      const celda = filaHoja.getCell(indiceColumna + 1)
      celda.value = valor
      const formatoNumero = FORMATOS_NUMERO[formato]
      if (formatoNumero) celda.numFmt = formatoNumero
      celda.alignment = { vertical: 'middle', horizontal: alineacionPorFormato[formato] }
      celda.border = {
        top: { style: 'thin', color: { argb: PALETA_EXCEL.bordeSuave } },
        bottom: { style: 'thin', color: { argb: PALETA_EXCEL.bordeSuave } },
        left: { style: 'thin', color: { argb: PALETA_EXCEL.bordeSuave } },
        right: { style: 'thin', color: { argb: PALETA_EXCEL.bordeSuave } },
      }
      if (esBanda) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_EXCEL.bandaAlterna } }
      }
      const colorTexto = columna.colorPorValor?.(valorCrudo)
      celda.font = {
        name: 'Calibri',
        size: 10.5,
        color: { argb: colorTexto ?? PALETA_EXCEL.textoPrincipal },
        bold: Boolean(colorTexto),
      }
    })
  })

  const hayTotales = columnas.some((c) => c.totalizar)
  if (hayTotales && filas.length > 0) {
    const numeroFilaTotal = filaEncabezado + 1 + filas.length
    const filaTotal = sheet.getRow(numeroFilaTotal)
    columnas.forEach((columna, indiceColumna) => {
      const celda = filaTotal.getCell(indiceColumna + 1)
      celda.border = { top: { style: 'double', color: { argb: PALETA_EXCEL.encabezadoFondo } } }
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_EXCEL.acento } }
      if (indiceColumna === 0) {
        celda.value = 'Total'
        celda.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: PALETA_EXCEL.encabezadoTexto } }
        celda.alignment = { vertical: 'middle', horizontal: 'left' }
        return
      }
      if (columna.totalizar) {
        const formato = columna.formato ?? 'entero'
        const suma = filas.reduce((acc, fila) => {
          const valor = convertirValor(fila[indiceColumna] ?? null, formato)
          return acc + (typeof valor === 'number' ? valor : 0)
        }, 0)
        celda.value = suma
        celda.numFmt = FORMATOS_NUMERO[formato] ?? '#,##0'
        celda.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: PALETA_EXCEL.encabezadoTexto } }
        celda.alignment = { vertical: 'middle', horizontal: 'right' }
      } else {
        celda.value = ''
      }
    })
    filaTotal.height = 20
  }

  if (filas.length > 0) {
    sheet.autoFilter = {
      from: { row: filaEncabezado, column: 1 },
      to: { row: filaEncabezado, column: numColumnas },
    }
  }

  columnas.forEach((columna, indice) => {
    const valoresTexto = filas.map((fila) => String(fila[indice] ?? ''))
    sheet.getColumn(indice + 1).width = columna.ancho ?? anchoAutomatico(columna.titulo, valoresTexto)
  })

  sheet.pageSetup = {
    orientation: numColumnas > 7 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
