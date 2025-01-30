from django.shortcuts import redirect, reverse
from django.core.cache import cache
from django.contrib.auth.models import User
from game.models.player.player import Player
import requests
from rest_framework_simplejwt.tokens import RefreshToken  # 手动构建Token

def receive_code(request):
    data = request.GET
    code = data.get('code')
    state = data.get('state')

    if not cache.has_key(state):
        return redirect("index")  # 重定向
    cache.delete(state)

    apply_access_token_url="https://www.acwing.com/third_party/api/oauth2/access_token/"
    params = {
        'appid': "7329",
        'secret': "ae8c5377e13d4078a2a9c8cec059ac4b",
        'code': code
    }
    access_token_res = requests.get(apply_access_token_url, params=params).json()
#    print(access_token_res)

    access_token = access_token_res['access_token']
    openid = access_token_res['openid']

    players = Player.objects.filter(openid=openid)
    if players.exists():  # 如果acw账户对应用户已存在，直接登录
        refresh = RefreshToken.for_user(players[0].user)  # 手动构建token
        # reverse 是 Django 提供的一个函数，它的主要作用是根据视图函数的名称（或者 URL 模式的名称）来反向解析出对应的 URL 路径。
        return redirect(reverse("index") + "?access=%s&refresh=%s" % (str(refresh.access_token), str(refresh)))

    # 获取acwing用户信息
    get_userinfo_url = "https://www.acwing.com/third_party/api/meta/identity/getinfo/"
    params = {
        "access_token": access_token,
        "openid": openid
    }
    userinfo_res = requests.get(get_userinfo_url, params=params).json()
    username = userinfo_res['username']
    photo = userinfo_res['photo']

    # 如果重名，额外添加数字填充
    while User.objects.filter(username=username).exists():
        username += str(randint(0, 9))

    user = User.objects.create(username=username)
    player = Player.objects.create(user=user, photo=photo, openid=openid)
            
    refresh = RefreshToken.for_user(user)
    return redirect(reverse("index") + "?access=%s&refresh=%s" % (str(refresh.access_token), str(refresh)))


