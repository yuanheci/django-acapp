class MultiPlayerSocket {
    constructor(playground) {
        this.playground = playground;
        // wss加上token验证
        this.ws = new WebSocket("wss://webapp.yuanheci.site/wss/multiplayer/?token=" + playground.root.access);
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
            } else if (event === "move_to") {
                outer.receive_move_to(uuid, data.tx, data.ty);
            } else if (event === "shoot_fireball") {
                outer.receive_shoot_fireball(uuid, data.tx, data.ty, data.ball_uuid);
            } else if (event === "attack") {
                outer.receive_attack(uuid, data.attackee_uuid, data.x, data.y, data.angle, data.damage, data.ball_uuid); 
            } else if (event === "blink") {
                outer.receive_blink(uuid, data.tx, data.ty);
            } else if (event === "message") {
                outer.receive_message(data.username, data.text);
            }
        };
    }
    send_create_player(username, photo) {
        let outer = this;
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
    send_move_to(tx, ty) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': 'move_to',
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty,
        }));
    }
    get_player(uuid) {
        let players = this.playground.players;
        for (let i = 0; i < players.length; i++) {
            let player = players[i];
            if (player.uuid === uuid) {
                return player;
            }
        }
        return null;
    }
    receive_move_to(uuid, tx, ty) {
        let player = this.get_player(uuid);
        if (player) {
            player.move_to(tx, ty);
        }
    }
    send_shoot_fireball(tx, ty, ball_uuid) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': 'shoot_fireball',
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty,
            'ball_uuid': ball_uuid,
        }));
    }
    receive_shoot_fireball(uuid, tx, ty, ball_uuid) {
        let player = this.get_player(uuid);
        if (player) { //还存活
            let fireball = player.shoot_fireball(tx, ty);
            fireball.uuid = ball_uuid;
        }
    }
    // 前端Fireball调用这里, 发给中心服务器
    send_attack(attackee_uuid, x, y, angle, damage, ball_uuid) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "attack",
            'uuid': outer.uuid,
            'attackee_uuid': attackee_uuid,
            'x': x,
            'y': y,
            'angle': angle,
            'damage': damage,
            'ball_uuid': ball_uuid,
        }));
    }
    receive_attack(uuid, attackee_uuid, x, y, angle, damage, ball_uuid) {
        let attacker = this.get_player(uuid);
        let attackee = this.get_player(attackee_uuid);
        if (attacker && attackee) {
            // 调用Player类的方法receive_attack，将位置同步成传过来的位置
            attackee.receive_attack(x, y, angle, damage, ball_uuid, attacker);
        }
    }
    send_blink(tx, ty) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "blink",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty,
        }));
    }
    receive_blink(uuid, tx, ty) {
        let player = this.get_player(uuid);
        if (player) {
            player.blink(tx, ty);
        }
    }

    send_message(text) {
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "message",
            'uuid': outer.uuid,
            'username': outer.playground.root.settings.username,
            'text': text,
        }));
    }

    receive_message(username, text) {
        this.playground.chat_field.add_message(username, text);
    }
}
