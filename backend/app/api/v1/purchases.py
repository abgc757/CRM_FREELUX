from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime, timezone
from app.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models import User, Purchase, PurchaseItem, Supplier, Product, AvailabilityRequest, Sale
from app.schemas.purchase import (
    PurchaseCreate, PurchaseOut, PurchaseItemOut,
    AvailabilityRequestCreate, AvailabilityRequestResponse,
)

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=List[PurchaseOut])
async def list_purchases(
    estado: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Purchase)
    if estado:
        query = query.where(Purchase.estado == estado)
    query = query.order_by(Purchase.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return [PurchaseOut.model_validate(p) for p in result.scalars().all()]


@router.get("/{purchase_id}", response_model=PurchaseOut)
async def get_purchase(
    purchase_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    return PurchaseOut.model_validate(purchase)


@router.post("", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    body: PurchaseCreate,
    current_user: User = Depends(RoleChecker(["compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    supplier_result = await db.execute(select(Supplier).where(Supplier.id == body.supplier_id))
    if not supplier_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    items = []
    subtotal = 0.0
    for item_data in body.items:
        prod_result = await db.execute(select(Product).where(Product.id == item_data.product_id))
        if not prod_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data.product_id} not found")
        item_subtotal = round(item_data.cantidad * item_data.precio_unitario, 2)
        subtotal += item_subtotal
        items.append(PurchaseItem(
            product_id=item_data.product_id,
            cantidad=item_data.cantidad,
            precio_unitario=item_data.precio_unitario,
            subtotal=item_subtotal,
        ))
    impuesto = round(subtotal * 0.16, 2)
    total = round(subtotal + impuesto, 2)
    folio = f"OC-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    purchase = Purchase(
        folio=folio,
        supplier_id=body.supplier_id,
        user_id=current_user.id,
        subtotal=subtotal,
        impuesto=impuesto,
        total=total,
        notas=body.notas,
    )
    purchase.items = items
    db.add(purchase)
    await db.flush()
    await db.refresh(purchase)
    return PurchaseOut.model_validate(purchase)


@router.post("/{purchase_id}/receive", response_model=PurchaseOut)
async def receive_purchase(
    purchase_id: int,
    current_user: User = Depends(RoleChecker(["almacen", "compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    purchase.estado = "recibida"
    for item in purchase.items:
        prod = await db.get(Product, item.product_id)
        if prod:
            prod.stock += item.cantidad
            prod.version += 1
    await db.flush()
    await db.refresh(purchase)
    return PurchaseOut.model_validate(purchase)


@router.post("/availability", response_model=dict)
async def request_availability(
    body: AvailabilityRequestCreate,
    current_user: User = Depends(RoleChecker(["ventas", "compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    prod = await db.get(Product, body.product_id)
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    req = AvailabilityRequest(
        product_id=body.product_id,
        cantidad=body.cantidad,
        sale_id=body.sale_id,
        requested_by_id=current_user.id,
        response_notes=body.notes,
    )
    db.add(req)
    await db.flush()
    return {
        "request_id": req.id,
        "message": "Availability request sent to Purchasing",
        "product": prod.nombre,
        "current_stock": prod.stock,
        "status": "pendiente",
    }


@router.get("/availability/pending", response_model=List[dict])
async def list_pending_availability(
    current_user: User = Depends(RoleChecker(["compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AvailabilityRequest).where(AvailabilityRequest.estado == "pendiente")
    )
    requests = result.scalars().all()
    output = []
    for req in requests:
        prod = await db.get(Product, req.product_id)
        output.append({
            "id": req.id,
            "product_id": req.product_id,
            "product_name": prod.nombre if prod else "Unknown",
            "cantidad": req.cantidad,
            "requested_by": req.requested_by_id,
            "notes": req.response_notes,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })
    return output


@router.put("/availability/{request_id}/respond", response_model=dict)
async def respond_availability(
    request_id: int,
    body: AvailabilityRequestResponse,
    current_user: User = Depends(RoleChecker(["compras", "gerencia", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AvailabilityRequest).where(AvailabilityRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    req.estado = body.estado
    req.eta_response = body.eta
    req.response_notes = body.notes
    await db.flush()
    return {"message": "Availability request updated", "request_id": request_id}
