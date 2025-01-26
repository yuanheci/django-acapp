#!/bin/python3
import glob
import sys

# 项目根目录，即acapp
# 这样，当你使用 import 语句导入模块时，Python 解释器会优先在这个目录中查找模块文件。
sys.path.insert(0, glob.glob('../../')[0]) 

from match_server.match_service import Match
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer

from queue import Queue
from time import sleep
from threading import Thread

# 导入channel_layer实例
from acapp.asgi import channel_layer
from asgiref.sync import async_to_sync
from django.core.cache import cache

queue = Queue()  # Python自带的线程安全的队列，可直接作为消息队列

class Player:
    def __init__(self, score, uuid, username, photo, channel_name):
        self.score = score
        self.uuid = uuid
        self.username = username
        self.photo = photo
        self.channel_name = channel_name
        self.waiting_time = 0  # 等待时间

class Pool:
    def __init__(self):
        self.players = []  # 表示匹配池中的玩家

    def add_player(self, player):
        self.players.append(player)

    def check_match(self, a, b):
        dt = abs(a.score - b.score)
        a_max_dif = a.waiting_time * 50
        b_max_dif = b.waiting_time * 50
        return dt <= a_max_dif and dt <= b_max_dif

    # ps: 匹配成功的三名玩家组成的列表
    # 匹配成功后，要把信息从匹配系统返回给server
    # 如果thrift和django server不在同一个服务器上，那么thrift将匹配信息返回，让django server去做channel_layer相关操作即可
    # 这里为了方便，直接在thrift中操作channel layer
    def match_success(self, ps):
        print("Match Success: %s %s %s" % (ps[0].username, ps[1].username, ps[2].username))
        room_name = "room-%s-%s-%s" % (ps[0].uuid, ps[1].uuid, ps[2].uuid)
        players = []
        for p in ps:
            async_to_sync(channel_layer.group_add)(room_name, p.channel_name) # 把channel添加到group中
            players.append({
                'uuid': p.uuid,
                'username': p.username,
                'photo': p.photo,
                'hp': 100,
            })
        cache.set(room_name, players, 3600) # 有效期：1小时
        for p in ps:
            '''
            使用 async_to_sync(channel_layer.group_send) 将 channel_layer.group_send 转换为同步函数，然后传入组名和消息进行调用。
            这样，即使 channel_layer.group_send 是异步函数，也能在 Thrift 服务的同步代码中正常使用。
            '''
            async_to_sync(channel_layer.group_send)( # 组内广播
                room_name,
                {
                    'type': "group_send_event", # 照理说组内每个channel都会收到，从而更新room_name，会通知组内所有成员，所以有3 * len(ps) = 9个gourp_send_event
                    'event': "create_player",
                    'uuid': p.uuid,
                    'username': p.username,
                    'photo': p.photo,
                }
            )

    def increase_waiting_time(self):
        for player in self.players:
            player.waiting_time += 1 # 单位：s

    def match(self):
        while len(self.players) >= 3:
            print("before: ", len(self.players))
            self.players.sort(key=lambda p : p.score)
            print("after sort: ", len(self.players))
            flag = False
            for i in range(len(self.players) - 2):
                a, b, c = self.players[i], self.players[i + 1], self.players[i + 2]
                if self.check_match(a, b) and self.check_match(a, c) and self.check_match(b, c):
                    self.match_success([a, b, c])
                    # 从匹配池中删除这三位已经匹配的玩家
                    self.players = self.players[:i] + self.players[i + 3:]
                    flag = True
                    break
            if not flag:
                break
        self.increase_waiting_time()

# 对外提供的rpc service服务
class MatchHandler:
    def add_player(self, score, uuid, username, photo, channel_name):
        print("Add Player: %s %d" % (username, score))
        player = Player(score, uuid, username, photo, channel_name)
        queue.put(player)  # 加到消息队列
        return 0  # 这里一定要有return 0

def get_player_from_queue():
    try:
        return queue.get_nowait()  # 不阻塞获取
    except:
        return None

# 开一个线程死循环，专门处理消息队列中的玩家
def worker():
    pool = Pool()
    while True:
        player = get_player_from_queue()
        if player:
            pool.add_player(player) # 加到匹配池中
        else:
            # 每隔1s处理一次匹配池中的玩家
            pool.match()
            sleep(1)

if __name__ == '__main__':
    handler = MatchHandler()
    processor = Match.Processor(handler)
    transport = TSocket.TServerSocket(host='127.0.0.1', port=9090)
    tfactory = TTransport.TBufferedTransportFactory()
    pfactory = TBinaryProtocol.TBinaryProtocolFactory()

#    server = TServer.TSimpleServer(processor, transport, tfactory, pfactory)

    # You could do one of these for a multithreaded server
    server = TServer.TThreadedServer(
            processor, transport, tfactory, pfactory)
    # server = TServer.TThreadPoolServer(
    #     processor, transport, tfactory, pfactory)

    # daemon=True表示主线程kill后子线程也kill,可以避免一些资源泄露问题
    Thread(target=worker, daemon=True).start() 

    print('Starting the server...')
    server.serve()
    print('done.')
