"""Repara ventas de mesa (origen MESA) que quedaron sin detalle de productos.

Antes de este fix, cobrar un pedido de mesa guardaba el total cobrado pero
nunca copiaba los productos del pedido a la venta, asi que los reportes de
Restaurante y Bar (que suman por producto) mostraban $0 para esas ventas
aunque el dinero si se conto bien en Caja. Este script rellena, una sola
vez, las ventas historicas que quedaron asi -- es idempotente: una venta que
ya tiene items no se toca.

Uso: `uv run python -m src.backfill_venta_items_pedido`
"""

from src.caja.models import Venta, VentaItem
from src.restaurante.models import Pedido
from src.shared.database import SessionLocal


def backfill() -> None:
    db = SessionLocal()
    try:
        ventas = (
            db.query(Venta)
            .filter(Venta.origen == "MESA", Venta.id_pedido.isnot(None))
            .all()
        )
        reparadas = 0
        for venta in ventas:
            if venta.items:
                continue
            pedido = db.get(Pedido, venta.id_pedido)
            if pedido is None:
                continue
            for item in pedido.items:
                db.add(
                    VentaItem(
                        id_venta=venta.id_venta,
                        id_producto_bar=item.id_producto_bar,
                        id_producto_restaurante=item.id_producto_restaurante,
                        cantidad=item.cantidad,
                        precio_unitario=item.precio_unitario,
                    )
                )
            reparadas += 1
        db.commit()
        print(f"Ventas de mesa revisadas: {len(ventas)}. Reparadas: {reparadas}.")
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
