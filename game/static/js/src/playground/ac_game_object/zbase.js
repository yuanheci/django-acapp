let AC_GAME_OBJECTS = []; 

class AcGameObject {
    constructor() {
        AC_GAME_OBJECTS.push(this);

        this.has_called_start = false;
        this.timedelta = 0;
        this.uuid = this.create_uuid();
    }
    create_uuid() {
        let res = "";
        for (let i = 0; i < 8; i++) {
            let x = parseInt(Math.floor(Math.random() * 10)); //[0, 10)
            res += x;
        }
        return res
    }
    start() {

    }

    update() {

    }

    late_update() { //每一帧均会执行一次，且在所有update执行完后才执行

    }

    on_destroy() { //the action before delete the obj

    }

    destroy() { //delete the ob
        this.on_destroy();

        for(let i = 0; i < AC_GAME_OBJECTS.length; i++) {
           if (AC_GAME_OBJECTS[i] === this) {
               AC_GAME_OBJECTS.splice(i, 1);
               break;
           }
        }
    }
}

let last_timestamp;
let AC_GAME_ANIMATION = function(timestamp) {
    for (let i = 0; i < AC_GAME_OBJECTS.length; i++) {
        let obj = AC_GAME_OBJECTS[i];
        if (!obj.has_called_start) {
            obj.start();
            obj.has_called_start = true;
        }
        else {
            obj.timedelta = timestamp - last_timestamp;
            obj.update();
        }
    }

    for (let i = 0; i < AC_GAME_OBJECTS.length; i++) {
        let obj = AC_GAME_OBJECTS[i];
        obj.late_update();
    }

    last_timestamp = timestamp;
    requestAnimationFrame(AC_GAME_ANIMATION);
}

requestAnimationFrame(AC_GAME_ANIMATION); //js API


