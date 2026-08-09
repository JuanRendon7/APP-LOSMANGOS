from datetime import date

import pytest

from src.hospedaje.models import ESTADOS_HABITACION
from src.tarifas.models import Temporada
from tests.conftest import auth_headers, token_para


@pytest.fixture(autouse=True)
def _tarifa_base(db_session):
    # Cubre las fechas usadas por defecto en las pruebas de este archivo
    # (agosto a diciembre 2026) para que crear una reserva no falle por falta
    # de tarifa. Las pruebas que ejercitan el calculo de precio usan fechas
    # fuera de este rango para no interferir.
    db_session.add(
        Temporada(
            nombre="Tarifa de pruebas",
            fecha_inicio=date(2026, 8, 1),
            fecha_fin=date(2026, 12, 31),
            precio_noche=100000,
        )
    )
    db_session.flush()


def _habitacion_por_numero(client, headers, numero: str) -> dict:
    resp = client.get("/habitaciones", headers=headers)
    assert resp.status_code == 200, resp.text
    habitaciones = {h["numero"]: h for h in resp.json()}
    return habitaciones[numero]


def _crear_reserva(client, headers, id_habitacion, cedula, **overrides):
    payload = {
        "id_habitacion": id_habitacion,
        "fecha_checkin_prevista": "2026-09-01",
        "fecha_checkout_prevista": "2026-09-03",
        "nombre": "Juan Perez",
        "cedula": cedula,
        "contacto": "3001234567",
        "placa": "ABC123",
    }
    payload.update(overrides)
    return client.post("/reservas", headers=headers, json=payload)


def test_admin_lista_17_habitaciones(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    resp = client.get("/habitaciones", headers=auth_headers(token))
    assert resp.status_code == 200
    habitaciones = resp.json()
    assert len(habitaciones) == 17
    numeros = {h["numero"] for h in habitaciones}
    esperados = {str(n) for n in range(102, 109)} | {str(n) for n in range(201, 211)}
    assert numeros == esperados
    # No se asume que todas esten DISPONIBLE: la suite corre contra la BD real
    # de desarrollo, que tambien recibe pruebas manuales de UI.
    assert all(h["estado"] in ESTADOS_HABITACION for h in habitaciones)
    por_numero = {h["numero"]: h["tipo"] for h in habitaciones}
    assert por_numero["102"] == "Sencilla"
    assert por_numero["201"] == "Dos camas"
    assert por_numero["210"] == "Dos camas"
    assert por_numero["205"] == "Pareja"


def test_admin_crea_habitacion(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    resp = client.post(
        "/habitaciones",
        headers=headers,
        json={"numero": "301", "piso": 3, "tipo": "Suite"},
    )
    assert resp.status_code == 201, resp.text
    creada = resp.json()
    assert creada["numero"] == "301"
    assert creada["piso"] == 3
    assert creada["tipo"] == "Suite"
    assert creada["estado"] == "DISPONIBLE"


def test_no_se_puede_crear_habitacion_con_numero_repetido(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    resp = client.post(
        "/habitaciones",
        headers=headers,
        json={"numero": "102", "piso": 1, "tipo": "Sencilla"},
    )
    assert resp.status_code == 409


def test_empleado_no_puede_crear_habitacion(client, usuario_empleado):
    headers = auth_headers(token_para(client, usuario_empleado.email))
    resp = client.post(
        "/habitaciones",
        headers=headers,
        json={"numero": "302", "piso": 3, "tipo": "Suite"},
    )
    assert resp.status_code == 403


def test_admin_edita_informacion_de_habitacion(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    habitacion = _habitacion_por_numero(client, headers, "108")
    resp = client.patch(
        f"/habitaciones/{habitacion['id_habitacion']}/info",
        headers=headers,
        json={"tipo": "Sencilla premium"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["tipo"] == "Sencilla premium"


def test_empleado_no_puede_editar_catalogo_de_habitacion(
    client, usuario_admin, usuario_empleado
):
    headers_admin = auth_headers(token_para(client, usuario_admin.email))
    headers_empleado = auth_headers(token_para(client, usuario_empleado.email))
    habitacion = _habitacion_por_numero(client, headers_admin, "103")
    resp = client.patch(
        f"/habitaciones/{habitacion['id_habitacion']}/info",
        headers=headers_empleado,
        json={"tipo": "Otro"},
    )
    assert resp.status_code == 403


def test_habitaciones_sin_token_devuelve_401(client):
    resp = client.get("/habitaciones")
    assert resp.status_code == 401


def test_crear_reserva_con_huesped_nuevo(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "102")

    resp = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000001")
    assert resp.status_code == 201, resp.text
    datos = resp.json()
    assert datos["estado"] == "RESERVADA"
    assert datos["huesped"]["cedula"] == "1000000001"
    assert datos["huesped"]["nombre"] == "Juan Perez"


def test_crear_reserva_reutiliza_huesped_por_cedula(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    hab_102 = _habitacion_por_numero(client, headers, "102")
    hab_103 = _habitacion_por_numero(client, headers, "103")

    primera = _crear_reserva(client, headers, hab_102["id_habitacion"], "1000000002")
    assert primera.status_code == 201, primera.text
    id_huesped = primera.json()["huesped"]["id_huesped"]

    segunda = _crear_reserva(
        client,
        headers,
        hab_103["id_habitacion"],
        "1000000002",
        nombre="Juan Perez Actualizado",
        fecha_checkin_prevista="2026-10-01",
        fecha_checkout_prevista="2026-10-03",
    )
    assert segunda.status_code == 201, segunda.text
    assert segunda.json()["huesped"]["id_huesped"] == id_huesped
    assert segunda.json()["huesped"]["nombre"] == "Juan Perez Actualizado"


def test_crear_reserva_rechaza_solapamiento(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "104")

    primera = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000003")
    assert primera.status_code == 201, primera.text

    segunda = _crear_reserva(
        client,
        headers,
        habitacion["id_habitacion"],
        "1000000004",
        fecha_checkin_prevista="2026-09-02",
        fecha_checkout_prevista="2026-09-05",
    )
    assert segunda.status_code == 409


def test_crear_reserva_checkout_antes_de_checkin_es_invalido(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "105")

    resp = _crear_reserva(
        client,
        headers,
        habitacion["id_habitacion"],
        "1000000005",
        fecha_checkin_prevista="2026-09-05",
        fecha_checkout_prevista="2026-09-01",
    )
    assert resp.status_code == 422


def test_ciclo_completo_checkin_checkout_actualiza_estado_habitacion(
    client, usuario_admin
):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "106")

    reserva = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000006")
    id_reserva = reserva.json()["id_reserva"]

    checkin = client.post(f"/reservas/{id_reserva}/check-in", headers=headers)
    assert checkin.status_code == 200, checkin.text
    assert checkin.json()["estado"] == "CHECK_IN"

    habitacion_ocupada = _habitacion_por_numero(client, headers, "106")
    assert habitacion_ocupada["estado"] == "OCUPADA"
    assert habitacion_ocupada["reserva_activa"]["id_reserva"] == id_reserva

    checkout = client.post(f"/reservas/{id_reserva}/check-out", headers=headers)
    assert checkout.status_code == 200, checkout.text
    assert checkout.json()["estado"] == "CHECK_OUT"

    habitacion_limpieza = _habitacion_por_numero(client, headers, "106")
    assert habitacion_limpieza["estado"] == "LIMPIEZA"

    marcar_disponible = client.patch(
        f"/habitaciones/{habitacion['id_habitacion']}",
        headers=headers,
        json={"estado": "DISPONIBLE"},
    )
    assert marcar_disponible.status_code == 200, marcar_disponible.text
    assert marcar_disponible.json()["estado"] == "DISPONIBLE"


def test_no_se_puede_marcar_ocupada_manualmente(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "107")

    resp = client.patch(
        f"/habitaciones/{habitacion['id_habitacion']}",
        headers=headers,
        json={"estado": "OCUPADA"},
    )
    assert resp.status_code == 422


def test_cancelar_reserva(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "108")

    reserva = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000007")
    id_reserva = reserva.json()["id_reserva"]

    cancelar = client.post(f"/reservas/{id_reserva}/cancelar", headers=headers)
    assert cancelar.status_code == 200
    assert cancelar.json()["estado"] == "CANCELADA"

    # Al estar cancelada, la habitacion vuelve a estar libre para esas fechas.
    otra = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000008")
    assert otra.status_code == 201, otra.text


def test_empleado_puede_operar_ciclo_completo_de_reservas(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "201")

    reserva = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000009")
    assert reserva.status_code == 201, reserva.text
    id_reserva = reserva.json()["id_reserva"]

    checkin = client.post(f"/reservas/{id_reserva}/check-in", headers=headers)
    assert checkin.status_code == 200

    checkout = client.post(f"/reservas/{id_reserva}/check-out", headers=headers)
    assert checkout.status_code == 200


def test_crear_reserva_sin_tarifa_definida_devuelve_422(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "102")

    resp = _crear_reserva(
        client,
        headers,
        habitacion["id_habitacion"],
        "1000000010",
        fecha_checkin_prevista="2028-01-01",
        fecha_checkout_prevista="2028-01-03",
    )
    assert resp.status_code == 422
    assert "tarifa" in resp.json()["detail"].lower()


def test_crear_reserva_con_tarifa_calcula_precio_total(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "103")

    resp = _crear_reserva(
        client,
        headers,
        habitacion["id_habitacion"],
        "1000000011",
        fecha_checkin_prevista="2026-09-01",
        fecha_checkout_prevista="2026-09-03",
    )
    assert resp.status_code == 201, resp.text
    # 2 noches (1 y 2 de septiembre) x 100000 de la tarifa de pruebas.
    assert resp.json()["precio_total"] == 200000


def test_reserva_cruza_dos_temporadas_suma_precios_correctos(
    client, usuario_admin, db_session
):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "104")

    db_session.add_all(
        [
            Temporada(
                nombre="Baja 2028",
                fecha_inicio=date(2028, 11, 28),
                fecha_fin=date(2028, 11, 30),
                precio_noche=80000,
            ),
            Temporada(
                nombre="Alta 2028",
                fecha_inicio=date(2028, 12, 1),
                fecha_fin=date(2028, 12, 3),
                precio_noche=120000,
            ),
        ]
    )
    db_session.flush()

    resp = _crear_reserva(
        client,
        headers,
        habitacion["id_habitacion"],
        "1000000012",
        fecha_checkin_prevista="2028-11-29",
        fecha_checkout_prevista="2028-12-02",
    )
    assert resp.status_code == 201, resp.text
    # Noches: 29 y 30 nov (80000 c/u) + 1 dic (120000) = 280000
    assert resp.json()["precio_total"] == 280000


def test_empleado_ve_precio_total_sin_acceso_a_tarifas(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)
    habitacion = _habitacion_por_numero(client, headers, "105")

    reserva = _crear_reserva(client, headers, habitacion["id_habitacion"], "1000000013")
    assert reserva.status_code == 201, reserva.text
    assert reserva.json()["precio_total"] == 200000

    assert client.get("/temporadas", headers=headers).status_code == 403
