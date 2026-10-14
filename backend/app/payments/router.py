from fastapi import APIRouter, Path, Request

from app.auth.service import user_for
from app.cart.schemas import Payment
from app.payments.service import pay

router = APIRouter(prefix="/api/v1/orders", tags=["Simulated payments"])


@router.post("/{order_id}/payments")
async def payment(
    data: Payment, request: Request, order_id: int = Path(gt=0, le=9223372036854775807)
):
    user = await user_for(request, client=True)
    async with request.app.state.pool.acquire() as connection, connection.transaction():
        return await pay(connection, user["id"], order_id, data)
