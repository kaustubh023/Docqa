from django.contrib import admin

from .models import ChatMessage, Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "filename", "user", "status", "uploaded_at")
    list_filter = ("status", "uploaded_at")
    search_fields = ("filename", "user__username", "user__email")
    ordering = ("-uploaded_at",)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "sender", "created_at")
    list_filter = ("sender", "created_at")
    search_fields = ("document__filename", "text")
    ordering = ("-created_at",)
