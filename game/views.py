from django.http import HttpResponse

# Create your views here.

def index(request):
    line1 = '<h1 style="text-align: center">赛尔号</h1>'
    line4 = '<a href="/play">进入游戏界面</a>'
    line3 = '<hr>'
    line2 = '<img src="https://ts4.cn.mm.bing.net/th?id=OIP-C.AK9jX3d1Ut5VxoxcQ_oDWwHaFj&w=288&h=216&c=8&rs=1&qlt=90&o=6&dpr=1.3&pid=3.1&rm=2" width=1000>'
    return HttpResponse(line1 + line4 + line3 + line2)

def play(request):
    line1 = '<h1 style="text-align:center">游戏界面</h1>'
    line2 = '<hr>'
    line3 = '<a href="/">返回主页面</a>'
    line4 = '<img src="https://pic4.zhimg.com/v2-91958bda020aca2902378e0f8714569f_r.jpg" width=1000>'
    return HttpResponse(line1 + line3 + line2 + line4)
