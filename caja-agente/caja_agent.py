"""Agente local para abrir el cajon de dinero (DIG-KR330) desde la app web.

La caja registradora no se conecta directamente al PC: va cableada a la
impresora de tickets (puerto RJ11/RJ12), y esa impresora si esta conectada
por USB al computador con Windows. La unica forma de "hacerla sonar" es
mandarle a la impresora el comando ESC/POS de pulso electrico como datos
RAW, sin pasar por el render normal de una pagina impresa.

Un navegador no puede escribirle bytes crudos a una impresora Windows, asi
que este programa corre aparte, en el mismo PC de la caja, escuchando en
127.0.0.1. Cuando la app web cobra una venta en efectivo, le pide a este
agente (por HTTP, en la misma maquina) que abra el cajon.

Este mismo archivo sirve dos propositos, para que instalarlo sea con un
solo doble click:

- Si se abre a mano (doble click) y todavia no esta configurado: muestra
  una ventana sencilla para elegir la impresora e instalarse solo (queda
  arrancando cada vez que se prenda el PC).
- Si ya esta configurado y se abre a mano: muestra el estado y deja
  probar la apertura del cajon o cambiar la impresora.
- Si se lanza con --arranque-automatico (lo hace Windows solo, via el
  Programador de tareas): no muestra nada, corre en segundo plano
  atendiendo los pedidos de la app.
"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from logging.handlers import RotatingFileHandler
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    import win32print
except ImportError:
    win32print = None

NOMBRE_TAREA = "CajaAgenteLosMangos"
PUERTO = 9111
URL_SALUD = f"http://127.0.0.1:{PUERTO}/salud"
URL_ABRIR = f"http://127.0.0.1:{PUERTO}/abrir-cajon"

CARPETA_DATOS = Path.home() / "AppData" / "Local" / "CajaAgenteLosMangos"
ARCHIVO_CONFIG = CARPETA_DATOS / "config.json"
ARCHIVO_LOG = CARPETA_DATOS / "caja_agente.log"

CONFIG_POR_DEFECTO = {"impresora": None, "pin": 0}

# Comando ESC/POS para generar un pulso electrico en el conector del cajon:
# ESC p m t1 t2  ->  27 112 pin on off  (on/off en unidades de 2 ms)
PULSO_CAJON = {
    0: bytes([0x1B, 0x70, 0x00, 0x19, 0xFA]),
    1: bytes([0x1B, 0x70, 0x01, 0x19, 0xFA]),
}

logger = logging.getLogger("caja_agente")


def ruta_ejecutable_actual() -> str:
    if getattr(sys, "frozen", False):
        return sys.executable
    return str(Path(__file__).resolve())


def configurar_logging() -> None:
    CARPETA_DATOS.mkdir(parents=True, exist_ok=True)
    logger.setLevel(logging.INFO)
    formato = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    archivo = RotatingFileHandler(ARCHIVO_LOG, maxBytes=1_000_000, backupCount=2, encoding="utf-8")
    archivo.setFormatter(formato)
    logger.addHandler(archivo)


def cargar_config() -> dict:
    if not ARCHIVO_CONFIG.exists():
        return dict(CONFIG_POR_DEFECTO)
    try:
        return {**CONFIG_POR_DEFECTO, **json.loads(ARCHIVO_CONFIG.read_text(encoding="utf-8"))}
    except (OSError, json.JSONDecodeError):
        return dict(CONFIG_POR_DEFECTO)


def guardar_config(config: dict) -> None:
    CARPETA_DATOS.mkdir(parents=True, exist_ok=True)
    ARCHIVO_CONFIG.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")


def listar_impresoras() -> list[str]:
    if win32print is None:
        return []
    impresoras = win32print.EnumPrinters(
        win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
    )
    return [nombre for _flags, _descripcion, nombre, _comentario in impresoras]


def abrir_cajon(nombre_impresora: str, pin: int) -> None:
    if win32print is None:
        raise RuntimeError("Falta pywin32")
    pulso = PULSO_CAJON.get(pin, PULSO_CAJON[0])
    identificador = win32print.OpenPrinter(nombre_impresora)
    try:
        trabajo = win32print.StartDocPrinter(identificador, 1, ("Abrir cajon", None, "RAW"))
        try:
            win32print.StartPagePrinter(identificador)
            win32print.WritePrinter(identificador, pulso)
            win32print.EndPagePrinter(identificador)
        finally:
            win32print.EndDocPrinter(identificador)
        logger.info("Pulso de apertura enviado a '%s' (trabajo %s)", nombre_impresora, trabajo)
    finally:
        win32print.ClosePrinter(identificador)


def registrar_arranque_automatico() -> None:
    exe = ruta_ejecutable_actual()
    subprocess.run(
        [
            "schtasks",
            "/create",
            "/tn",
            NOMBRE_TAREA,
            "/tr",
            f'"{exe}" --arranque-automatico',
            "/sc",
            "onlogon",
            "/rl",
            "limited",
            "/f",
        ],
        check=True,
        capture_output=True,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )


def agente_esta_activo() -> bool:
    try:
        with urlopen(URL_SALUD, timeout=2):
            return True
    except (URLError, HTTPError, OSError):
        return False


def lanzar_agente_en_segundo_plano() -> None:
    subprocess.Popen(
        [ruta_ejecutable_actual(), "--arranque-automatico"],
        creationflags=subprocess.CREATE_NO_WINDOW,
        close_fds=True,
    )


def probar_apertura() -> tuple[bool, str]:
    peticion = Request(URL_ABRIR, method="POST", data=b"")
    try:
        with urlopen(peticion, timeout=5) as respuesta:
            cuerpo = json.loads(respuesta.read().decode("utf-8"))
    except HTTPError as exc:
        # El servidor respondio con un error (ej. impresora no configurada o
        # fallo al imprimir): traer el mensaje real en vez de uno generico.
        try:
            cuerpo = json.loads(exc.read().decode("utf-8"))
        except (OSError, json.JSONDecodeError):
            return False, f"Error del agente (HTTP {exc.code})"
        return False, cuerpo.get("error", f"Error del agente (HTTP {exc.code})")
    except (URLError, OSError) as exc:
        return False, f"No se pudo contactar al agente: {exc}"
    if cuerpo.get("ok"):
        return True, "Listo, se envio la señal de apertura."
    return False, cuerpo.get("error", "Error desconocido")


class Manejador(BaseHTTPRequestHandler):
    def log_message(self, formato: str, *args) -> None:
        logger.info("%s - %s", self.address_string(), formato % args)

    def _cors(self) -> None:
        origen = self.headers.get("Origin", "*")
        self.send_header("Access-Control-Allow-Origin", origen)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, status: int, cuerpo: dict) -> None:
        datos = json.dumps(cuerpo, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/salud"):
            config = cargar_config()
            self._json(200, {"ok": True, "agente": "caja-agente", "impresora": config.get("impresora")})
            return
        self._json(404, {"ok": False, "error": "Ruta no encontrada"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/abrir-cajon":
            self._json(404, {"ok": False, "error": "Ruta no encontrada"})
            return
        config = cargar_config()
        impresora = config.get("impresora")
        if not impresora:
            logger.error("Todavia no se ha configurado la impresora")
            self._json(500, {"ok": False, "error": "El agente todavia no esta configurado"})
            return
        try:
            abrir_cajon(impresora, int(config.get("pin", 0)))
        except Exception as exc:  # noqa: BLE001 - se reporta tal cual al frontend/log
            logger.exception("No se pudo abrir el cajon")
            self._json(500, {"ok": False, "error": str(exc)})
            return
        self._json(200, {"ok": True})


def correr_servidor() -> None:
    configurar_logging()
    servidor = ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador)
    logger.info("Agente de caja escuchando en http://127.0.0.1:%s", PUERTO)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        logger.info("Agente detenido")


# --------------------------------------------------------------------------
# Interfaz grafica (solo cuando se abre a mano, con doble click)
# --------------------------------------------------------------------------


def ejecutar_interfaz() -> None:
    import tkinter as tk
    from tkinter import messagebox

    if win32print is None:
        tk.Tk().withdraw()
        messagebox.showerror("Agente de caja", "Este programa necesita el modulo pywin32 y no se encontro.")
        return

    ventana = tk.Tk()
    ventana.title("Caja registradora - Hotel y Restaurante Los Mangos")
    ventana.geometry("460x380")
    ventana.resizable(False, False)

    contenedor = tk.Frame(ventana, padx=20, pady=16)
    contenedor.pack(fill="both", expand=True)

    titulo = tk.Label(contenedor, font=("Segoe UI", 13, "bold"))
    titulo.pack(anchor="w")
    subtitulo = tk.Label(contenedor, font=("Segoe UI", 10), wraplength=420, justify="left")
    subtitulo.pack(anchor="w", pady=(6, 10))
    estado = tk.Label(contenedor, font=("Segoe UI", 10), wraplength=420, justify="left")
    estado.pack(anchor="w", pady=(0, 8))
    zona_dinamica = tk.Frame(contenedor)
    zona_dinamica.pack(fill="x")

    def mostrar_estado(mensaje: str, ok: bool | None = None) -> None:
        color = "#15803d" if ok else ("#b91c1c" if ok is False else "#374151")
        estado.config(text=mensaje, fg=color)

    def limpiar_zona_dinamica() -> None:
        for widget in zona_dinamica.winfo_children():
            widget.destroy()

    def mostrar_selector() -> None:
        limpiar_zona_dinamica()
        titulo.config(text="Apertura automatica del cajon")
        subtitulo.config(text="Selecciona la impresora de tickets conectada a la caja:")
        mostrar_estado("")

        impresoras = listar_impresoras()
        if not impresoras:
            mostrar_estado(
                "No se detecto ninguna impresora instalada en este equipo. "
                "Instala primero el driver de la impresora de tickets y vuelve a abrir este programa.",
                ok=False,
            )
            return

        lista = tk.Listbox(zona_dinamica, height=6, exportselection=False, font=("Segoe UI", 10))
        for nombre in impresoras:
            lista.insert("end", nombre)
        lista.pack(fill="x", pady=(0, 10))
        lista.select_set(0)

        def instalar() -> None:
            if not lista.curselection():
                messagebox.showwarning("Caja registradora", "Selecciona una impresora de la lista.")
                return
            nombre = lista.get(lista.curselection()[0])
            guardar_config({"impresora": nombre, "pin": 0})
            try:
                registrar_arranque_automatico()
            except (subprocess.CalledProcessError, OSError) as exc:
                mostrar_estado(f"No se pudo dejar el arranque automatico activado: {exc}", ok=False)
                return
            if not agente_esta_activo():
                lanzar_agente_en_segundo_plano()
            mostrar_gestion(recien_instalado=True)

        tk.Button(
            zona_dinamica, text="Instalar y activar", font=("Segoe UI", 10, "bold"), command=instalar
        ).pack(anchor="w")

    def mostrar_gestion(recien_instalado: bool = False) -> None:
        limpiar_zona_dinamica()
        config = cargar_config()
        titulo.config(text="Agente de caja")
        subtitulo.config(text=f"Impresora configurada: {config.get('impresora')}")

        if recien_instalado:
            mostrar_estado(
                "Listo. Desde ahora el cajon se abre solo cada vez que cobres en efectivo, "
                "y el agente arranca solo cada vez que se prenda el computador.",
                ok=True,
            )
        elif agente_esta_activo():
            mostrar_estado("El agente esta activo y funcionando.", ok=True)
        else:
            lanzar_agente_en_segundo_plano()
            mostrar_estado("El agente no estaba corriendo, se acaba de iniciar.", ok=True)

        def probar() -> None:
            ok, mensaje = probar_apertura()
            mostrar_estado(mensaje, ok=ok)

        marco_botones = tk.Frame(zona_dinamica)
        marco_botones.pack(anchor="w", pady=(4, 0))
        tk.Button(marco_botones, text="Probar apertura del cajon", command=probar).pack(side="left")
        tk.Button(marco_botones, text="Cambiar impresora", command=mostrar_selector).pack(
            side="left", padx=(8, 0)
        )

    if cargar_config().get("impresora"):
        mostrar_gestion()
    else:
        mostrar_selector()

    tk.Button(contenedor, text="Cerrar", command=ventana.destroy).pack(side="bottom", anchor="e", pady=(16, 0))

    ventana.mainloop()


def main() -> None:
    if "--arranque-automatico" in sys.argv:
        correr_servidor()
        return

    configurar_logging()
    ejecutar_interfaz()


if __name__ == "__main__":
    main()
