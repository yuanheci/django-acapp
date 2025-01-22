class MultiPlayerSocket {
    constructor(playground) {
        this.playground = playground;
        this.ws = new WebSocket("wss://webapp.yuanheci.site/wss/multiplayer/");
        this.start();
        this.uuid = 0;
    }
    start() {
        this.receive();
    }

    receive() {
        let outer = this;
        this.ws.onmessage = function(e) {
            let data = JSON.parse(e.data)
            let uuid = data.uuid;
            if (uuid === outer.uuid) return false; // 是自己则直接pass

            let event = data.event;
            if (event === "create_player") {
                outer.receive_create_player(uuid, data.username, data.photo); //调用相应函数去接收处理
            }
        };
    }
    send_create_player(username, photo) {
        let outer = this;
        console.log(outer.uuid);
        // 向后台发送请求, 将当前创建出来的"me"信息传过去
        this.ws.send(JSON.stringify({
            'event': 'create_player',
            'uuid': outer.uuid,
            'username': username,
            'photo': photo,
        }));
    }
    // 渲染新加入游戏的玩家，也即使enemy
    receive_create_player(uuid, username, photo) {
        let player = new Player (
            this.playground,
            this.playground.width / 2 / this.playground.scale,
            0.5,
            0.05,
            "white", //会被图片覆盖，所以这里无所谓
            0.15,
            "enemy",
            username,
            photo,
        );
        player.uuid = uuid;
        this.playground.players.push(player); //这样就会在player中参与渲染
    }
}
