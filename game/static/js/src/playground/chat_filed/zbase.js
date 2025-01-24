class ChatField {
    constructor(playground) { // 不用canvas绘制，直接以html内容形式即可
        this.playground = playground;

        this.$history = $(`<div class="ac-game-chat-field-history"></div>`);
        this.$input = $(`<input type="text" class="ac-game-chat-field-input">`);

        this.$history.hide();
        this.$input.hide();

        this.funcid = null;

        this.playground.$playground.append(this.$history);
        this.playground.$playground.append(this.$input);

        this.start();
    }

    start() {
        this.add_listening_events();
    }

    add_listening_events() {
        let outer = this;
        this.$input.keydown(function(e) {
            if (e.which === 27) { // ESC
                outer.hide_input();
                return false;
            } else if (e.which === 13) { //ENTER
                let username = outer.playground.root.settings.username;
                let text = outer.$input.val();
                if (text) {
                    outer.$input.val("");
                    outer.add_message(username, text);
                    outer.playground.mps.send_message(text);
                }
                return false;
            }
        });
    }

    // 每次显示history，要重置定时任务
    show_history() {
        let outer = this;
        this.$history.fadeIn(); //渐渐显示
        if (this.func_id) clearTimeout(this.func_id); //清除这个定时任务
        this.func_id = setTimeout(function() {
            outer.$history.fadeOut();
            outer.func_id = null;
        }, 3000);
    }

    render_message(message) {
        return $(`<div>${message}</div>`);
    }

    add_message(username, text) {
        this.show_history();
        let message = `[${username}] ${text}`;
        this.$history.append(this.render_message(message));
        this.$history.scrollTop(this.$history[0].scrollHeight);  //始终显示最新内容（滚动条自动保持下拉)
    }

    show_input() {
        this.show_history();
        this.$input.show();
        this.$input.focus(); //输入时，聚焦于输入框
    }

    hide_input() {
        this.$input.hide();
        this.playground.game_map.$canvas.focus(); //退出时，聚焦回游戏界面
    }
}
