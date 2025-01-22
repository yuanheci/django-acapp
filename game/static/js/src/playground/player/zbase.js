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

        if (this.character !== "robot") { //robot使用纯色填充
            this.img = new Image();
            this.img.src = this.photo;
        }
    }
    start() {
        // test 让enemy也去随机游走
        //if (this.character !== "robot") {
        if (this.character === "me") {
            this.add_listening_events();
        } else {
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
            //create rect obj
            const rect = outer.ctx.canvas.getBoundingClientRect();
            //left click: 1, middle click: 2, right click: 3
            if (e.which === 3) {
                outer.move_to((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale);
            } else if (e.which === 1) { //left click
                if (outer.cur_skill === "fireball") {
                    outer.shoot_fireball((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale);
                }
            }
            outer.cur_skill = null;  //shoot once
        });
        this.window_handler = $(window).keydown(function(e) {
            if (e.which == 81) { // q
                outer.cur_skill = "fireball";
                return false;
            }
        });
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
        new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, damage);
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
        this.render();
    }

    update_move() { // 更新玩家移动，封装成一个单独的，因为update中可能有很多操作
        this.spent_time += this.timedelta / 1000;
        // Bot auto shoot
        if (this.character === "robot" && this.spent_time > 4 && Math.random() * 180 < 1) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground
                .players.length)];
            this.shoot_fireball(player.x, player.y);
        }
        if (this.damage_speed > this.eps) { //处于被击退状态
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
    }
    // is needed?
    on_destroy() {
    }
}
