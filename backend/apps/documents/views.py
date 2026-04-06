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
from .ai_pipeline import delete_document_embeddings, process_document
from .llm_router import ask_ai_question, get_small_talk_reply
from .models import ChatMessage, Document
from .serializers import DocumentSerializer

# Professional way to handle Custom User models
User = get_user_model()


def run_document_processing_async(document):
    """Process a document in the background and update its status."""
    def background_ai_task(doc):
        try:
            success = process_document(
                doc.file.path,
                source_filename=doc.filename,
                document_id=doc.id,
                user_id=doc.user_id,
            )
            doc.status = "ready" if success else "failed"
            doc.save(update_fields=["status"])
        except Exception as error:
            print(f"Background Processing Error for doc {doc.id}: {error}")
            doc.status = "failed"
            doc.save(update_fields=["status"])

    threading.Thread(target=background_ai_task, args=(document,), daemon=True).start()


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
        run_document_processing_async(document)


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

            small_talk_reply = get_small_talk_reply(question=question, filename=document.filename)
            if small_talk_reply:
                ChatMessage.objects.create(document=document, sender='user', text=question)
                ChatMessage.objects.create(document=document, sender='ai', text=small_talk_reply)
                return Response({"answer": small_talk_reply}, status=status.HTTP_200_OK)

            if document.status == 'processing':
                return Response(
                    {"error": "Document is still processing. Please try again once status is ready."},
                    status=status.HTTP_409_CONFLICT
                )
            if document.status == 'failed':
                return Response(
                    {"error": "Document processing failed. Please click Retry Processing or upload the file again."},
                    status=status.HTTP_409_CONFLICT,
                )
            if document.status != 'ready':
                return Response(
                    {"error": "Document is not ready yet. Please wait until status is ready."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Retrieve past messages for AI context
            past_messages = document.messages.all()
            chat_history = [{"sender": msg.sender, "text": msg.text} for msg in past_messages]

            # Ask the AI Router
            answer = ask_ai_question(
                question=question,
                filename=document.filename,
                document_id=document.id,
                user_id=request.user.id,
                chat_history=chat_history,
            )

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

            # Clean vector chunks mapped to this document.
            delete_document_embeddings(document.id)
                
            document.delete() # Removes from Postgres
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Document.DoesNotExist:
            return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)


class DocumentReprocessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            document = Document.objects.get(pk=pk, user=request.user)
        except Document.DoesNotExist:
            return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        if document.status == "processing":
            return Response(
                {"error": "Document is already processing."},
                status=status.HTTP_409_CONFLICT,
            )

        document.status = "processing"
        document.save(update_fields=["status"])
        run_document_processing_async(document)

        return Response(
            {"detail": "Reprocessing started."},
            status=status.HTTP_202_ACCEPTED,
        )
