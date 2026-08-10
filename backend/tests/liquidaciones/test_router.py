from tests.conftest import auth_headers, token_para


def _payload(**overrides):
    payload = {
        "nombre_empleado": "Maria Perez",
        "periodo": "01 al 15 de enero de 2027",
        "monto": 1500000,
        "concepto": "Salario enero",
        "fecha_pago": "2027-01-05",
    }
    payload.update(overrides)
    return payload


def test_admin_crea_lista_edita_y_elimina_liquidacion(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post("/liquidaciones", headers=headers, json=_payload())
    assert crear.status_code == 201, crear.text
    datos = crear.json()
    assert datos["nombre_empleado"] == "Maria Perez"
    id_liquidacion = datos["id_liquidacion"]

    listar = client.get("/liquidaciones", headers=headers)
    assert listar.status_code == 200
    assert any(l["id_liquidacion"] == id_liquidacion for l in listar.json())

    filtrar = client.get(
        "/liquidaciones",
        headers=headers,
        params={"nombre_empleado": "maria", "periodo": "enero"},
    )
    assert len(filtrar.json()) == 1

    editar = client.patch(
        f"/liquidaciones/{id_liquidacion}",
        headers=headers,
        json={"monto": 1600000, "nombre_empleado": "Maria P. Perez", "periodo": "Quincena 2 - enero 2027"},
    )
    assert editar.status_code == 200, editar.text
    assert editar.json()["monto"] == 1600000
    assert editar.json()["nombre_empleado"] == "Maria P. Perez"
    assert editar.json()["periodo"] == "Quincena 2 - enero 2027"

    eliminar = client.delete(f"/liquidaciones/{id_liquidacion}", headers=headers)
    assert eliminar.status_code == 204

    listar_luego = client.get("/liquidaciones", headers=headers)
    assert not any(l["id_liquidacion"] == id_liquidacion for l in listar_luego.json())


def test_crear_liquidacion_sin_nombre_devuelve_422(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    resp = client.post(
        "/liquidaciones", headers=headers, json=_payload(nombre_empleado="")
    )
    assert resp.status_code == 422


def test_empleado_no_puede_acceder_a_liquidaciones(
    client, usuario_empleado, usuario_admin
):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    assert client.get("/liquidaciones", headers=headers).status_code == 403
    crear = client.post("/liquidaciones", headers=headers, json=_payload())
    assert crear.status_code == 403
