from tests.conftest import auth_headers, token_para


def test_listar_configuracion_incluye_sonido_por_defecto(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    resp = client.get("/configuracion", headers=headers)
    assert resp.status_code == 200, resp.text
    claves = {c["clave"]: c["valor"] for c in resp.json()}
    assert claves["sonido_notificacion"] == "campana"


def test_empleado_puede_ver_pero_no_editar_configuracion(client, usuario_empleado):
    headers = auth_headers(token_para(client, usuario_empleado.email))
    assert client.get("/configuracion", headers=headers).status_code == 200
    editar = client.patch(
        "/configuracion/sonido_notificacion",
        headers=headers,
        json={"valor": "timbre"},
    )
    assert editar.status_code == 403


def test_admin_actualiza_sonido_notificacion(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    editar = client.patch(
        "/configuracion/sonido_notificacion",
        headers=headers,
        json={"valor": "timbre"},
    )
    assert editar.status_code == 200, editar.text
    assert editar.json()["valor"] == "timbre"

    listar = client.get("/configuracion", headers=headers)
    claves = {c["clave"]: c["valor"] for c in listar.json()}
    assert claves["sonido_notificacion"] == "timbre"


def test_actualizar_configuracion_rechaza_valor_invalido(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    resp = client.patch(
        "/configuracion/sonido_notificacion",
        headers=headers,
        json={"valor": "no-existe"},
    )
    assert resp.status_code == 422


def test_actualizar_configuracion_clave_desconocida(client, usuario_admin):
    headers = auth_headers(token_para(client, usuario_admin.email))
    resp = client.patch(
        "/configuracion/clave-inventada",
        headers=headers,
        json={"valor": "algo"},
    )
    assert resp.status_code == 422
