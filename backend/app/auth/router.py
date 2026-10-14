from fastapi import APIRouter, Request, Response

from app.auth import repository as repo
from app.auth import schemas, service

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.get("/session")
async def session(request: Request):
    return repo.public_user(await service.user_for(request))


@router.post("/register", status_code=201)
async def register(data: schemas.Register, request: Request, response: Response):
    return await service.sign_in(request, response, data, register=True)


@router.post("/login")
async def login(data: schemas.Login, request: Request, response: Response):
    return await service.sign_in(request, response, data)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response):
    await repo.revoke_session(
        request.app.state.pool, service.digest(request.cookies.get(service.COOKIE, ""))
    )
    response.delete_cookie(service.COOKIE, path="/")
    response.delete_cookie("northside_guest", path="/")
