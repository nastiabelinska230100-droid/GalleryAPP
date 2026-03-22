from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserOut(BaseModel):
    id: int
    name: str
    display_name: str
    telegram_id: Optional[int] = None
    avatar_url: Optional[str] = None
    media_count: Optional[int] = 0


class MediaOut(BaseModel):
    id: str
    uploader_id: int
    uploader_name: Optional[str] = None
    file_url: str
    thumbnail_url: Optional[str] = None
    file_type: str
    file_size: Optional[int] = None
    caption: Optional[str] = None
    taken_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    like_count: Optional[int] = 0
    comment_count: Optional[int] = 0
    liked_by_me: Optional[bool] = False
    tags: Optional[list[str]] = []


class MediaDetail(MediaOut):
    comments: list = []
    likes: list = []
    tagged_users: list = []


class CommentOut(BaseModel):
    id: int
    media_id: str
    user_id: int
    user_name: Optional[str] = None
    user_display_name: Optional[str] = None
    text: str
    created_at: Optional[datetime] = None


class AlbumOut(BaseModel):
    id: int
    title: str
    created_by: int
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    cover_url: Optional[str] = None
    media_count: Optional[int] = 0


class StatsOut(BaseModel):
    user_id: int
    name: str
    display_name: str
    photo_count: int = 0
    video_count: int = 0
    last_upload: Optional[datetime] = None


class UploadResponse(BaseModel):
    id: str
    file_url: str
    thumbnail_url: Optional[str] = None
