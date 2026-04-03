import os
from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'file', 'filename', 'status', 'uploaded_at']
        read_only_fields = ['status', 'uploaded_at']

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        # Ensure .csv is in this list!
        valid_extensions = ['.pdf', '.docx', '.txt', '.csv']
        if ext not in valid_extensions:
            raise serializers.ValidationError("Unsupported file format. Please upload PDF, DOCX, TXT, or CSV.")
        return value