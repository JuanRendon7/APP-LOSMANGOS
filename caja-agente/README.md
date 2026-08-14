# Agente de caja (apertura automatica del cajon DIG-KR330)

Programa chiquito que corre en segundo plano en el PC de la caja
(DIG-156WV3). Cuando se cobra una venta en efectivo en la app, la pagina
web le avisa a este agente y el agente le manda a la impresora de tickets
la señal para que abra el cajon.

Es un solo archivo (`dist\caja-agente.exe`), no hace falta instalar Python
ni nada mas. Se instala **una sola vez** en el PC de la caja.

## Por que hace falta esto

El cajon (DIG-KR330) no se conecta directo al computador: va cableado a la
impresora de tickets, y es la impresora la que lo abre cuando recibe una
señal especial. Una pagina web no puede hablarle directo al hardware, por
eso este agente corre aparte en el mismo PC y hace de puente.

## Instalacion (en el PC de la caja, una sola vez)

1. En el PC de la caja, entrar a:
   `https://github.com/JuanRendon7/APP-LOSMANGOS/raw/main/caja-agente/dist/caja-agente.exe`
   y descargar el archivo (se guarda normalmente en la carpeta Descargas).
2. Doble click en `caja-agente.exe`.
3. Se abre una ventanita. Si en el PC solo hay una impresora instalada, ya
   va a aparecer seleccionada; si hay varias, elegir ahi la que se usa para
   imprimir los tickets/recibos.
4. Click en **"Instalar y activar"**. Con eso queda listo: el cajon se
   abrira solo cada vez que se cobre en efectivo, y el programa arranca
   solo cada vez que se prenda el computador (no hay que volver a abrirlo).
5. (Opcional) Click en **"Probar apertura del cajon"** para confirmar ahi
   mismo que el cajon responde.

Si Windows muestra un aviso de "Windows protegio su PC" al abrir el .exe
(por venir de internet), click en **"Mas informacion"** y despues
**"Ejecutar de todas formas"**.

## Ya esta instalado y quiero revisar algo

Doble click en `caja-agente.exe` de nuevo: en vez del instalador, muestra
el estado (impresora configurada, si esta activo) y dos botones — "Probar
apertura del cajon" y "Cambiar impresora" — para casos como que hayan
cambiado la impresora de tickets.

## Si el cajon no abre

- Confirmar con "Probar apertura del cajon" — el mensaje que muestra ahi es
  el error real (por ejemplo, si la impresora esta apagada o sin papel).
- Revisar el archivo `caja_agente.log`, en
  `%LOCALAPPDATA%\CajaAgenteLosMangos\caja_agente.log` — ahi queda
  registrado cada intento.
- Algunos cajones estan cableados al pin 5 en vez del pin 2 del conector.
  Si no abre, en `%LOCALAPPDATA%\CajaAgenteLosMangos\config.json` cambiar
  `"pin": 0` por `"pin": 1` y volver a abrir `caja-agente.exe` (recoge el
  cambio sin reinstalar nada).

## Reconstruir el .exe (solo si se edita caja_agent.py)

```
pip install pywin32 pyinstaller
python -m PyInstaller --onefile --noconsole --name caja-agente --distpath dist --workpath build --specpath . caja_agent.py
```
