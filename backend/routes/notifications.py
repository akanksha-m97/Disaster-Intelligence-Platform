from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from database.mongodb import (
    get_notifications,
    get_unread_notification_count,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    clear_all_notifications,
    delete_notification,
    save_notification,
    seed_notifications_from_incidents_if_empty,
)

router = APIRouter()


class NotificationCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    disaster_type: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    severity: str = Field(default="Medium")
    source_type: Optional[str] = Field(default="alert")
    source_id: Optional[str] = None


@router.post("/notifications/seed")
async def seed_notifications():
    """
    Seed notifications collection from recent database incidents.
    """
    try:
        seeded = await seed_notifications_from_incidents_if_empty()
        unread_count = await get_unread_notification_count()
        return {
            "success": True,
            "seeded_count": seeded,
            "unread_count": unread_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications")
async def fetch_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
):
    """
    Fetch notifications with unread count and full list.
    """
    try:
        notifications = await get_notifications(limit=limit, unread_only=unread_only)
        unread_count = await get_unread_notification_count()
        return {
            "total": len(notifications),
            "unread_count": unread_count,
            "notifications": notifications,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/unread-count")
async def fetch_unread_count():
    """
    Fetch only the count of unread notifications for quick badge polling.
    """
    try:
        count = await get_unread_notification_count()
        return {"unread_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/notifications/{notification_id}/read")
async def mark_read(notification_id: str):
    """
    Mark an individual notification as read.
    """
    try:
        success = await mark_notification_as_read(notification_id)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        unread_count = await get_unread_notification_count()
        return {
            "success": True,
            "notification_id": notification_id,
            "unread_count": unread_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/notifications/mark-all-read")
async def mark_all_read():
    """
    Mark all unread notifications as read.
    """
    try:
        updated = await mark_all_notifications_as_read()
        return {
            "success": True,
            "updated_count": updated,
            "unread_count": 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notifications/clear-all")
async def clear_all():
    """
    Clear all notifications from the database.
    """
    try:
        deleted = await clear_all_notifications()
        return {
            "success": True,
            "deleted_count": deleted,
            "unread_count": 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notifications/{notification_id}")
async def remove_notification(notification_id: str):
    """
    Delete a specific notification.
    """
    try:
        success = await delete_notification(notification_id)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        unread_count = await get_unread_notification_count()
        return {
            "success": True,
            "notification_id": notification_id,
            "unread_count": unread_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications", status_code=201)
async def create_notification(payload: NotificationCreateRequest):
    """
    Create a new notification manually or via external events.
    """
    try:
        notif_dict = {
            "title": payload.title,
            "description": payload.description,
            "disaster_type": payload.disaster_type,
            "location": payload.location,
            "severity": payload.severity.capitalize(),
            "source_type": payload.source_type,
            "source_id": payload.source_id,
            "read": False,
            "created_at": datetime.utcnow(),
        }
        notif_id = await save_notification(notif_dict)
        notif_dict["_id"] = notif_id
        unread_count = await get_unread_notification_count()
        return {
            "success": True,
            "notification": notif_dict,
            "unread_count": unread_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
