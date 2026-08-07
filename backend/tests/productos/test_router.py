from tests.conftest import auth_headers, token_para


def _payload_bar(**overrides):
    payload = {
        "nombre": "Cerveza Aguila",
        "codigo_barras": "7701234567890",
        "precio_costo": 2000,
        "precio_venta": 5000,
        "stock": 24,
    }
    payload.update(overrides)
    return payload


def test_admin_crea_lista_y_edita_producto_restaurante(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post(
        "/productos-restaurante",
        headers=headers,
        json={"nombre": "Bandeja de res", "precio_venta": 25000},
    )
    assert crear.status_code == 201, crear.text
    id_producto = crear.json()["id_producto"]

    listar = client.get("/productos-restaurante", headers=headers)
    assert listar.status_code == 200
    assert any(p["id_producto"] == id_producto for p in listar.json())

    editar = client.patch(
        f"/productos-restaurante/{id_producto}",
        headers=headers,
        json={"precio_venta": 27000},
    )
    assert editar.status_code == 200, editar.text
    assert editar.json()["precio_venta"] == 27000


def test_empleado_solo_puede_ver_productos_restaurante(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    assert client.get("/productos-restaurante", headers=headers).status_code == 200
    crear = client.post(
        "/productos-restaurante",
        headers=headers,
        json={"nombre": "Sopa", "precio_venta": 10000},
    )
    assert crear.status_code == 403


def test_admin_crea_producto_bar_con_margen(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    resp = client.post("/productos-bar", headers=headers, json=_payload_bar())
    assert resp.status_code == 201, resp.text
    datos = resp.json()
    assert datos["precio_costo"] == 2000
    assert datos["margen"] == 3000
    assert datos["margen_porcentaje"] == 150.0
    assert datos["stock"] == 24


def test_crear_producto_bar_rechaza_codigo_duplicado(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    primero = client.post(
        "/productos-bar", headers=headers, json=_payload_bar(codigo_barras="111")
    )
    assert primero.status_code == 201, primero.text

    segundo = client.post(
        "/productos-bar",
        headers=headers,
        json=_payload_bar(nombre="Otro producto", codigo_barras="111"),
    )
    assert segundo.status_code == 409


def test_empleado_ve_producto_bar_sin_costos_ni_margen(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    resp = client.get("/productos-bar", headers=headers)
    assert resp.status_code == 200
    assert all(p["precio_costo"] is None for p in resp.json())
    assert all(p["margen"] is None for p in resp.json())
    assert all(p["margen_porcentaje"] is None for p in resp.json())


def test_empleado_no_puede_crear_producto_bar(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    headers = auth_headers(token)

    resp = client.post(
        "/productos-bar", headers=headers, json=_payload_bar(codigo_barras="222")
    )
    assert resp.status_code == 403


def test_ajustar_stock_entrada_y_salida(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post(
        "/productos-bar", headers=headers, json=_payload_bar(codigo_barras="333")
    )
    id_producto = crear.json()["id_producto"]

    entrada = client.post(
        f"/productos-bar/{id_producto}/ajustar-stock",
        headers=headers,
        json={"cantidad": 10},
    )
    assert entrada.status_code == 200, entrada.text
    assert entrada.json()["stock"] == 34

    salida = client.post(
        f"/productos-bar/{id_producto}/ajustar-stock",
        headers=headers,
        json={"cantidad": -3},
    )
    assert salida.status_code == 200, salida.text
    assert salida.json()["stock"] == 31


def test_ajustar_stock_rechaza_dejarlo_negativo(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)

    crear = client.post(
        "/productos-bar", headers=headers, json=_payload_bar(codigo_barras="444")
    )
    id_producto = crear.json()["id_producto"]

    resp = client.post(
        f"/productos-bar/{id_producto}/ajustar-stock",
        headers=headers,
        json={"cantidad": -100},
    )
    assert resp.status_code == 422
