
import os
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator

def user_directory_path(instance, filename):
    # This automatically saves files in a neat folder structure: media/documents/user_<id>/<filename>
    return f'documents/user_{instance.user.id}/{filename}'

class Document(models.Model):
    # Processing Status Choices
    STATUS_CHOICES = (
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('ready', 'Ready for Q&A'),
        ('failed', 'Processing Failed'),
    )

    # 1. Link to the User (If user is deleted, their documents are deleted too)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    
    # 2. The Actual File (With your requested accepted file types!)
    file = models.FileField(
        upload_to=user_directory_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'txt'])]
    )
    
    # 3. Metadata
    filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')

    def save(self, *args, **kwargs):
        # Automatically set the filename field based on the actual uploaded file's name
        if self.file and not self.filename:
            self.filename = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.filename} ({self.user.username})"