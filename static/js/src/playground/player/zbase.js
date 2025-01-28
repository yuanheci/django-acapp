class Player extends AcGameObject {
    constructor(playground, x, y, radius, color, speed, character, username, photo) {
        super();
        // save the info
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.move_length = 0; // the last move distance
        this.color = color;
        this.speed = speed;
        this.radius = radius;
        this.character = null 
        this.eps = 0.01;
        // selected skill
        this.cur_skill = null;
        this.friction = 0.9;
        this.spent_time = 0;

        this.character = character;
        this.username = username;
        this.photo = photo;

        this.fireballs = [];  //存储该用户发射的所有火球，在同步时传给其他玩家，便于删除

        if (this.character !== "robot") { //robot使用纯色填充
            this.img = new Image();
            this.img.src = this.photo;
        }
        if (this.character === "me") {
            this.fireball_coldtime = 0.1  //单位：s
            this.fireball_img = new Image();
            this.fireball_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_9340c86053-fireball.png";
            
            //闪现技能
            this.blink_coldtime = 5;
            this.blink_img = new Image();
            this.blink_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_daccabdc53-blink.png";
        }
    }
    start() {
        this.playground.player_count++;
        this.playground.notice_board.write("已就绪：" + this.playground.player_count + "人");
        if (this.playground.player_count >= 3) {  //控制游戏人数
            this.playground.state = "fighting";
            this.playground.notice_board.write("Fighting");
        }
        // 只有bot才会随机游走, 这里不对enemy处理，因为enemy信息是接收到的
        if (this.character === "me") {
            this.add_listening_events();
        } else if (this.character === "robot") {
            let tx = Math.random() * this.playground.width / this.playground.scale;
            let ty = Math.random() * this.playground.height / this.playground.scale;
            this.move_to(tx, ty);
        }
    }

    add_listening_events() {
        let outer = this;
        this.playground.game_map.$canvas.on("contextmenu", function() {
            return false;
        });
        // right click control the move
        this.mousedown_handler = this.playground.game_map.$canvas.mousedown(function(e) {
            // 只有当fighting状态才能移动，射击，释放技能
            if (outer.playground.state !== "fighting")  //状态机
                return false;
            //create rect obj
            const rect = outer.ctx.canvas.getBoundingClientRect();
            //left click: 1, middle click: 2, right click: 3
            if (e.which === 3) {
                let tx = (e.clientX - rect.left) / outer.playground.scale
                let ty = (e.clientY - rect.top) / outer.playground.scale
                outer.move_to(tx, ty);
                // 如果是多人模式，同步move信息
                if (outer.playground.mode === "multi mode") {
                    outer.playground.mps.send_move_to(tx, ty);
                }
            } else if (e.which === 1) { //left click
                let tx = (e.clientX - rect.left) / outer.playground.scale
                let ty = (e.clientY - rect.top) / outer.playground.scale
                if (outer.cur_skill === "fireball") {
                    let fireball = outer.shoot_fireball(tx, ty);
                    if (outer.playground.mode === "multi mode") {
                        outer.playground.mps.send_shoot_fireball(tx, ty, fireball.uuid);
                    }
                    outer.fireball_coldtime = 0.1;  //火球释放后，重启冷却时间
                } else if (outer.cur_skill === "blink") {
                    outer.blink(tx, ty);
                    // 同步函数
                    if (outer.playground.mode === "multi mode") {
                        outer.playground.mps.send_blink(tx, ty);
                    }
                    outer.blink_coldtime = 5;
                }
            }
            outer.cur_skill = null;  //清空当前技能
        });
        // keydown监听事件绑定到canvas上，canvas需要修改以支持监听（获得焦点）
        this.window_handler = this.playground.game_map.$canvas.keydown(function(e) {
            if (outer.playground.state !== "fighting") 
                return true; 
            if (e.which === 81) { // q
                if (outer.fireball_coldtime >= outer.eps)
                    return true;
                outer.cur_skill = "fireball";
                return false;
            } else if (e.which === 70) { //f
                if (outer.blink_coldtime >= outer.eps) return true;
                outer.cur_skill = "blink";
                return false;
            } else if (e.which === 13) {  //enter(显示对话框)
                if (outer.playground.mode === "multi mode") {
                    outer.playground.chat_field.show_input(); //input和history都会显示
                    return false;
                }
            } else if (e.which === 27) { //esc(关闭对话框)
                if (outer.playground.mode === "multi mode") {
                    outer.playground.char_field.hide_input();
                    return false;
                }
            }
        });
    }

    blink(tx, ty) {
        let d = this.get_dist(this.x, this.y, tx, ty);
        d = Math.min(d, 0.5); //限制最远闪现距离, 这里是相对值
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.x += d * Math.cos(angle);
        this.y += d * Math.sin(angle);
        this.move_length = 0; //闪现完就停下来
    }

    remove_listening_events() {
        this.playground.game_map.$canvas.off("mousedown", this.mousedown_handler);
        $(window).off("keydown", this.window_handler);
    }

    // 标准化, 用相对值表示
    shoot_fireball(tx, ty) {
        let x = this.x, y = this.y; 
        let radius = this.playground.height * 0.01 / this.playground.scale; 
        let angle = Math.atan2(ty - this.y, tx - this.x);
        let vx = Math.cos(angle), vy = Math.sin(angle);
        let color = "orange";
        let speed = this.playground.height * 0.5 / this.playground.scale;
        let move_length = this.playground.height * 1.0 / this.playground.scale;
        let damage = this.playground.height * 0.01 / this.playground.scale; // 0.01
        let fireball = new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, damage);
        this.fireballs.push(fireball);
        return fireball;
    }

    // 删除这个火球
    destroy_fireball(uuid) {
        for (let i = 0; i < this.fireballs.length; i++){
            let fireball = this.fireballs[i]
            if (fireball.uuid == uuid) {
                fireball.destroy();
                break;
            }
        }
    }

    get_dist (x1, y1, x2, y2) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    move_to(tx, ty) {
        // calc the move distance
        this.move_length = this.get_dist(this.x, this.y, tx, ty);
        // calc the move angle, the API is: atan2(dy, dx)
        let angle = Math.atan2(ty - this.y, tx - this.x);
        // 单位圆
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
    }

    is_attacked(angle, damage) {
        //particle 
        for (let i = 0; i < 10 + Math.random() * 5; i++) {
            let x = this.x, y = this.y;
            let radius = this.radius * Math.random() * 0.1;
            let angle = 2 * Math.PI * Math.random();
            let vx = Math.cos(angle), vy = Math.sin(angle);
            let color = this.color;
            let speed = this.speed * 10;
            new Particle(this.playground, x, y, radius, vx, vy, color, speed);
        }

        this.radius -= damage; 
        if (this.radius < this.eps) {
            this.destroy();
            if (this.character === "me")
                this.remove_listening_events();
            return false;
        }
        this.damage_vx = Math.cos(angle);
        this.damage_vy = Math.sin(angle);
        this.damage_speed = damage * 100;
        this.speed *= 0.5;
    }

    // 死亡后，从全局数组中移除，因此不会执行update, bot不会自动射击
    update() {
        this.update_move();
        this.update_win();
        // 只需要更新维护自己的冷却时间
        if (this.character === "me" && this.playground.state === "fighting") {
            this.update_coldtime();
        }
        this.render();
    }

    update_win() {
        //竞赛状态，有且只有一名玩家，且该玩家就是我，则胜利
        if (this.playground.state === "fighting" && this.character === "me" && this.playground.players.length === 1) {
            this.playground.state = "over";
            this.playground.score_board.win();
        }
    }

    update_coldtime() {
        this.fireball_coldtime -= this.timedelta / 1000;
        this.fireball_coldtime = Math.max(0, this.fireball_coldtime);
        this.blink_coldtime -= this.timedelta / 1000;
        this.blink_coldtime = Math.max(0, this.blink_coldtime);
    }

    update_move() { // 更新玩家移动，封装成一个单独的，因为update中可能有很多操作
        this.spent_time += this.timedelta / 1000;
        // Bot auto shoot
        if (this.character === "robot" && this.spent_time > 4 && Math.random() * 180 < 1) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground
                .players.length)];
            this.shoot_fireball(player.x, player.y);
        }
        if (this.damage_speed > this.eps) { //如果damage_speed有值，说明处于被击退状态
            this.vx = this.vy = 0;
            this.move_length = 0;
            this.x += this.damage_vx * this.damage_speed * this.timedelta / 1000;
            this.y += this.damage_vy * this.damage_speed * this.timedelta / 1000;
            this.damage_speed *= this.friction;
        } else {
            if (this.move_length < this.eps) {
                this.move_length = 0;
                this.vx = this.vy = 0;
                if (this.character === "robot") { //is bot
                    let tx = Math.random() * this.playground.width / this.playground.scale;
                    let ty = Math.random() * this.playground.height / this.playground.scale;
                    this.move_to(tx, ty);
                }
            } else {
                // calc the move distance in every frame
                let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
                this.x += this.vx * moved;
                this.y += this.vy * moved;
                // substrate the movde
                this.move_length -= moved;
            }
        }
    }
    
    // 由Multi类调用
    // 接收同一局中其他玩家发来的attack同步信息, 与send_attack对应
    // 自己被别人判定被击中后，将自己的位置变成attacker传过来的位置
    receive_attack(x, y, angle, damage, ball_uuid, attacker) {
        attacker.destroy_fireball(ball_uuid);
        this.x = x;
        this.y = y;
        this.is_attacked(angle, damage);
    }

    render() {
        let scale = this.playground.scale
        if (this.character !== "robot") { //头像渲染
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.stroke();
            this.ctx.clip();
            this.ctx.drawImage(this.img, (this.x - this.radius) * scale, (this.y - this.radius) * scale,
                                this.radius * 2 * scale, this.radius * 2 * scale);
            this.ctx.restore();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, 2 * Math.PI, false);
            this.ctx.fillStyle = this.color;
            this.ctx.fill();
        }
        if (this.character === "me" && this.playground.state === "fighting") {
            this.render_skill_coldtime();
        }
    }

    render_skill_coldtime() {
        let scale = this.playground.scale;
        let x = 1.5, y = 0.9, r = 0.04;

        // 火球技能
        //渲染技能图标
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.fireball_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale);
        this.ctx.restore();

        //渲染冷却提示
        if (this.fireball_coldtime >= this.eps) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.fireball_coldtime / 3.0) - Math.PI / 2, true);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }

        // 闪现技能
        x = 1.62, y = 0.9, r = 0.04;
        // 渲染技能图标
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.blink_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale);
        this.ctx.restore();

        // 渲染冷却指示
        if (this.blink_coldtime >= this.eps){
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.blink_coldtime / 5.0) - Math.PI / 2, true);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }
    }

    // destroy中会调用这个on_destroy()
    on_destroy() {
        // 得从playground.players中删除
        for (let i = 0; i < this.playground.players.length; i++) {
            if (this.playground.players[i] === this) {
                this.playground.players.splice(i, 1);
            }
        }
        // 我死亡，且游戏处于竞赛状态，则失败
        if (this.character === "me" && this.playground.state === "fighting") {
            this.playground.state = "over";
            this.playground.score_board.lose();
        }
    }
}
