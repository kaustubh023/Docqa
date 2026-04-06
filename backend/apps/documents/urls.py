from django.urls import path
from .views import (
    AdminStatsView,
    DocumentChatView,
    DocumentDetailView,
    DocumentListCreateView,
    DocumentReprocessView,
)

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='document-list'),
    path('<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('<int:pk>/reprocess/', DocumentReprocessView.as_view(), name='document-reprocess'),
    path('chat/', DocumentChatView.as_view(), name='document-chat'),
    path('admin-stats/', AdminStatsView.as_view(), name='admin-stats'),
]
