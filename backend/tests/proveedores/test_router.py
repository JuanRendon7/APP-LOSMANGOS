from tests.conftest import auth_headers, token_para


def _payload(**overrides):
    payload = {
        "nombre": "Distribuidora Los Mangos",
        "nit_cedula": "900123456-1",
        "contacto": "3001234567",
        "categoria": "Insumos bar",
    }
    payload.update(overrides)
    return payload


def test_admin_crea_lista_y_edita_proveedor(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post("/proveedores", headers=headers, json=_payload())
    assert crear.status_code == 201, crear.text
    proveedor = crear.json()
    assert proveedor["nombre"] == "Distribuidora Los Mangos"
    assert proveedor["activo"] is True

    listar = client.get("/proveedores", headers=headers)
    assert listar.status_code == 200
    assert any(p["id_proveedor"] == proveedor["id_proveedor"] for p in listar.json())

    editar = client.patch(
        f"/proveedores/{proveedor['id_proveedor']}",
        headers=headers,
        json={"contacto": "3009999999", "activo": False},
    )
    assert editar.status_code == 200, editar.text
    assert editar.json()["contacto"] == "3009999999"
    assert editar.json()["activo"] is False


def test_empleado_solo_puede_ver_proveedores(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    assert client.get("/proveedores", headers=headers).status_code == 200
    crear = client.post("/proveedores", headers=headers, json=_payload())
    assert crear.status_code == 403


def test_crear_proveedor_rechaza_nit_duplicado(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    primero = client.post(
        "/proveedores", headers=headers, json=_payload(nit_cedula="800111222-3")
    )
    assert primero.status_code == 201, primero.text

    segundo = client.post(
        "/proveedores",
        headers=headers,
        json=_payload(nombre="Otro proveedor", nit_cedula="800111222-3"),
    )
    assert segundo.status_code == 409


def test_proveedor_sin_nit_no_choca_con_otros_sin_nit(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    primero = client.post(
        "/proveedores",
        headers=headers,
        json=_payload(nombre="Proveedor informal 1", nit_cedula=None),
    )
    assert primero.status_code == 201, primero.text

    segundo = client.post(
        "/proveedores",
        headers=headers,
        json=_payload(nombre="Proveedor informal 2", nit_cedula=None),
    )
    assert segundo.status_code == 201, segundo.text
