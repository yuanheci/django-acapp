from django.db import models
from django.contrib.auth.models import User

class Player(models.Model): # Player类继承自Model类
    # 说明Player是从User表扩充过来的，每个player与一个user是一一对应的关系
    # 后一个参数说明，当user被删除后，对应的player也要被删除

    # 这里的 user 是当前模型的一个字段，类型是 OneToOneField
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # 类的实例化，赋值给photo, 也是一个字段
    photo = models.URLField(max_length=256, blank=True)
    openid = models.CharField(default="", max_length=256, blank=True, null=True)
    score = models.IntegerField(default=1500)

    def __str__(self):
        return str(self.user) # 展示用户的用户名
