from typing import Any, Dict

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def error_body(request: Request, *, code: str, message: str, details: Any = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": getattr(request.state, "request_id", None),
    }
    if details is not None:
        payload["details"] = details
    return {"error": payload}


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        code = str(detail.get("code", "HTTP_ERROR"))
        message = str(detail.get("message", "请求失败"))
        details = detail.get("details")
    else:
        code, message, details = "HTTP_ERROR", str(detail), None
    return JSONResponse(status_code=exc.status_code, content=error_body(request, code=code, message=message, details=details), headers=exc.headers)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=error_body(request, code="VALIDATION_ERROR", message="请求参数不合法", details=exc.errors()),
    )
