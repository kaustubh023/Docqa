from django.urls import path
from .views import DocumentListCreateView, DocumentChatView

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='document-list-create'),
    
    # Add our new Chat endpoint!
    path('chat/', DocumentChatView.as_view(), name='document-chat'),
]