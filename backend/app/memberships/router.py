from fastapi import APIRouter, Request

from app.memberships import service
from app.memberships.schemas import AccessOffer, AccessOfferPreview

router = APIRouter(prefix="/api/v1/access-offers", tags=["Access catalogue"])


@router.get("", response_model=list[AccessOffer])
async def list_offers(request: Request):
    return await service.list_access_offers(request.app.state.pool)


@router.get("/previews", response_model=list[AccessOfferPreview])
async def list_previews(request: Request):
    return await service.list_access_offers(request.app.state.pool)
