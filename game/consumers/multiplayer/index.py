from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
from django.core.cache import cache

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol

from match_system.src.match_server.match_service import Match
from game.models.player.player import Player
from channels.db import database_sync_to_async

class MultiPlayer(AsyncWebsocketConsumer):
    async def connect(self):
        # django channels中，可以从 scope 中获取当前连接的用户对象。这对于进行权限验证、用户特定的业务逻辑处理非常有用。
        # 这里能这样写，需要实现中间件，位于game/channelsmiddleware.py
        user = self.scope['user']
        if user.is_authenticated:
            await self.accept()
            print('accept')
        else:
            await self.close() # 会触发disconnect方法

    async def disconnect(self, close_code):
        print('disconnect')
        if hasattr(self, 'room_name') and self.room_name:
            await self.channel_layer.group_discard(self.room_name, self.channel_name);

    async def create_player(self, data):
        # 这里room_name初始为空，需要在thrift匹配系统中实现匹配后获得room_name
        # 然后之后的websocket同步操作都是基于这个room_name
        self.room_name = None
        self.uuid = data['uuid']

        #ke socket
        transport = TSocket.TSocket('127.0.0.1', 9090)

        # Buffering is critical. Raw sockets are very slow
        transport = TTransport.TBufferedTransport(transport)

        # Wrap in a protocol
        protocol = TBinaryProtocol.TBinaryProtocol(transport)

        # Create a client to use the protocol encoder
        client = Match.Client(protocol)

        def db_get_player():
            return Player.objects.get(user__username=data['username']) # __表示user"的"username

        # 将一个同步(sync)的数据库操作异步化(async)执行
        player = await database_sync_to_async(db_get_player)()

        # Connect!
        transport.open()

        client.add_player(player.score, data['uuid'], data['username'], data['photo'], self.channel_name)

        # Close!
        transport.close() 


    # async 和 await 的使用相当于协程
    async def move_to(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_send_event",
                'event': "move_to",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty'],
            }
        )

    async def shoot_fireball(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "shoot_fireball",
                    'uuid': data['uuid'],
                    'tx': data['tx'],
                    'ty': data['ty'],
                    'ball_uuid': data['ball_uuid'],
                    }
                )

    async def attack(self, data):
        if not self.room_name:
            return
        players = cache.get(self.room_name)
        if not players:
            return

        for player in players:
            if player['uuid'] == data['attackee_uuid']:
                player['hp'] -= 25

        remain_cnt = 0
        for player in players:
            if player['hp'] > 0:
                remain_cnt += 1

        if remain_cnt > 1:  #继续进行游戏
            if self.room_name:
                cache.set(self.room_name, players, 3600)
        else:  # 结算
            def db_update_player_score(username, score):
                player = Player.objects.get(user__username=username)
                player.score += score
                player.save()
            for player in players:
                if player['hp'] <= 0:
                    await database_sync_to_async(db_update_player_score)(player['username'], -5)
                else:
                    await database_sync_to_async(db_update_player_score)(player['username'], 10)

        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "attack",
                    'uuid': data['uuid'],
                    'attackee_uuid': data['attackee_uuid'],
                    'x': data['x'],
                    'y': data['y'],
                    'angle': data['angle'],
                    'damage': data['damage'],
                    'ball_uuid': data['ball_uuid'],
                    }
                )

    async def blink(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "blink",
                    'uuid': data['uuid'],
                    'tx': data['tx'],
                    'ty': data['ty'],
                    }
                )

    async def message(self, data):
        await self.channel_layer.group_send(
                self.room_name,
                {
                    'type': "group_send_event",
                    'event': "message",
                    'uuid': data['uuid'],
                    'username': data['username'],
                    'text': data['text'],
                    }
                )

    async def group_send_event(self, data): # 接收的名字就是type关键字
        # 确保self.room_name有一个有效的值
        # 这里是通过redis来实现self.room_name的同步，匹配系统中room_name确定值后设置到了redis中，这里通过redis得到room_name
        if not self.room_name:
            keys = cache.keys('*%s*' % (self.uuid))
            if keys:
                self.room_name = keys[0]
        await self.send(text_data=json.dumps(data)) # 发送给前端

    async def receive(self, text_data):  # 标准函数，用于接收前端请求，可做路由
        data = json.loads(text_data)
        event = data['event']
        if event == "create_player":
            await self.create_player(data)
        elif event == "move_to":
            await self.move_to(data)
        elif event == "shoot_fireball":
            await self.shoot_fireball(data)
        elif event == "attack":
            await self.attack(data)
        elif event == "blink":
            await self.blink(data)
        elif event == "message":
            await self.message(data)
