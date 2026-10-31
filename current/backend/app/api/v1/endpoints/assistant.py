from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.assistant import AssistantConversation, AssistantMessage
from app.models.user import User
from app.services.assistant import generate_reply

router = APIRouter()
class ConversationCreate(BaseModel): title: str = Field(default="新会话", max_length=120); mode: str = Field(default="general", max_length=32)
class AssistantContext(BaseModel):
    aircraft_model: Optional[str] = Field(default=None, max_length=80)
    city: Optional[str] = Field(default=None, max_length=80)
    task: Optional[str] = Field(default=None, max_length=500)


class SendMessage(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    mode: str = Field(default="general", max_length=32)
    client_message_id: Optional[str] = Field(default=None, max_length=120)
    context: Optional[AssistantContext] = None
def owned(db, user, cid):
    item = db.get(AssistantConversation, cid)
    if not item: raise HTTPException(404, detail={"code":"CONVERSATION_NOT_FOUND","message":"会话不存在"})
    if item.user_id != user.id: raise HTTPException(403, detail={"code":"CONVERSATION_FORBIDDEN","message":"无权访问会话"})
    return item
def payload(db, c, messages=True):
    data={"id":str(c.id),"title":c.title,"mode":c.mode,"updatedAt":c.updated_at,"updated_at":c.updated_at}
    if messages: data["messages"]=[{"id":str(m.id),"role":m.role,"content":m.content,"status":m.status,"createdAt":m.created_at,"created_at":m.created_at,"sources":[]} for m in db.scalars(select(AssistantMessage).where(AssistantMessage.conversation_id==c.id).order_by(AssistantMessage.id))]
    return data
@router.get("/conversations")
def list_conversations(user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    return [payload(db,c,False) for c in db.scalars(select(AssistantConversation).where(AssistantConversation.user_id==user.id).order_by(AssistantConversation.updated_at.desc()))]
@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(body: ConversationCreate, user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    c=AssistantConversation(user_id=user.id,title=body.title.strip() or "新会话",mode=body.mode);db.add(c);db.commit();db.refresh(c);return payload(db,c)
@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)): return payload(db,owned(db,user,conversation_id))
@router.delete("/conversations/{conversation_id}",status_code=204)
def delete_conversation(conversation_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    c=owned(db,user,conversation_id);db.query(AssistantMessage).filter(AssistantMessage.conversation_id==c.id).delete();db.delete(c);db.commit()
@router.delete("/conversations/{conversation_id}/messages",status_code=204)
def clear_conversation(conversation_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    c=owned(db,user,conversation_id);db.query(AssistantMessage).filter(AssistantMessage.conversation_id==c.id).delete();db.commit()
@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id:int,body:SendMessage,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    c=owned(db,user,conversation_id);db.add(AssistantMessage(conversation_id=c.id,role="user",content=body.content,status="completed"));db.commit()
    history=[{"role":item.role,"content":item.content} for item in db.scalars(select(AssistantMessage).where(AssistantMessage.conversation_id==c.id).order_by(AssistantMessage.id))]
    context = body.context.model_dump(exclude_none=True) if body.context else {}
    content=generate_reply(history,body.mode,context)
    reply=AssistantMessage(conversation_id=c.id,role="assistant",content=content,status="completed")
    db.add(reply);db.commit();db.refresh(reply)
    return {"message":{"id":str(reply.id),"role":reply.role,"content":reply.content,"status":reply.status,"created_at":reply.created_at,"sources":[],"source":"model_proxy"}}
