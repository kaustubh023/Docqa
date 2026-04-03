import os
import threading

from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_pipeline import process_document
from .llm_router import ask_ai_question
from .models import ChatMessage, Document
from .serializers import DocumentSerializer

class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user).order_by('-uploaded_at')

    def perform_create(self, serializer):
        # 1. Save the file to the database and hard drive
        document = serializer.save(user=self.request.user, status='processing')

        # 2. Run the AI processing in the background (so the frontend doesn't freeze)
        def background_ai_task(doc):
            success = process_document(doc.file.path)
            # Update the status based on whether it worked
            doc.status = 'ready' if success else 'failed'
            doc.save()

        # Start the background thread
        thread = threading.Thread(target=background_ai_task, args=(document,))
        thread.start()
        
        
class DocumentChatView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
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

        messages = document.messages.all()
        # Package records using 'role' to match frontend renderer.
        data = [{"role": msg.sender, "text": msg.text} for msg in messages]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        question = request.data.get("question")
        filename = request.data.get("filename")

        if not question or not filename:
            return Response({"error": "Question and filename are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Verify the document belongs to the logged-in user
            document = (
                Document.objects
                .filter(filename=filename, user=request.user)
                .order_by('-uploaded_at')
                .first()
            )
            if not document:
                return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

            # 2. Grab the PAST history from the database to send to the AI
            past_messages = document.messages.all()
            chat_history = [{"sender": msg.sender, "text": msg.text} for msg in past_messages]

            # 3. Ask the Unbreakable Router!
            answer = ask_ai_question(question, filename, chat_history)

            # 4. Success! Save both the user's question and AI's answer to the database
            ChatMessage.objects.create(document=document, sender='user', text=question)
            ChatMessage.objects.create(document=document, sender='ai', text=answer)

            return Response({"answer": answer}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"VIEW CRASHED: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": "Failed to process the question with the AI."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            # 1. Find the document (ensure it belongs to the logged-in user)
            document = Document.objects.get(pk=pk, user=request.user)
            
            # 2. Delete the actual file from the Windows media folder
            if document.file and os.path.isfile(document.file.path):
                os.remove(document.file.path)
                
            # 3. Delete the record from the database
            document.delete()
            
            # 4. Tell React it was successful
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Document.DoesNotExist:
            return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
