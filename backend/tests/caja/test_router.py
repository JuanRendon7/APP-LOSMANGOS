from datetime import date

import pytest

from src.tarifas.models import Temporada
from tests.conftest import auth_headers, token_para


@pytest.fixture(autouse=True)
def _tarifa_base(db_session):
    db_session.add(
        Temporada(
            nombre="Tarifa de pruebas caja",
            fecha_inicio=date(2026, 8, 1),
            fecha_fin=date(2026, 12, 31),
            precio_noche=100000,
        )
    )
    db_session.flush()


def _habitacion_por_numero(client, headers, numero):
    resp = client.get("/habitaciones", headers=headers)
    habitaciones = {h["numero"]: h for h in resp.json()}
    return habitaciones[numero]


def _crear_reserva_con_checkin(client, headers, numero_habitacion, cedula):
    habitacion = _habitacion_por_numero(client, headers, numero_habitacion)
    crear = client.post(
        "/reservas",
        headers=headers,
        json={
            "id_habitacion": habitacion["id_habitacion"],
            "fecha_checkin_prevista": "2026-09-01",
            "fecha_checkout_prevista": "2026-09-03",
            "nombre": "Huesped Caja",
            "cedula": cedula,
            "contacto": "3000000000",
        },
    )
    assert crear.status_code == 201, crear.text
    reserva = crear.json()
    checkin = client.post(
        f"/reservas/{reserva['id_reserva']}/check-in", headers=headers
    )
    assert checkin.status_code == 200, checkin.text
    return checkin.json()


def _crear_producto_bar(client, headers, codigo, stock=10):
    resp = client.post(
        "/productos-bar",
        headers=headers,
        json={
            "nombre": "Cerveza",
            "codigo_barras": codigo,
            "precio_costo": 2000,
            "precio_venta": 5000,
            "stock": stock,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crear_producto_restaurante(client, headers, nombre="Sandwich", precio=15000):
    resp = client.post(
        "/productos-restaurante",
        headers=headers,
        json={"nombre": nombre, "precio_venta": precio},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crear_mesa(client, headers, nombre):
    resp = client.post(
        "/mesas", headers=headers, json={"nombre": nombre, "capacidad": 4}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _abrir_turno(client, headers, monto_apertura=100000):
    resp = client.post(
        "/caja/turnos", headers=headers, json={"monto_apertura": monto_apertura}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_abrir_turno(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    turno = _abrir_turno(client, headers, 50000)
    assert turno["estado"] == "ABIERTO"
    assert turno["monto_apertura"] == 50000
    assert turno["monto_esperado_efectivo"] == 50000


def test_no_se_puede_abrir_dos_turnos_a_la_vez(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    resp = client.post(
        "/caja/turnos", headers=headers, json={"monto_apertura": 20000}
    )
    assert resp.status_code == 422


def test_registrar_gasto_sin_turno_abierto_falla(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    resp = client.post(
        "/caja/gastos",
        headers=headers,
        json={"concepto": "Hielo", "monto": 10000},
    )
    assert resp.status_code == 422


def test_cobrar_habitacion_hace_checkout_y_suma_consumo(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    reserva = _crear_reserva_con_checkin(client, headers, "102", "1200000001")
    producto = _crear_producto_bar(client, headers, "9100001", stock=10)
    consumo = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "BAR",
            "id_producto": producto["id_producto"],
            "cantidad": 2,
        },
    )
    assert consumo.status_code == 201, consumo.text

    venta = client.post(
        "/caja/ventas/habitacion",
        headers=headers,
        json={"id_reserva": reserva["id_reserva"], "metodo_pago": "EFECTIVO"},
    )
    assert venta.status_code == 201, venta.text
    datos = venta.json()
    assert datos["origen"] == "HABITACION"
    assert datos["monto"] == reserva["precio_total"] + 2 * 5000

    habitacion = _habitacion_por_numero(client, headers, "102")
    assert habitacion["estado"] == "LIMPIEZA"


def test_cobrar_pedido_lo_cierra_y_libera_la_mesa(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    mesa = _crear_mesa(client, headers, "Mesa Caja 1")
    producto = _crear_producto_restaurante(client, headers, "Cerdo", 20000)

    crear = client.post("/pedidos", headers=headers, json={"id_mesa": mesa["id_mesa"]})
    pedido = crear.json()
    client.post(
        f"/pedidos/{pedido['id_pedido']}/items",
        headers=headers,
        json={"id_producto": producto["id_producto"], "cantidad": 2},
    )

    venta = client.post(
        "/caja/ventas/pedido",
        headers=headers,
        json={"id_pedido": pedido["id_pedido"], "metodo_pago": "TARJETA"},
    )
    assert venta.status_code == 201, venta.text
    assert venta.json()["monto"] == 40000

    mesas = client.get("/mesas", headers=headers).json()
    mesa_actual = next(m for m in mesas if m["id_mesa"] == mesa["id_mesa"])
    assert mesa_actual["estado"] == "LIBRE"


def test_venta_mostrador_bar_descuenta_stock(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    producto = _crear_producto_bar(client, headers, "9100002", stock=10)

    venta = client.post(
        "/caja/ventas/mostrador",
        headers=headers,
        json={
            "items": [
                {"origen": "BAR", "id_producto": producto["id_producto"], "cantidad": 3}
            ],
            "metodo_pago": "QR",
        },
    )
    assert venta.status_code == 201, venta.text
    assert venta.json()["monto"] == 15000

    productos_bar = client.get("/productos-bar", headers=headers).json()
    actualizado = next(
        p for p in productos_bar if p["id_producto"] == producto["id_producto"]
    )
    assert actualizado["stock"] == 7


def test_cerrar_turno_calcula_diferencia_con_ventas_mezcladas(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    turno = _abrir_turno(client, headers, 100000)
    producto_bar = _crear_producto_bar(client, headers, "9100003", stock=10)

    client.post(
        "/caja/ventas/mostrador",
        headers=headers,
        json={
            "items": [
                {
                    "origen": "BAR",
                    "id_producto": producto_bar["id_producto"],
                    "cantidad": 1,
                }
            ],
            "metodo_pago": "EFECTIVO",
        },
    )
    client.post(
        "/caja/ventas/mostrador",
        headers=headers,
        json={
            "items": [
                {
                    "origen": "BAR",
                    "id_producto": producto_bar["id_producto"],
                    "cantidad": 1,
                }
            ],
            "metodo_pago": "TARJETA",
        },
    )
    client.post(
        "/caja/gastos", headers=headers, json={"concepto": "Aseo", "monto": 2000}
    )

    # esperado en efectivo: 100000 apertura + 5000 venta efectivo - 2000 gasto = 103000
    cierre = client.post(
        f"/caja/turnos/{turno['id_turno']}/cerrar",
        headers=headers,
        json={"monto_cierre_real": 103000},
    )
    assert cierre.status_code == 200, cierre.text
    datos = cierre.json()
    assert datos["estado"] == "CERRADO"
    assert datos["total_efectivo"] == 5000
    assert datos["total_tarjeta"] == 5000
    assert datos["total_gastos"] == 2000
    assert datos["monto_esperado_efectivo"] == 103000
    assert datos["diferencia"] == 0


def test_empleado_puede_crear_gasto_pero_no_editarlo_ni_eliminarlo(
    client, usuario_admin, usuario_empleado
):
    headers_empleado = auth_headers(token_para(client, usuario_empleado.email))
    _abrir_turno(client, headers_empleado)

    crear = client.post(
        "/caja/gastos",
        headers=headers_empleado,
        json={"concepto": "Transporte", "monto": 5000},
    )
    assert crear.status_code == 201, crear.text
    id_gasto = crear.json()["id_gasto"]

    editar = client.patch(
        f"/caja/gastos/{id_gasto}",
        headers=headers_empleado,
        json={"monto": 8000},
    )
    assert editar.status_code == 403

    eliminar = client.delete(f"/caja/gastos/{id_gasto}", headers=headers_empleado)
    assert eliminar.status_code == 403


def test_deshacer_ultima_venta_mostrador_restaura_stock(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    producto = _crear_producto_bar(client, headers, "9200001", stock=10)

    venta = client.post(
        "/caja/ventas/mostrador",
        headers=headers,
        json={
            "items": [
                {"origen": "BAR", "id_producto": producto["id_producto"], "cantidad": 3}
            ],
            "metodo_pago": "EFECTIVO",
        },
    )
    assert venta.status_code == 201, venta.text
    id_venta = venta.json()["id_venta"]

    deshacer = client.post("/caja/ventas/deshacer-ultima", headers=headers)
    assert deshacer.status_code == 200, deshacer.text
    assert deshacer.json()["id_venta"] == id_venta

    productos_bar = client.get("/productos-bar", headers=headers).json()
    actualizado = next(
        p for p in productos_bar if p["id_producto"] == producto["id_producto"]
    )
    assert actualizado["stock"] == 10

    id_turno = venta.json()["id_turno_caja"]
    listado = client.get(
        "/caja/ventas", headers=headers, params={"id_turno": id_turno}
    )
    assert all(v["id_venta"] != id_venta for v in listado.json())


def test_deshacer_ultima_venta_sin_ventas_falla(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)

    deshacer = client.post("/caja/ventas/deshacer-ultima", headers=headers)
    assert deshacer.status_code == 422


def test_deshacer_ultima_venta_rechaza_cobro_de_habitacion(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    reserva = _crear_reserva_con_checkin(client, headers, "102", "1300000001")

    venta = client.post(
        "/caja/ventas/habitacion",
        headers=headers,
        json={"id_reserva": reserva["id_reserva"], "metodo_pago": "EFECTIVO"},
    )
    assert venta.status_code == 201, venta.text

    deshacer = client.post("/caja/ventas/deshacer-ultima", headers=headers)
    assert deshacer.status_code == 422


def test_empleado_no_puede_deshacer_venta(client, usuario_admin, usuario_empleado):
    headers_empleado = auth_headers(token_para(client, usuario_empleado.email))
    _abrir_turno(client, headers_empleado)
    producto = _crear_producto_bar(
        client, auth_headers(token_para(client, usuario_admin.email)), "9200002"
    )
    client.post(
        "/caja/ventas/mostrador",
        headers=headers_empleado,
        json={
            "items": [
                {"origen": "BAR", "id_producto": producto["id_producto"], "cantidad": 1}
            ],
            "metodo_pago": "EFECTIVO",
        },
    )

    deshacer = client.post("/caja/ventas/deshacer-ultima", headers=headers_empleado)
    assert deshacer.status_code == 403


def test_venta_item_incluye_origen_de_producto(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    producto = _crear_producto_bar(client, headers, "9300001", stock=10)

    venta = client.post(
        "/caja/ventas/mostrador",
        headers=headers,
        json={
            "items": [
                {"origen": "BAR", "id_producto": producto["id_producto"], "cantidad": 1}
            ],
            "metodo_pago": "EFECTIVO",
        },
    )
    assert venta.status_code == 201, venta.text
    item = venta.json()["items"][0]
    assert item["id_producto_bar"] == producto["id_producto"]
    assert item["id_producto_restaurante"] is None


def test_listar_ventas_filtra_por_rango_de_fechas(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    turno = _abrir_turno(client, headers)
    producto = _crear_producto_bar(client, headers, "9300002", stock=10)
    client.post(
        "/caja/ventas/mostrador",
        headers=headers,
        json={
            "items": [
                {"origen": "BAR", "id_producto": producto["id_producto"], "cantidad": 1}
            ],
            "metodo_pago": "EFECTIVO",
        },
    )

    hoy = date.today().isoformat()
    dentro_de_rango = client.get(
        "/caja/ventas",
        headers=headers,
        params={"id_turno": turno["id_turno"], "desde": hoy, "hasta": hoy},
    )
    assert len(dentro_de_rango.json()) == 1

    manana = date(2099, 1, 1).isoformat()
    fuera_de_rango = client.get(
        "/caja/ventas",
        headers=headers,
        params={"id_turno": turno["id_turno"], "desde": manana},
    )
    assert fuera_de_rango.json() == []


def test_listar_turnos_filtra_por_rango_de_fechas(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    _abrir_turno(client, headers)
    params_base = {"id_usuario": usuario_admin.id_usuario}

    hoy = date.today().isoformat()
    dentro_de_rango = client.get(
        "/caja/turnos",
        headers=headers,
        params={**params_base, "desde": hoy, "hasta": hoy},
    )
    assert len(dentro_de_rango.json()) == 1

    ayer = date(2020, 1, 1).isoformat()
    fuera_de_rango = client.get(
        "/caja/turnos",
        headers=headers,
        params={**params_base, "desde": ayer, "hasta": ayer},
    )
    assert fuera_de_rango.json() == []
