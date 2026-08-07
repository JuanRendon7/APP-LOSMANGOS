from tests.conftest import auth_headers, token_para


def _payload(**overrides):
    payload = {
        "nombre": "Temporada baja",
        "fecha_inicio": "2027-01-01",
        "fecha_fin": "2027-03-31",
        "precio_noche": 100000,
        "activa": True,
    }
    payload.update(overrides)
    return payload


def test_admin_crea_lista_y_edita_temporada(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post("/temporadas", headers=headers, json=_payload())
    assert crear.status_code == 201, crear.text
    id_temporada = crear.json()["id_temporada"]

    listar = client.get("/temporadas", headers=headers)
    assert listar.status_code == 200
    assert any(t["id_temporada"] == id_temporada for t in listar.json())

    editar = client.patch(
        f"/temporadas/{id_temporada}", headers=headers, json={"precio_noche": 150000}
    )
    assert editar.status_code == 200, editar.text
    assert editar.json()["precio_noche"] == 150000


def test_empleado_no_puede_acceder_a_temporadas(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    assert client.get("/temporadas", headers=headers).status_code == 403
    crear = client.post("/temporadas", headers=headers, json=_payload())
    assert crear.status_code == 403


def test_crear_temporada_rechaza_solapamiento_con_activa(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    primera = client.post("/temporadas", headers=headers, json=_payload())
    assert primera.status_code == 201, primera.text

    segunda = client.post(
        "/temporadas",
        headers=headers,
        json=_payload(
            nombre="Temporada alta",
            fecha_inicio="2027-03-15",
            fecha_fin="2027-04-15",
        ),
    )
    assert segunda.status_code == 409


def test_crear_temporada_fecha_fin_antes_de_inicio_es_invalida(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    resp = client.post(
        "/temporadas",
        headers=headers,
        json=_payload(fecha_inicio="2027-05-10", fecha_fin="2027-05-01"),
    )
    assert resp.status_code == 422


def test_eliminar_temporada(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post("/temporadas", headers=headers, json=_payload())
    id_temporada = crear.json()["id_temporada"]

    eliminar = client.delete(f"/temporadas/{id_temporada}", headers=headers)
    assert eliminar.status_code == 204

    listar = client.get("/temporadas", headers=headers)
    assert all(t["id_temporada"] != id_temporada for t in listar.json())


def test_temporada_inactiva_no_bloquea_solapamiento(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post("/temporadas", headers=headers, json=_payload(activa=False))
    assert crear.status_code == 201, crear.text

    otra = client.post("/temporadas", headers=headers, json=_payload(nombre="Otra"))
    assert otra.status_code == 201, otra.text
