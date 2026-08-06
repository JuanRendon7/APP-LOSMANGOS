import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.auth.models import Rol, Usuario, UsuarioRol
from src.main import app
from src.seed import seed
from src.shared.database import engine, get_db
from src.shared.security import hash_password


@pytest.fixture(scope="session", autouse=True)
def _seed_rbac():
    seed()


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


def _crear_usuario_con_rol(db_session, email: str, codigo_rol: str) -> Usuario:
    rol = db_session.query(Rol).filter(Rol.codigo == codigo_rol).one()
    usuario = Usuario(nombre=f"Test {codigo_rol}", email=email, password_hash=hash_password("clave12345"))
    db_session.add(usuario)
    db_session.flush()
    db_session.add(UsuarioRol(id_usuario=usuario.id_usuario, id_rol=rol.id_rol))
    db_session.flush()
    return usuario


@pytest.fixture
def usuario_admin(db_session):
    return _crear_usuario_con_rol(db_session, "admin.test@hotellosmangos.com", "ADMINISTRADOR")


@pytest.fixture
def usuario_empleado(db_session):
    return _crear_usuario_con_rol(db_session, "empleado.test@hotellosmangos.com", "EMPLEADO")


def token_para(client, email: str, password: str = "clave12345") -> str:
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
