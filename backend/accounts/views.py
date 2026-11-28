from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Group, User
from .serializers import AuthorSerializer, GroupSerializer, MeSerializer, RegisterSerializer


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class RegisterView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response({**tokens_for(user), "user": self.get_me_data(user)}, status=status.HTTP_201_CREATED)

    def get_me_data(self, user):
        return MeSerializer(user, context=self.get_serializer_context()).data


class MeView(generics.RetrieveAPIView):
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class GroupListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = GroupSerializer
    queryset = Group.objects.all()
    pagination_class = None


class GroupStudentsView(generics.ListAPIView):
    serializer_class = AuthorSerializer
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(group_id=self.kwargs["pk"], role=User.Role.STUDENT).order_by("last_name", "first_name")


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = MeSerializer
    queryset = User.objects.select_related("group")
