from tests.conftest import auth_headers, token_para


def _payload(id_usuario: int, **overrides):
    payload = {
        "id_usuario": id_usuario,
        "periodo": "2027-01",
        "monto": 1500000,
        "concepto": "Salario enero",
        "fecha_pago": "2027-01-05",
    }
    payload.update(overrides)
    return payload


def test_admin_crea_lista_edita_y_elimina_liquidacion(
    client, usuario_admin, usuario_empleado
):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post(
        "/liquidaciones", headers=headers, json=_payload(usuario_empleado.id_usuario)
    )
    assert crear.status_code == 201, crear.text
    datos = crear.json()
    assert datos["nombre_empleado"] == usuario_empleado.nombre
    id_liquidacion = datos["id_liquidacion"]

    listar = client.get("/liquidaciones", headers=headers)
    assert listar.status_code == 200
    assert any(l["id_liquidacion"] == id_liquidacion for l in listar.json())

    filtrar = client.get(
        "/liquidaciones",
        headers=headers,
        params={"id_usuario": usuario_empleado.id_usuario, "periodo": "2027-01"},
    )
    assert len(filtrar.json()) == 1

    editar = client.patch(
        f"/liquidaciones/{id_liquidacion}", headers=headers, json={"monto": 1600000}
    )
    assert editar.status_code == 200, editar.text
    assert editar.json()["monto"] == 1600000

    eliminar = client.delete(f"/liquidaciones/{id_liquidacion}", headers=headers)
    assert eliminar.status_code == 204

    listar_luego = client.get("/liquidaciones", headers=headers)
    assert not any(l["id_liquidacion"] == id_liquidacion for l in listar_luego.json())


def test_crear_liquidacion_con_periodo_invalido_devuelve_422(
    client, usuario_admin, usuario_empleado
):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    resp = client.post(
        "/liquidaciones",
        headers=headers,
        json=_payload(usuario_empleado.id_usuario, periodo="enero-2027"),
    )
    assert resp.status_code == 422


def test_crear_liquidacion_de_empleado_inexistente_devuelve_404(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    resp = client.post("/liquidaciones", headers=headers, json=_payload(999999))
    assert resp.status_code == 404


def test_empleado_no_puede_acceder_a_liquidaciones(
    client, usuario_empleado, usuario_admin
):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    assert client.get("/liquidaciones", headers=headers).status_code == 403
    crear = client.post(
        "/liquidaciones", headers=headers, json=_payload(usuario_admin.id_usuario)
    )
    assert crear.status_code == 403
