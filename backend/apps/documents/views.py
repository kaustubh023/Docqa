import os
import threading
import traceback

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

# Internal Imports
from .ai_pipeline import process_document
from .llm_router import ask_ai_question
from .models import ChatMessage, Document
from .serializers import DocumentSerializer

# Professional way to handle Custom User models
User = get_user_model()

# --- 1. CUSTOM ADMIN DASHBOARD VIEW ---
class AdminStatsView(APIView):
    """
    Provides global statistics for the Custom Admin Dashboard.
    Only accessible by users with 'is_staff' set to True.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        print(f"--- Admin Request from: {request.user.username} ---")
        try:
            return Response({
                "total_users": User.objects.count(),
                "total_documents": Document.objects.count(),
                "total_messages": ChatMessage.objects.count(),
                "recent_documents": [
                    {
                        "id": d.id, 
                        "filename": d.filename, 
                        "user": d.user.username, 
                        "status": d.status
                    }
                    for d in Document.objects.all().order_by('-uploaded_at')[:5]
                ]
            })
        except Exception as e:
            print(f"🚨 ADMIN VIEW ERROR: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 2. DOCUMENT UPLOAD & LIST VIEW ---
class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user).order_by('-uploaded_at')

    def perform_create(self, serializer):
        # 1. Save the file and set initial status
        document = serializer.save(user=self.request.user, status='processing')

        # 2. Run AI processing in a background thread to prevent UI freezing
        def background_ai_task(doc):
            try:
                success = process_document(doc.file.path, source_filename=doc.filename)
                doc.status = 'ready' if success else 'failed'
                doc.save()
            except Exception as e:
                print(f"Background Processing Error: {e}")
                doc.status = 'failed'
                doc.save()

        thread = threading.Thread(target=background_ai_task, args=(document,))
        thread.start()


# --- 3. PERSISTENT CHAT & HISTORY VIEW ---
class DocumentChatView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Loads persistent chat history from PostgreSQL"""
        filename = request.query_params.get("filename")
        if not filename:
            return Response({"error": "Filename is required."}, status=status.HTTP_400_BAD_REQUEST)

        document = (
            Document.objects
            .filter(filename=filename, user=request.user)
            .order_by('-uploaded_at')
            .first()
        )
        
        if not document:
            return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        # Convert DB messages to 'role' format for the React Frontend
        messages = document.messages.all()
        data = [{"role": msg.sender, "text": msg.text} for msg in messages]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        """Processes questions and saves them to the DB"""
        question = request.data.get("question")
        filename = request.data.get("filename")

        if not question or not filename:
            return Response({"error": "Question and filename are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            document = (
                Document.objects
                .filter(filename=filename, user=request.user)
                .order_by('-uploaded_at')
                .first()
            )
            
            if not document:
                return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

            # Retrieve past messages for AI context
            past_messages = document.messages.all()
            chat_history = [{"sender": msg.sender, "text": msg.text} for msg in past_messages]

            # Ask the AI Router
            answer = ask_ai_question(question, document.filename, chat_history)

            # SAVE TO DATABASE (The 'Hard Drive' memory)
            ChatMessage.objects.create(document=document, sender='user', text=question)
            ChatMessage.objects.create(document=document, sender='ai', text=answer)

            return Response({"answer": answer}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"VIEW CRASHED: {e}")
            traceback.print_exc()
            return Response(
                {"error": "Failed to process the question with the AI."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- 4. DOCUMENT DELETION VIEW ---
class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            document = Document.objects.get(pk=pk, user=request.user)
            
            # Delete physical file from Windows media folder
            if document.file and os.path.isfile(document.file.path):
                os.remove(document.file.path)
                
            document.delete() # Removes from Postgres
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Document.DoesNotExist:
            return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
