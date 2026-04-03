from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document
from .serializers import DocumentSerializer
from .ai_pipeline import process_document # <-- Import your new AI script
import threading # <-- We use this to run the AI in the background

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .llm_router import ask_ai_question

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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Get the question and filename from the React frontend
        question = request.data.get('question')
        filename = request.data.get('filename')

        # 2. Validate the input
        if not question or not filename:
            return Response(
                {"error": "Both 'question' and 'filename' are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Security check: Ensure the user actually owns this document before querying it
        document = (
            Document.objects
            .filter(user=request.user, filename=filename)
            .order_by('-uploaded_at')
            .first()
        )
        if not document:
            return Response(
                {"error": "Document not found or you do not have permission to access it."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. Pass it to our Unbreakable Router!
        try:
            answer = ask_ai_question(question, filename)
            return Response({"answer": answer}, status=status.HTTP_200_OK)
        except Exception as e:
            # --- ADD THESE TWO LINES SO WE CAN SEE THE BUG ---
            print(f"🚨 VIEW CRASHED: {e}")
            import traceback; traceback.print_exc()
            # -------------------------------------------------
            return Response(
                {"error": "Failed to process the question with the AI."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )