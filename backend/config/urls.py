from django.contrib import admin
from django.urls import path, include
from django.conf import settings # <-- ADD THIS
from django.conf.urls.static import static # <-- ADD THIS

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/documents/', include('apps.documents.urls')), # <-- ADD THIS
]

# This tells Django how to serve the uploaded files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)