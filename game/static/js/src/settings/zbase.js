class Settings {
    constructor(root) {
        this.root = root;
        this.username = "";
        this.photo = "";
        this.platform = "WEB";
        if (this.root.AcWingOS) this.platform = "ACAPP";

        this.$settings = $(`
<div class="ac-game-settings">
    <div class="ac-game-settings-login">
        <div class="ac-game-settings-title">
            登录
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div> 
        <div class="ac-game-settings-password">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>登录</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            注册
        </div>
        <br>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app165.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
                AcWing登录
            </div>
        </div>
        <div class="ac-game-settings-qq">
            <img width="30" src="https://webapp.yuanheci.site/static/image/settings/qq_logo.png">
            <br>
            <div class="ac-game-settings-qq-login-item">
                QQ登录
            </div>
        </div>
    </div>

    <div class="ac-game-settings-register">
        <div class="ac-game-settings-title">
            注册
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div> 
        <div class="ac-game-settings-password ac-game-settings-password-first">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-second">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="确认密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>注册</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            登录
        </div>
        <br>
    </div>
</div>
`);
        this.$login = this.$settings.find(".ac-game-settings-login");
        this.$login_username = this.$login.find(".ac-game-settings-username input");
        this.$login_password = this.$login.find(".ac-game-settings-password input");
        this.$login_submit = this.$login.find(".ac-game-settings-submit button");
        this.$login_error_message = this.$login.find(".ac-game-settings-error-message");
        this.$login_register = this.$login.find(".ac-game-settings-option");

        this.$login.hide();

        this.$register = this.$settings.find(".ac-game-settings-register");
        this.$register_username = this.$register.find(".ac-game-settings-username input");
        this.$register_password = this.$register.find(".ac-game-settings-password-first input");
        this.$register_password_confirm = this.$register.find(".ac-game-settings-password-second input");
        this.$register_submit = this.$register.find(".ac-game-settings-submit button");
        this.$register_error_message = this.$register.find(".ac-game-settings-error-message");
        this.$register_login = this.$register.find(".ac-game-settings-option");

        this.$acwing_login = this.$settings.find('.ac-game-settings-acwing img');
        this.$qq_login = this.$settings.find('.ac-game-settings-qq img');

        this.$register.hide();

        this.root.$ac_game.append(this.$settings);

        this.start();
    }
    start() {
        if (this.root.access) { //已经拥有token
            this.getinfo();
            this.refresh_jwt_token();
        } else {
            this.login(); // 打开登录界面
        }
        this.add_listening_events();
    }

    refresh_jwt_token() {
        let outer = this;
        setInterval(function() { // setInterval会间隔指定时间重复执行 
            $.ajax({
                url: "https://webapp.yuanheci.site/settings/token/refresh/",
                type: "post",
                data: {
                    refresh: outer.root.refresh,  // 把refresh传过去来获取最新的token
                },
                success: function(resp) {
                    outer.root.access = resp.access;
                }
            });
        }, 4.5 * 60 * 1000);

        setTimeout(function() { //setTimeout只会时间到了执行一次
            $.ajax({
                url: "https://webapp.yuanheci.site/settings/ranklist/",
                type: "get",
                headers: {
                    "Authorization": "Bearer " + outer.root.access,
                },
                success: function(resp) {
                    console.log(resp);
                }
            });
        }, 5000);
    }

    add_listening_events() {
        let outer = this;
        this.add_listening_events_login();
        this.add_listening_events_register();
        this.$acwing_login.click(function() {
            outer.acwing_login();
        });
        this.$qq_login.click(function() {
            outer.qq_login();
        });
    }

    acwing_login() {
        let outer = this;
        $.ajax({
            url: "https://webapp.yuanheci.site/settings/acwing/web/apply_code/",
            type: "GET",
            success: function(resp) {
                if (resp.result === "success") {
                    window.location.replace(resp.apply_code_url);
                }
            }
        });
    }

    qq_login() {
        var url = window.location.href;
        $.ajax({
            url: url + "settings/qq/apply_code/",
            type: "GET",
            success: function (resp) {
                if (resp.result === "success") {
                    window.location.replace(resp.apply_code_url);
                }
            }
        });
    }

    add_listening_events_login() {
        let outer = this;
        this.$login_register.click(function() {
            outer.register(); //跳到注册界面
        });
        this.$login_submit.click(function() {
            outer.login_on_remote();
        });
    }
    add_listening_events_register() {
        let outer = this;
        this.$register_login.click(function() {
            outer.login();  //跳到登录界面
        });
        this.$register_submit.click(function() { // 提交注册
            outer.register_on_remote();
        });
    }

    register_on_remote() { //在远程服务器上注册
        let outer = this;
        let username = this.$register_username.val();
        let password = this.$register_password.val();
        let password_confirm = this.$register_password_confirm.val();
        this.$register_error_message.empty();

        $.ajax({
            url: "https://webapp.yuanheci.site/settings/register/",
            type: "post",
            data: {
                username: username,
                password: password,
                password_confirm: password_confirm,
            },
            success: function(resp) {
                if (resp.result === "success") {
//                    location.reload();  //原先session-cookie方式是在这里刷新一下
                    this.login_on_remote(username, password);  //获取token，就相当于登陆了
                } else {
                    outer.$register_error_message.html(resp.result);
                }
            }
        });
    }

    login_on_remote(username, password) { //在远程服务器上登录
        let outer = this;
        username = username || this.$login_username.val();
        password = password || this.$login_password.val();
        this.$login_error_message.empty();

        $.ajax({
            url: "https://webapp.yuanheci.site/settings/token/", // 获取token
            type: "POST",
            data: {
                username: username,
                password: password,
            },
            success: function(resp) {
                outer.root.access = resp.access;
                outer.root.refresh = resp.refresh;
                // 刷新token
                outer.refresh_jwt_token();
                // 获取登录信息
                outer.getinfo();
            },
            error: function(resp) {
                outer.$login_error_message.html("用户名或密码错误！");
            }
        });
    }

    logout_on_remote() { //在远程服务器上登出
        if (this.platform === "ACAPP") return false;

        // jwt框架下，登出就是把token扔掉即可
        this.root.access = "";
        this.root.refresh = "";
        location.href = "/";
    }

    register() { //打开注册界面
        this.$login.hide();
        this.$register.show();
    }
    login() { //打开登录界面
        this.$register.hide();
        this.$login.show();
    }
    getinfo() {
        let outer = this;
        $.ajax({
            url: "https://webapp.yuanheci.site/settings/getinfo/",
            type: "get",
            data: {
                platform: outer.platform,
            },
            headers: {
                'Authorization': "Bearer " + this.root.access,
            },

            success: function(resp) {
                if (resp.result == "success") { //登录成功，关闭登录界面，打开主菜单
                    outer.username = resp.username;
                    outer.photo = resp.photo;
                    outer.hide();
                    outer.root.menu.show();
                } else {
                    outer.login(); //打开登录界面
                }
            }
        });
    }
    hide() {
        this.$settings.hide();
    }
    show() {
        this.$settings.show();
    }
}
