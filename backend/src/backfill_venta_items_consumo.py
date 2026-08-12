"""Repara ventas de habitacion (origen HABITACION) que quedaron sin detalle
de los productos de bar/restaurante cobrados junto con la habitacion.

Antes de este fix, cobrar_habitacion marcaba el consumo pendiente como
facturado (le ponia id_venta) pero nunca copiaba esos productos a
venta_item, asi que "Movimientos de este turno" solo mostraba "Cobro de
habitacion" (sin el articulo) y los reportes de Restaurante/Bar no
contaban ese consumo. Este script rellena, una sola vez, las ventas
historicas que quedaron asi -- es idempotente: una venta que ya tiene
items no se toca.

Uso: `uv run python -m src.backfill_venta_items_consumo`
"""

from collections import defaultdict

from src.caja.models import Venta, VentaItem
from src.consumo.models import ConsumoItem
from src.shared.database import SessionLocal


def backfill() -> None:
    db = SessionLocal()
    try:
        consumos_facturados = (
            db.query(ConsumoItem).filter(ConsumoItem.id_venta.isnot(None)).all()
        )
        por_venta: dict[int, list[ConsumoItem]] = defaultdict(list)
        for consumo in consumos_facturados:
            por_venta[consumo.id_venta].append(consumo)

        reparadas = 0
        for id_venta, consumos in por_venta.items():
            venta = db.get(Venta, id_venta)
            if venta is None or venta.items:
                continue
            for consumo in consumos:
                db.add(
                    VentaItem(
                        id_venta=venta.id_venta,
                        id_producto_bar=consumo.id_producto_bar,
                        id_producto_restaurante=consumo.id_producto_restaurante,
                        cantidad=consumo.cantidad,
                        precio_unitario=consumo.precio_unitario,
                    )
                )
            reparadas += 1
        db.commit()
        print(
            f"Ventas de habitacion con consumo revisadas: {len(por_venta)}. "
            f"Reparadas: {reparadas}."
        )
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
