const URL_AGENTE_CAJA = 'http://127.0.0.1:9111/abrir-cajon'

/**
 * Le pide al agente local (instalado en el PC de la caja, ver carpeta
 * caja-agente/ del repositorio) que abra el cajon de dinero. Si el agente
 * no esta instalado o no esta corriendo en este equipo (por ejemplo, se
 * esta cobrando desde un celular o desde otro PC), simplemente se ignora.
 */
export function abrirCajonEfectivo(): void {
  fetch(URL_AGENTE_CAJA, { method: 'POST', mode: 'cors' }).catch(() => {
    // Agente no instalado/corriendo en este equipo: no bloquea la venta.
  })
}
