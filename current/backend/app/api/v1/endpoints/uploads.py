import mimetypes
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.config import settings
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.platform import MediaAsset
from app.models.user import User
from app.schemas.platform import MediaAssetResponse

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "application/pdf",
    "video/mp4", "video/quicktime",
}
EICAR_TEST_SIGNATURE = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


def _content_matches_mime(content: bytes, mime_type: str) -> bool:
    signatures = {
        "image/jpeg": (b"\xff\xd8\xff",),
        "image/png": (b"\x89PNG\r\n\x1a\n",),
        "image/webp": (b"RIFF",),
        "application/pdf": (b"%PDF-",),
        "video/mp4": (b"\x00\x00\x00",),
        "video/quicktime": (b"\x00\x00\x00",),
    }
    expected = signatures.get(mime_type, ())
    if mime_type in {"video/mp4", "video/quicktime"}:
        return len(content) > 12 and content[4:8] == b"ftyp"
    if mime_type == "image/webp":
        return len(content) > 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return any(content.startswith(prefix) for prefix in expected)


def _passes_security_scan(content: bytes) -> bool:
    """Baseline inline scanner; production should additionally enforce gateway/AV scanning."""
    return EICAR_TEST_SIGNATURE not in content


def _local_path(storage_key: str) -> Path:
    root = settings.UPLOAD_DIR.resolve()
    path = (root / storage_key).resolve()
    if root not in path.parents:
        raise HTTPException(status_code=500, detail={"code": "INVALID_STORAGE_KEY", "message": "文件存储记录异常"})
    return path


def _asset_url(request: Request, asset_id: int) -> str:
    return str(request.url_for("get_upload", asset_id=asset_id))


def _response(request: Request, asset: MediaAsset) -> MediaAssetResponse:
    return MediaAssetResponse(id=asset.id, url=_asset_url(request, asset.id), name=asset.name, mime_type=asset.mime_type, size=asset.size, status=asset.status)


@router.post("", response_model=MediaAssetResponse, status_code=status.HTTP_201_CREATED)
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MediaAssetResponse:
    filename = Path(file.filename or "upload").name
    if not filename or len(filename) > 255:
        raise HTTPException(status_code=422, detail={"code": "INVALID_FILE_NAME", "message": "文件名不合法"})
    mime_type = (file.content_type or mimetypes.guess_type(filename)[0] or "").lower()
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail={"code": "UNSUPPORTED_MEDIA_TYPE", "message": "不支持的文件类型"})
    content = file.file.read(settings.UPLOAD_MAX_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail={"code": "EMPTY_FILE", "message": "不能上传空文件"})
    if len(content) > settings.UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=413, detail={"code": "FILE_TOO_LARGE", "message": "文件超过大小限制"})
    if not _content_matches_mime(content, mime_type):
        raise HTTPException(status_code=422, detail={"code": "INVALID_FILE_CONTENT", "message": "文件内容与类型不匹配"})
    if not _passes_security_scan(content):
        raise HTTPException(status_code=422, detail={"code": "MALWARE_DETECTED", "message": "文件未通过安全扫描"})
    if settings.UPLOAD_STORAGE_BACKEND != "local":
        raise HTTPException(status_code=503, detail={"code": "STORAGE_UNAVAILABLE", "message": "对象存储服务尚未配置"})

    # The opaque server-generated key avoids both path traversal and file-name collisions.
    storage_key = f"{current_user.id}/{secrets.token_urlsafe(24)}{Path(filename).suffix.lower()}"
    target = _local_path(storage_key)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    asset = MediaAsset(owner_id=current_user.id, name=filename, storage_key=storage_key, mime_type=mime_type, size=len(content))
    db.add(asset)
    db.flush()
    write_audit_log(
        db, actor_id=current_user.id, action="upload.created", resource_type="media_asset", resource_id=asset.id,
        after={"name": filename, "mime_type": mime_type, "size": len(content)}, request_id=getattr(request.state, "request_id", None),
    )
    try:
        db.commit()
    except Exception:
        db.rollback()
        target.unlink(missing_ok=True)
        raise
    db.refresh(asset)
    return _response(request, asset)


@router.get("/{asset_id}", name="get_upload")
def get_upload(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    asset = db.get(MediaAsset, asset_id)
    if not asset or asset.status != "available":
        raise HTTPException(status_code=404, detail={"code": "UPLOAD_NOT_FOUND", "message": "文件不存在"})
    if asset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail={"code": "UPLOAD_FORBIDDEN", "message": "无权访问该文件"})
    path = _local_path(asset.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail={"code": "UPLOAD_NOT_FOUND", "message": "文件不存在"})
    return FileResponse(path, media_type=asset.mime_type, filename=asset.name)
