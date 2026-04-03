from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Permission to only allow admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to allow object owner or admin to access.
    """
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user and request.user.role == 'admin':
            return True
        # Otherwise, only the owner can access
        return obj.user == request.user