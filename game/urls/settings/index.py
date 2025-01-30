from django.urls import path, include
from game.views.settings.getinfo import InfoView
from game.views.settings.register import PlayerView
from game.views.settings.ranklist import RanklistView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # 相当于登录(返回token与refresh，token为了安全时间为5min，refresh时间为14day)
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # 刷新token(返回token，refresh过期则重新登录)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # 获取登录信息
    path("getinfo/", InfoView.as_view(), name="settings_getinfo"),
    # 注册
    path("register/", PlayerView.as_view(), name="settings_register"),
    path("ranklist/", RanklistView.as_view(), name="settings_ranklist"),

    path("acwing/", include("game.urls.settings.acwing.index")),
    path("qq/", include("game.urls.settings.qq.index")),
]
