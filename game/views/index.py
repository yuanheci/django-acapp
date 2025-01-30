from django.shortcuts import render

def index(request):
    data = request.GET
    context = {
        'access': data.get("access", ""),
        'refresh': data.get("refresh", "")
    }
    # context：将之前构建的上下文数据传递给模板，这样在模板中就可以使用 {{ access }} 和 {{ refresh }} 来获取相应的值。
    return render(request, "multiends/web.html", context)
