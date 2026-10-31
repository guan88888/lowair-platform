from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.models.platform import AuditLog


def write_audit_log(
    db: Session,
    *,
    actor_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[Union[int, str]] = None,
    before: Optional[Dict[str, Any]] = None,
    after: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> AuditLog:
    """Stage an audit record in the caller's transaction."""
    event = AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        before_data=before,
        after_data=after,
        request_id=request_id,
    )
    db.add(event)
    return event
