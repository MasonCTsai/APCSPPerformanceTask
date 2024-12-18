// gameObjects.js
// holds the object classes for characters like the player,
// enemies, and enemy spawners.

// imports
import { utils } from "./utils.js";
import { dungeonGenerator } from "./dungeon.js";
// generic character class with health, rendering, and movement
export class Character {
    constructor(pos, speed, acceleration, radius, maxHealth, color = [0,0,0]) {
        this.pos = structuredClone(pos);
        this.vel = utils.Vector2();
        this.speed = speed;
        this.acceleration = acceleration;
        this.radius = radius;
        this.bounce = false;
        this.color = color;
        this.iframes = 0;
        this.maxHealth = maxHealth;
        this.health = this.maxHealth;
    }

    // decreases the health by amt and gives knockback to the character based on the position 
    // of the attacking body.  Sets invincibility frames (iframes) for 1 second
    damage(pos, amt = 1) {
        if (this.iframes <= 0) {
            this.iframes = 1.0;
            this.vel = (utils.scale(utils.normalize(utils.subtract(this.pos, pos)), 700));
            this.health -= amt;
        }
    }

    // render a colored square with radius radius 
    // with an outline that flashes red when hurt
    render(r) {
        let b = Math.floor(this.iframes * 10.0) % 2 == 1;
        r.setColor(this.color[0], this.color[1], this.color[2]);
        if (b) r.setColor(255, 0, 0);
        let rect = {x: this.pos.x - this.radius - 1,
                        y: this.pos.y - this.radius - 1,
                        w: this.radius * 2 + 2,
                        h: this.radius * 2 + 2};
        r.drawRectWorld(rect);
        if (!b) r.setColor(this.color[0]-30, this.color[1]-30, this.color[2]-30);
        r.setLineWidth(utils.toScreenX(5));
        r.drawRectWorld(rect, false);
    }

    // the intention of the character to move
    // input is provided through keyboard input
    // by the player for the player character,
    // while enemies use their ai() process to
    // move themselves
    input(i, delta) {
        // moves the velocity by acceleration distance towards a target velocity
        let vel_diff = utils.subtract(utils.scale(i, this.speed), this.vel);
        let vel_diff_l = (Math.sqrt(vel_diff.x * vel_diff.x + vel_diff.y * vel_diff.y));
        if (vel_diff_l > 0) { vel_diff = utils.scale(vel_diff, 1/vel_diff_l); }
        this.vel.x += vel_diff.x * Math.min(vel_diff_l / delta, this.acceleration) * delta;
        this.vel.y += vel_diff.y * Math.min(vel_diff_l / delta, this.acceleration) * delta;
    }

    // moves the character and checks for collision
    move(delta) {
        // NaN check
        if (isNaN(this.vel.x)) this.vel = utils.Vector2();
        // update iframes
        this.iframes -= delta; 
        this.iframes = Math.max(this.iframes, 0);
        let l = Math.sqrt(this.vel.x ** 2 + this.vel.y ** 2);
        let l2 = l; // l2 can decrease so l stays the same
        let max_length = 100;
        // segments the velocity into 100 unit blocks,
        // checking collision each time to avoid clipping
        // no matter how fast, as long as max_length is small enough
        // clipping should be prevented
        for (let i = 0; i < Math.ceil(l / max_length); i++) {
            this.pos.x += this.vel.x * delta * Math.min(l2, max_length) / l;
            this.pos.y += this.vel.y * delta * Math.min(l2, max_length) / l;
            this.handleCollision();
            l2 -= max_length
        }
    }

    // collision detection with the dungeon
    // very over complicated
    handleCollision() {
        let tilepos = utils.world2tile(this.pos);
        let p = utils.subtract(this.pos, utils.tile2world(tilepos));
        let xdiff = Math.min(p.x, utils.roomSize - p.x)
        let ydiff = Math.min(p.y, utils.roomSize - p.y);
        // gives priority to the axis where the player is closer to a wall
        // prevents hitting the seam between walls
        if (xdiff > ydiff) {
            let xColl = this.handleCollisionAxis(p.x, p.y, tilepos.x, tilepos.y, this.pos.x, this.vel.x, false, this.bounce);
            this.pos.x = xColl.pos;
            this.vel.x = xColl.vel;
            p.x = xColl.px;
            let yColl = this.handleCollisionAxis(p.y, p.x, tilepos.x, tilepos.y, this.pos.y, this.vel.y, true, this.bounce);
            this.pos.y = yColl.pos;
            this.vel.y = yColl.vel;
            p.y = yColl.px;
        } else {
            let yColl = this.handleCollisionAxis(p.y, p.x, tilepos.x, tilepos.y, this.pos.y, this.vel.y, true, this.bounce);
            this.pos.y = yColl.pos;
            this.vel.y = yColl.vel;
            p.y = yColl.px;
            let xColl = this.handleCollisionAxis(p.x, p.y, tilepos.x, tilepos.y, this.pos.x, this.vel.x, false, this.bounce);
            this.pos.x = xColl.pos;
            this.vel.x = xColl.vel;
            p.x = xColl.px;
        }
    }

    // helper function that attempts to reduce repetition
    // x and y labels are not necessarily x and y, but
    // can be switched around to handle a different axis
    // the setting of the right axis values for velocity and
    // the such is handled by the caller
    handleCollisionAxis(px, py, tx, ty, pos, vel, flip = false, bounce = false) {
        let obj = {pos: pos, vel: vel, px: px}; // return object
        // checks the next room in each direction, as well as ones on the other axis,
        // to account for corners
        // if bounce is true, the velocity is reflected on collision, but otherwise set to 0
        // also sets the player position to be exactly at the edge of the tile
        if (px < this.radius) {
            let b = false;
            if (py < this.radius) b = b || dungeonGenerator.getTile(tx - 1, ty - 1) == 1;
            if (py > utils.roomSize - this.radius) {
                if (flip) {b = b || dungeonGenerator.getTile(tx + 1, ty - 1) == 1;}
                else {b = b || dungeonGenerator.getTile(tx - 1, ty + 1) == 1;}
            }
            if (flip) b = b || dungeonGenerator.getTile(tx, ty - 1);
            else b = b || dungeonGenerator.getTile(tx - 1, ty);
            if (b) {
                obj.pos = pos - (px - this.radius);
                obj.vel = 0;
                if (bounce) obj.vel = -vel;
                obj.px = this.radius;
            }
        } else if (px > utils.roomSize - this.radius) {
            let b = false;
            if (py < this.radius) {
                if (flip) {b = b || dungeonGenerator.getTile(tx - 1, ty + 1);}
                else {b = b || dungeonGenerator.getTile(tx + 1, ty - 1) == 1;}
            }
            if (py > utils.roomSize - this.radius) b = b || dungeonGenerator.getTile(tx + 1, ty + 1) == 1;
            if (flip) b = b || dungeonGenerator.getTile(tx, ty + 1);
            else b = b || dungeonGenerator.getTile(tx + 1, ty);
            if (b) {
                obj.pos = pos + utils.roomSize - px - this.radius;
                obj.vel = 0;
                if (bounce) obj.vel = -vel;
                obj.px = utils.roomSize - this.radius;
            }
        }
        return obj;
    }
}

// an enemy class inheriting from the generic character
export class Enemy extends Character {
    // just a position pos for the enemy to start at for spawning convenience
    constructor(pos) {
        // sets stats and color automatically
        super(pos, 420, 1000, 20, 2, [255, 130, 130]);
        // used for movement offset, so enemies don't bunch up
        this.targetOffset = utils.Vector2(Math.random(), Math.random())
        this.targetOffset = utils.scale(this.targetOffset, 2);
        this.targetOffset = utils.subtract(this.targetOffset, utils.Vector2(1,1));
        this.targetOffset = utils.scale(this.targetOffset, 0.5);
        // patrol target, where to go when not seeing the player
        this.targetPos = structuredClone(this.pos);
        // last tile visited, to lower backtracking rates
        this.lastTargetPos = utils.world2tile(this.targetPos);
        // whether the player has been spotted
        this.lockedOn = false;
    }

    // unique to the enemy class, ai() is where the enemy
    // processes the game state and makes decisions based on it
    ai(game, delta) {
        let diff = utils.subtract(game.player.pos, this.pos);
        if (this.lockedOn) { // if the player is spotted
            // move towards the player
            this.input(utils.normalize(utils.add(utils.normalize(diff), this.targetOffset)), delta);
            // if the player is out of range or the line of sight is blocked, lock off
            if (utils.slength(diff) > 500**2 || !utils.isNaNV(utils.raycast(game.player.pos, this.pos))) this.lockedOn = false;
        } else { // if the player isn't spotted
            // if the player is within 500 world units and there is a line of sight to it, lock on
            if (utils.slength(diff) <= 500**2 && utils.isNaNV(utils.raycast(game.player.pos, this.pos))) this.lockedOn = true;
            // if within 50 world units of the target position, or line of sight to it is blocked, 
            // recalculate the target position
            if (utils.slength(utils.subtract(this.targetPos, this.pos)) <= 50**2 || !utils.isNaNV(utils.raycast(this.targetPos, this.pos))) {
                this.calculateTargetPos();
            }
            // move towards the target position
            this.input(utils.normalize(utils.subtract(this.targetPos, this.pos)), delta);
        }
    }

    // calculate a new target position
    // it should be a random adjacent room that isn't a wall
    // and the last visited room is discouraged through bias
    calculateTargetPos() {
        let room = utils.world2tile(this.pos);
        let roomPos = utils.subtract(this.pos, utils.tile2world(room));
        roomPos = utils.add(utils.scale(utils.subtract(roomPos, utils.Vector2(utils.roomSize / 2)), 1 / 1.0), utils.Vector2(utils.roomSize / 2));
        let options = [];
        // check if the 4 adjacent rooms are walls, and add them as an option if not
        if (dungeonGenerator.getTile(room.x + 1, room.y) == 0) options.push(utils.Vector2(room.x + 1, room.y));
        if (dungeonGenerator.getTile(room.x - 1, room.y) == 0) options.push(utils.Vector2(room.x - 1, room.y));
        if (dungeonGenerator.getTile(room.x, room.y + 1) == 0) options.push(utils.Vector2(room.x, room.y + 1));
        if (dungeonGenerator.getTile(room.x, room.y - 1) == 0) options.push(utils.Vector2(room.x, room.y - 1));
        let l = options.length;
        for (let i = 0; i < l; i++) {
            // if the option isn't to backtrack, add it 20 more 
            // times to dilute and bias towards non-backtracking options
            if (!utils.isEqual(options[i], this.lastTargetPos)) {
                for (let j = 0; j < 20; j++) {options.push(options[i]);}
            }
        }
        this.lastTargetPos = room;
        // get the target position based on the position in the current room and the target room
        this.targetPos = utils.add(utils.scale(this.targetOffset, 50), utils.add(roomPos, utils.tile2world(options[Math.floor(Math.random() * options.length)])));
    }
}

// enemy spawner class based on the enemy class
// larger, pink, and includes a spawnTimer for 
// enemy spawning intervals
// also has much more health
export class EnemySpawner extends Enemy {
    constructor(pos) {
        super(pos);
        this.radius = 50;
        this.acceleration = 5000;
        this.color = [255, 100, 255];
        this.spawnTimer = 2.5 + 2.5 * Math.random();
        this.health = 5;
        this.maxHealth = 5;
    }
    
    // custom rendering to make the spawner an octagon instead of a square
    render(r) {
        let b = Math.floor(this.iframes * 10.0) % 2 == 1;
        r.setColor(this.color[0], this.color[1], this.color[2]);
        if (b) r.setColor(255, 0, 0);
        let points = [];
        for (let i = Math.PI / 8; i <= Math.PI * 2.125; i += Math.PI / 4) {
            points.push(utils.add(this.pos, utils.scale(utils.Vector2(Math.cos(i), Math.sin(i)), this.radius)));
        }
        r.drawPolygonWorld(points);
        if (!b) r.setColor(this.color[0]-30, this.color[1]-30, this.color[2]-30);
        r.setLineWidth(utils.toScreenX(10));
        r.drawPolygonWorld(points, false);
    }

    // the enemy spawner is stationary, 
    // but will spawn enemies about every 30 seconds
    ai(game, delta) { 
        this.input(utils.Vector2(), delta); // don't move, and try to stop moving when pushed
        this.spawnTimer -= delta; // update spawnTimer
        // if the player is within 500 world units, decrease spawnTimer 5 times faster
        if (utils.slength(utils.subtract(game.player.pos, this.pos)) < 500**2) this.spawnTimer -= delta * 4;
        // if the spawnTimer hits 0, set it back to 30,
        // and spawn 2-3 enemies in a circle around the spawner
        if (this.spawnTimer <= 0) {
            this.spawnTimer = 30.0;
            let angle = Math.random() * Math.PI * 2.0;
            let e = (Math.random() <= 0.2) ? 3 : 2;
            for (let i = 0; i < e; i++) {
                let enemy = new Enemy(utils.add(this.pos, utils.scale(utils.Vector2(Math.cos(angle + Math.PI * 2 * i / e), Math.sin(angle + Math.PI * 2 * i / e)), this.radius * 1.5)));
                game.enemies.push(enemy);
            }
        }
    }
}
