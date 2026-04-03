from django.urls import path
from .views import DocumentListCreateView, DocumentChatView, DocumentDetailView

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='document-list'),
    path('<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('chat/', DocumentChatView.as_view(), name='document-chat'),
]