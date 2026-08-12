from tests.conftest import auth_headers, token_para


def _crear_mesa(client, headers, nombre="Mesa 1"):
    resp = client.post(
        "/mesas", headers=headers, json={"nombre": nombre, "capacidad": 4}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crear_producto(client, headers, nombre="Bandeja de res", precio=25000):
    resp = client.post(
        "/productos-restaurante",
        headers=headers,
        json={"nombre": nombre, "precio_venta": precio},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_admin_crea_mesa_y_empleado_no_puede(client, usuario_admin, usuario_empleado):
    token_admin = token_para(client, usuario_admin.email)
    mesa = _crear_mesa(client, auth_headers(token_admin))
    assert mesa["estado"] == "LIBRE"

    token_empleado = token_para(client, usuario_empleado.email)
    resp = client.post(
        "/mesas",
        headers=auth_headers(token_empleado),
        json={"nombre": "Mesa 2", "capacidad": 2},
    )
    assert resp.status_code == 403

    listar = client.get("/mesas", headers=auth_headers(token_empleado))
    assert listar.status_code == 200


def test_ciclo_completo_pedido_libera_la_mesa(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    mesa = _crear_mesa(client, headers, "Mesa 10")
    producto = _crear_producto(client, headers, "Cerdo", 20000)

    crear = client.post("/pedidos", headers=headers, json={"id_mesa": mesa["id_mesa"]})
    assert crear.status_code == 201, crear.text
    pedido = crear.json()
    assert pedido["estado"] == "ABIERTO"
    assert pedido["total"] == 0

    item = client.post(
        f"/pedidos/{pedido['id_pedido']}/items",
        headers=headers,
        json={"id_producto": producto["id_producto"], "cantidad": 2, "nota": "sin sal"},
    )
    assert item.status_code == 200, item.text
    assert item.json()["total"] == 40000

    enviar = client.post(
        f"/pedidos/{pedido['id_pedido']}/enviar-cocina", headers=headers
    )
    assert enviar.status_code == 200, enviar.text
    assert enviar.json()["estado"] == "ENVIADO_COCINA"

    mesa_ocupada = client.get("/mesas", headers=headers).json()
    mesa_actual = next(m for m in mesa_ocupada if m["id_mesa"] == mesa["id_mesa"])
    assert mesa_actual["estado"] == "OCUPADA"
    assert mesa_actual["pedido_activo"]["id_pedido"] == pedido["id_pedido"]

    for esperado in ["EN_PREPARACION", "LISTO", "ENTREGADO"]:
        avanzar = client.post(
            f"/pedidos/{pedido['id_pedido']}/avanzar", headers=headers
        )
        assert avanzar.status_code == 200, avanzar.text
        assert avanzar.json()["estado"] == esperado

    cerrar = client.post(f"/pedidos/{pedido['id_pedido']}/cerrar", headers=headers)
    assert cerrar.status_code == 200, cerrar.text
    assert cerrar.json()["estado"] == "CERRADO"

    mesas_finales = client.get("/mesas", headers=headers).json()
    mesa_final = next(m for m in mesas_finales if m["id_mesa"] == mesa["id_mesa"])
    assert mesa_final["estado"] == "LIBRE"
    assert mesa_final["pedido_activo"] is None


def test_mover_pedido_a_otra_mesa(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    mesa_origen = _crear_mesa(client, headers, "Mesa 20")
    mesa_destino = _crear_mesa(client, headers, "Mesa 21")

    crear = client.post(
        "/pedidos", headers=headers, json={"id_mesa": mesa_origen["id_mesa"]}
    )
    pedido = crear.json()

    mover = client.post(
        f"/pedidos/{pedido['id_pedido']}/mover",
        headers=headers,
        json={"id_mesa_destino": mesa_destino["id_mesa"]},
    )
    assert mover.status_code == 200, mover.text
    assert mover.json()["id_mesa"] == mesa_destino["id_mesa"]

    mesas = {m["id_mesa"]: m for m in client.get("/mesas", headers=headers).json()}
    assert mesas[mesa_origen["id_mesa"]]["estado"] == "LIBRE"
    assert mesas[mesa_destino["id_mesa"]]["estado"] == "OCUPADA"
    assert (
        mesas[mesa_destino["id_mesa"]]["pedido_activo"]["id_pedido"]
        == pedido["id_pedido"]
    )


def test_no_se_puede_mover_pedido_a_mesa_ocupada(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    mesa_origen = _crear_mesa(client, headers, "Mesa 22")
    mesa_destino = _crear_mesa(client, headers, "Mesa 23")

    pedido = client.post(
        "/pedidos", headers=headers, json={"id_mesa": mesa_origen["id_mesa"]}
    ).json()
    client.post("/pedidos", headers=headers, json={"id_mesa": mesa_destino["id_mesa"]})

    mover = client.post(
        f"/pedidos/{pedido['id_pedido']}/mover",
        headers=headers,
        json={"id_mesa_destino": mesa_destino["id_mesa"]},
    )
    assert mover.status_code == 422, mover.text


def test_no_se_puede_crear_pedido_en_mesa_ocupada(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    mesa = _crear_mesa(client, headers, "Mesa 11")

    payload = {"id_mesa": mesa["id_mesa"]}
    primero = client.post("/pedidos", headers=headers, json=payload)
    assert primero.status_code == 201, primero.text

    segundo = client.post("/pedidos", headers=headers, json=payload)
    assert segundo.status_code == 422


def test_enviar_a_cocina_sin_items_falla(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    mesa = _crear_mesa(client, headers, "Mesa 12")

    pedido = client.post(
        "/pedidos", headers=headers, json={"id_mesa": mesa["id_mesa"]}
    ).json()
    resp = client.post(f"/pedidos/{pedido['id_pedido']}/enviar-cocina", headers=headers)
    assert resp.status_code == 422


def test_no_se_puede_agregar_item_a_pedido_cerrado(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    headers = auth_headers(token)
    mesa = _crear_mesa(client, headers, "Mesa 13")
    producto = _crear_producto(client, headers, "Sopa", 12000)

    pedido = client.post(
        "/pedidos", headers=headers, json={"id_mesa": mesa["id_mesa"]}
    ).json()
    cerrar = client.post(f"/pedidos/{pedido['id_pedido']}/cerrar", headers=headers)
    assert cerrar.status_code == 200

    item = client.post(
        f"/pedidos/{pedido['id_pedido']}/items",
        headers=headers,
        json={"id_producto": producto["id_producto"], "cantidad": 1},
    )
    assert item.status_code == 422


def test_empleado_puede_operar_ciclo_completo_de_pedidos(
    client, usuario_admin, usuario_empleado
):
    token_admin = token_para(client, usuario_admin.email)
    headers_admin = auth_headers(token_admin)
    mesa = _crear_mesa(client, headers_admin, "Mesa 14")
    producto = _crear_producto(client, headers_admin, "Pescado", 30000)

    token_empleado = token_para(client, usuario_empleado.email)
    headers = auth_headers(token_empleado)

    pedido = client.post(
        "/pedidos", headers=headers, json={"id_mesa": mesa["id_mesa"]}
    )
    assert pedido.status_code == 201, pedido.text
    id_pedido = pedido.json()["id_pedido"]

    item = client.post(
        f"/pedidos/{id_pedido}/items",
        headers=headers,
        json={"id_producto": producto["id_producto"], "cantidad": 1},
    )
    assert item.status_code == 200

    enviar = client.post(f"/pedidos/{id_pedido}/enviar-cocina", headers=headers)
    assert enviar.status_code == 200
    avanzar = client.post(f"/pedidos/{id_pedido}/avanzar", headers=headers)
    assert avanzar.status_code == 200
    cerrar = client.post(f"/pedidos/{id_pedido}/cerrar", headers=headers)
    assert cerrar.status_code == 200
