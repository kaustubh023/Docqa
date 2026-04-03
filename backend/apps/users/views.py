from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import logout as django_logout
from django.http import JsonResponse

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from .models import CustomUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class CookieTokenRefreshView(TokenRefreshView):
    """Custom refresh view that reads refresh token from cookie"""
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {"detail": "Refresh token not found in cookie."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        data = request.data.copy()
        data['refresh'] = refresh_token
        serializer = self.get_serializer(data=data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class RegisterView(APIView):
    """User registration endpoint with refresh token in cookie"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            response = Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'is_staff': user.is_staff, # Added for Frontend
            }, status=status.HTTP_201_CREATED)
            
            response.set_cookie(
                'refresh_token',
                str(refresh),
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=7 * 24 * 60 * 60,
                path='/api/users/token/refresh/'
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """User login endpoint with refresh token in cookie"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Return user details so React knows if this is an Admin
            response = Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'is_staff': user.is_staff, # Added for Frontend
                'username': user.username   # Added for Frontend
            }, status=status.HTTP_200_OK)
            
            response.set_cookie(
                'refresh_token',
                str(refresh),
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=7 * 24 * 60 * 60,
                path='/api/users/token/refresh/'
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    """User logout - blacklist refresh token and delete cookie"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
            response.delete_cookie('refresh_token', path='/api/users/token/refresh/')
            return response
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MeView(APIView):
    """Get current user information"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)