from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
from django.core.cache import cache

class MultiPlayer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        print('accept')
        self.room_name = None
        for i in range(1000):  # 上限1k个房间
            name = "room-%d" % (i)
            # 当前房间为空，或房间内玩家人数不到ROOM_CAPACITY
            if not cache.has_key(name) or len(cache.get(name)) < settings.ROOM_CAPACITY:
                self.room_name = name
                break
        if not self.room_name:
            return

        if not cache.has_key(self.room_name): # 如果房间不存在，则新建房间
            cache.set(self.room_name, [], 3600) # 有效期1小时

        # 对该房间已存在的用户，创建到新加入的用户的游戏界面中
        for player in cache.get(self.room_name):
            await self.send(text_data=json.dumps({
                'event': "create_player",
                'uuid': player['uuid'],
                'username': player['username'],
                'photo': player['photo'],
            }))
            
        # 这里room_name是组，channel_name是每个websocket链接
        # 这里将channel加入group, 这样可以组内通信
        await self.channel_layer.group_add(self.room_name, self.channel_name)

    async def disconnect(self, close_code):
        print('disconnect')
        await self.channel_layer.group_discard(self.room_name, self.channel_name);

    async def create_player(self, data):
        players = cache.get(self.room_name)
        # 加入新的player
        players.append({
            'uuid': data['uuid'],
            'username': data['username'],
            'photo': data['photo']
        })
        cache.set(self.room_name, players, 3600) # 有效期1小时
        # 原则，obj在哪里创建的，就以这里的uuid作为全局uuid使用
        await self.channel_layer.group_send( # 群发消息给组内所有人，通过type字段匹配处理函数
            self.room_name,
            {
                'type': "group_create_player",
                'event': "create_player",
                'uuid': data['uuid'],
                'username': data['username'],
                'photo': data['photo'],
            }
        )
        
    async def group_create_player(self, data): # 接收的名字就是type关键字
        await self.send(text_data=json.dumps(data)) # 发送给前端

    async def receive(self, text_data):  # 标准函数，用于接收前端请求，可做路由
        data = json.loads(text_data)
        print(data)
        event = data['event']
        if event == "create_player":
            await self.create_player(data)

