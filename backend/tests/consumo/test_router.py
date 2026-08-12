from datetime import date

import pytest

from src.tarifas.models import Temporada
from tests.conftest import auth_headers, token_para


@pytest.fixture(autouse=True)
def _tarifa_base(db_session):
    db_session.add(
        Temporada(
            nombre="Tarifa de pruebas consumo",
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
            "nombre": "Huesped Consumo",
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


def _crear_producto_restaurante(client, headers, nombre="Sandwich"):
    resp = client.post(
        "/productos-restaurante",
        headers=headers,
        json={"nombre": nombre, "precio_venta": 15000},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_agregar_consumo_bar_descuenta_stock(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "102", "1100000001")
    producto = _crear_producto_bar(client, headers, "9000001", stock=10)

    resp = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "BAR",
            "id_producto": producto["id_producto"],
            "cantidad": 3,
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["nombre_producto"] == "Cerveza"

    productos_bar = client.get("/productos-bar", headers=headers).json()
    actualizado = next(
        p for p in productos_bar if p["id_producto"] == producto["id_producto"]
    )
    assert actualizado["stock"] == 7


def test_agregar_consumo_restaurante_no_toca_stock(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "103", "1100000002")
    producto = _crear_producto_restaurante(client, headers)

    resp = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 2,
        },
    )
    assert resp.status_code == 201, resp.text

    resumen = client.get(
        "/consumo",
        headers=headers,
        params={"id_reserva": reserva["id_reserva"]},
    )
    assert resumen.status_code == 200
    assert resumen.json()["total"] == 30000


def test_rechaza_consumo_si_reserva_no_esta_en_checkin(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "104")
    crear = client.post(
        "/reservas",
        headers=headers,
        json={
            "id_habitacion": habitacion["id_habitacion"],
            "fecha_checkin_prevista": "2026-09-01",
            "fecha_checkout_prevista": "2026-09-03",
            "nombre": "Sin Checkin",
            "cedula": "1100000003",
            "contacto": "3000000000",
        },
    )
    reserva = crear.json()
    producto = _crear_producto_restaurante(client, headers, "Sopa")

    resp = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 1,
        },
    )
    assert resp.status_code == 422


def test_eliminar_consumo_bar_restaura_stock(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "105", "1100000004")
    producto = _crear_producto_bar(client, headers, "9000002", stock=10)

    crear = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "BAR",
            "id_producto": producto["id_producto"],
            "cantidad": 4,
        },
    )
    id_consumo = crear.json()["id_consumo"]

    eliminar = client.delete(f"/consumo/{id_consumo}", headers=headers)
    assert eliminar.status_code == 204

    productos_bar = client.get("/productos-bar", headers=headers).json()
    actualizado = next(
        p for p in productos_bar if p["id_producto"] == producto["id_producto"]
    )
    assert actualizado["stock"] == 10


def test_empleado_puede_crear_pero_no_eliminar(client, usuario_admin, usuario_empleado):
    token_admin = token_para(client, usuario_admin.email)
    headers_admin = auth_headers(token_admin)
    producto = _crear_producto_bar(client, headers_admin, "9000003", stock=10)

    token_empleado = token_para(client, usuario_empleado.email)
    headers = auth_headers(token_empleado)
    reserva = _crear_reserva_con_checkin(client, headers, "106", "1100000005")

    crear = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "BAR",
            "id_producto": producto["id_producto"],
            "cantidad": 1,
        },
    )
    assert crear.status_code == 201, crear.text

    eliminar = client.delete(
        f"/consumo/{crear.json()['id_consumo']}", headers=headers
    )
    assert eliminar.status_code == 403


def test_total_con_items_mixtos_bar_y_restaurante(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "107", "1100000006")
    bar = _crear_producto_bar(client, headers, "9000004", stock=10)
    restaurante = _crear_producto_restaurante(client, headers, "Pescado")

    client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "BAR",
            "id_producto": bar["id_producto"],
            "cantidad": 2,
        },
    )
    client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": restaurante["id_producto"],
            "cantidad": 1,
        },
    )

    resumen = client.get(
        "/consumo",
        headers=headers,
        params={"id_reserva": reserva["id_reserva"]},
    )
    assert resumen.status_code == 200
    datos = resumen.json()
    assert len(datos["items"]) == 2
    assert datos["total"] == 2 * 5000 + 15000


def test_enviar_comanda_marca_pendientes_y_trae_habitacion(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "108", "1100000007")
    producto = _crear_producto_restaurante(client, headers, "Arepa")

    client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 2,
        },
    )

    comanda = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert comanda.status_code == 200, comanda.text
    datos = comanda.json()
    assert datos["numero_habitacion"] == "108"
    assert datos["nombre_huesped"] == "Huesped Consumo"
    assert len(datos["items"]) == 1
    assert datos["items"][0]["nombre_producto"] == "Arepa"
    assert datos["items"][0]["enviado_cocina_en"] is not None

    resumen = client.get(
        "/consumo", headers=headers, params={"id_reserva": reserva["id_reserva"]}
    )
    assert resumen.json()["items"][0]["enviado_cocina_en"] is not None


def test_enviar_comanda_sin_pendientes_falla(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "201", "1100000008")

    resp = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert resp.status_code == 422


def test_enviar_comanda_no_repite_items_ya_enviados(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "202", "1100000009")
    producto = _crear_producto_restaurante(client, headers, "Jugo")

    client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 1,
        },
    )
    primera = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert primera.status_code == 200, primera.text
    assert len(primera.json()["items"]) == 1

    # Sin nada nuevo, no debe volver a mandar lo ya enviado.
    segunda = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert segunda.status_code == 422

    client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 1,
        },
    )
    tercera = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert tercera.status_code == 200, tercera.text
    assert len(tercera.json()["items"]) == 1


def test_nota_de_consumo_se_guarda_y_aparece_en_la_comanda(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "204", "1100000011")
    producto = _crear_producto_restaurante(client, headers, "Omelette")

    crear = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 1,
            "nota": "Sin cebolla",
        },
    )
    assert crear.status_code == 201, crear.text
    assert crear.json()["nota"] == "Sin cebolla"

    resumen = client.get(
        "/consumo", headers=headers, params={"id_reserva": reserva["id_reserva"]}
    )
    assert resumen.json()["items"][0]["nota"] == "Sin cebolla"

    comanda = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert comanda.status_code == 200, comanda.text
    assert comanda.json()["items"][0]["nota"] == "Sin cebolla"


def test_obtener_comanda_por_ids(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    reserva = _crear_reserva_con_checkin(client, headers, "203", "1100000010")
    producto = _crear_producto_restaurante(client, headers, "Cafe")

    crear = client.post(
        "/consumo",
        headers=headers,
        json={
            "id_reserva": reserva["id_reserva"],
            "origen": "RESTAURANTE",
            "id_producto": producto["id_producto"],
            "cantidad": 1,
        },
    )
    id_consumo = crear.json()["id_consumo"]

    enviar = client.post(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda", headers=headers
    )
    assert enviar.status_code == 200

    obtener = client.get(
        f"/consumo/reserva/{reserva['id_reserva']}/comanda",
        headers=headers,
        params={"ids": str(id_consumo)},
    )
    assert obtener.status_code == 200, obtener.text
    datos = obtener.json()
    assert datos["numero_habitacion"] == "203"
    assert len(datos["items"]) == 1
    assert datos["items"][0]["id_consumo"] == id_consumo
