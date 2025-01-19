from django.shortcuts import redirect
from django.core.cache import cache
from django.contrib.auth.models import User
from game.models.player.player import Player
from django.contrib.auth import login
import requests

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
        login(request, players[0].user)
        return redirect("index")

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
            
    login(request, user)

    return redirect("index")
