from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    # These fields are read-only so users can't fake them
    filename = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    uploaded_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Document
        # 'file' is the only thing the user actually sends
        fields = ['id', 'file', 'filename', 'status', 'uploaded_at']