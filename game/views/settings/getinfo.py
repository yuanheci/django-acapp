from django.http import JsonResponse
from game.models.player.player import Player

def getinfo_acapp(request):
    player = Player.objects.all()[0] # 取出数据库中的第一个用户
    return JsonResponse({
        'result': "success",
        'username': player.user.username,
        'photo': player.photo,
    })

def getinfo_web(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({
            'result': "not login"
        })
    else:
        # 注意filter用于筛出多个复合条件的对象，返回的是可迭代对象QuerySet
        # .get返回的是单一查询
#        players = Player.objects.filter(user=user)
#        player = players[0]
        player = Player.objects.get(user=user)
        return JsonResponse({
            'result': "success",
            'username': player.user.username,
            'photo': player.photo,
        })

def getinfo(request): # 处理请求
    platform = request.GET.get('platform')
    if platform == "ACAPP":
        return getinfo_acapp(request)
    elif platform == "WEB":
        return getinfo_web(request)
    return getinfo_web(request)
