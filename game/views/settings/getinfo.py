from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from game.models.player.player import Player

class InfoView(APIView):
    permission_classes = ([IsAuthenticated]) # 渐进式：使用 IsAuthenticated，表示需要jwt验证
    
    def get(self, request):
        user = request.user
        player = Player.objects.get(user=user)
        return Response({
            'result': "success",
            'username': user.username,
            'photo': player.photo,
        })
