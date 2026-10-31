from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class ProfileUpdate(BaseModel):
    nickname: Optional[str] = Field(None, min_length=1, max_length=30)
    bio: Optional[str] = Field(None, max_length=1000)
    visibility: Optional[str] = Field(None, pattern="^(public|private)$")
    avatarAssetId: Optional[int] = None

class WalletAction(BaseModel):
    action: str = Field(pattern="^(recharge|withdraw|refund)$")
    amount: Optional[Decimal] = Field(None, gt=0, max_digits=16, decimal_places=2)
    bizType: str = Field("", max_length=32)
    bizId: str = Field("", max_length=64)
