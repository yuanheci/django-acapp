class GameMap extends AcGameObject {
    constructor(playground) {
        super(); 
        this.playground = playground;
        this.$canvas = $(`<canvas tabindex=0></canvas>`); // canvas支持获得焦点
        this.ctx = this.$canvas[0].getContext('2d');

        // set the canvas width and height
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }

    start() {
    }

    update() { 
        this.render(); 
    }

    resize() {
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)"; // resize 完，涂一层不透明的即可
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    render() {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
//        console.log(this.ctx.canvas.width);
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}
