from tests.conftest import auth_headers, token_para


def test_login_exitoso_devuelve_token(client, usuario_admin):
    resp = client.post(
        "/auth/login",
        json={"email": usuario_admin.email, "password": "clave12345"},
    )
    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"
    assert resp.json()["access_token"]


def test_login_password_incorrecta_devuelve_401(client, usuario_admin):
    resp = client.post(
        "/auth/login",
        json={"email": usuario_admin.email, "password": "clave-incorrecta"},
    )
    assert resp.status_code == 401


def test_me_sin_token_devuelve_401(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_con_token_devuelve_usuario_y_permisos(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    resp = client.get("/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    datos = resp.json()
    assert datos["roles"] == ["ADMINISTRADOR"]
    assert "HABITACIONES:VER" in datos["permisos"]
    assert "USUARIOS:ELIMINAR" in datos["permisos"]


def test_admin_puede_listar_usuarios(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    resp = client.get("/usuarios", headers=auth_headers(token))
    assert resp.status_code == 200


def test_empleado_no_puede_listar_usuarios(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    resp = client.get("/usuarios", headers=auth_headers(token))
    assert resp.status_code == 403


def test_empleado_no_puede_ver_roles(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    resp = client.get("/roles", headers=auth_headers(token))
    assert resp.status_code == 403


def test_empleado_tiene_permisos_operativos_pero_no_costos_bar(
    client, usuario_empleado
):
    token = token_para(client, usuario_empleado.email)
    resp = client.get("/auth/me", headers=auth_headers(token))
    permisos = resp.json()["permisos"]
    assert "PEDIDOS:CREAR" in permisos
    assert "VENTAS:CREAR" in permisos
    assert "PRODUCTOS_BAR:VER_COSTOS" not in permisos
    assert "TARIFAS:VER" not in permisos


def test_admin_crea_usuario_y_usuario_puede_autenticarse(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    resp = client.post(
        "/usuarios",
        headers=auth_headers(token),
        json={
            "nombre": "Nuevo Empleado",
            "cedula": "2000000001",
            "celular": "3001112233",
            "email": "nuevo.empleado@hotellosmangos.com",
            "password": "otraclave123",
            "roles": ["EMPLEADO"],
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["cedula"] == "2000000001"
    login = client.post(
        "/auth/login",
        json={"email": "nuevo.empleado@hotellosmangos.com", "password": "otraclave123"},
    )
    assert login.status_code == 200


def test_admin_no_puede_crear_usuario_con_email_duplicado(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    payload = {
        "nombre": "Duplicado",
        "cedula": "2000000002",
        "celular": "3001112233",
        "email": usuario_admin.email,
        "password": "otraclave123",
        "roles": ["EMPLEADO"],
    }
    resp = client.post("/usuarios", headers=auth_headers(token), json=payload)
    assert resp.status_code == 409


def test_admin_no_puede_crear_usuario_con_cedula_duplicada(client, usuario_admin):
    token = token_para(client, usuario_admin.email)
    payload = {
        "nombre": "Duplicado",
        "cedula": usuario_admin.cedula,
        "celular": "3001112233",
        "email": "otro.correo@hotellosmangos.com",
        "password": "otraclave123",
        "roles": ["EMPLEADO"],
    }
    resp = client.post("/usuarios", headers=auth_headers(token), json=payload)
    assert resp.status_code == 409


def test_admin_edita_nombre_y_celular_de_usuario(
    client, usuario_admin, usuario_empleado
):
    token = token_para(client, usuario_admin.email)
    resp = client.patch(
        f"/usuarios/{usuario_empleado.id_usuario}",
        headers=auth_headers(token),
        json={"nombre": "Empleado Editado", "celular": "3009998877"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["nombre"] == "Empleado Editado"
    assert resp.json()["celular"] == "3009998877"


def test_empleado_no_puede_crear_usuario(client, usuario_empleado):
    token = token_para(client, usuario_empleado.email)
    payload = {
        "nombre": "Intento",
        "cedula": "2000000003",
        "celular": "3001112233",
        "email": "intento@hotellosmangos.com",
        "password": "otraclave123",
        "roles": ["EMPLEADO"],
    }
    resp = client.post("/usuarios", headers=auth_headers(token), json=payload)
    assert resp.status_code == 403
