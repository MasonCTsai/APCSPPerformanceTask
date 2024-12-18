// game.js
// the running process that manages all game state variables and 
// rendering functions

// imports
import { render } from "./render.js";
import { Character, Enemy, EnemySpawner } from "./gameObjects.js";
import { utils, camera } from "./utils.js";
import { dungeonGenerator } from "./dungeon.js";

// 1/sqrt(2) but hard coded
const invrt2 = 0.707106781187;

// class for game object
class Game {
    constructor() {
        // initialize all variables to a default value
        camera.pos = null; // the camera's actual position
        this.campos = null; // the camera target position to smooth to
        this.player = null; // the player object
        this.enemies = []; // all the enemies
        this.enemySpawners = 0; // how many enemy spawners are left 

        this.maxDashChargeTime = 0.75; // how long it takes to fully charge a dash
        this.dashChargeTime = 0; // how charged up the dash is
        this.charging = false; // whether the player is currently charging a dash
        this.dashing = false; // whether the player is currently dashing
        this.dashTime = 0; // how long the dash has lasted
        
        this.dashLength = 0.4; // how long the dash lasts
        this.dashSpeed = 1000; // movement speed during the dash

        this.enemyDeathParticles = [] // enemy death particle storage

        this.escaped = false; // escape buffer
        this.visited = []; // a boolean 2d array for whether the minimap should show each room
        this.time = 0.0; // the time in seconds
        this.starting = true; // whether the player is just starting
        this.won = false; // whether the player won on the last reset
        // reset all variables to their default values
        this.reset();
    }
    
    // resets all game state variables and regenerates everything
    reset() {
        // reset variables
        this.time = 0.0;
        this.dashChargeTime = 0.0;
        this.charging = false;
        this.dashing = false;
        this.dashTime = 0;

        this.starting = true;
        utils.paused = true;
        // initialize position values for objects
        camera.pos = utils.Vector2(dungeonGenerator.width * utils.roomSize / 2.0, dungeonGenerator.height * utils.roomSize / 2.0);
        this.campos = structuredClone(camera.pos);
        this.player = new Character(structuredClone(camera.pos), 500, 5000, 15, 3, [100, 150, 230]);
        // regenerate the dungeon
        dungeonGenerator.generateDungeon();
        // reset enemies
        this.enemies = [];
        this.enemySpawners = 0;
        this.enemyDeathParticles = [];
        this.escaped = false;
        this.visited = [];
        // populate visited array
        for (let i = 0; i < dungeonGenerator.width; i++) {
            let row = [];
            for (let j = 0; j < dungeonGenerator.height; j++) row.push(false);
            this.visited.push(row);
        }
        // spawn enemies and spawners
        // and place player
        this.setSpawn();
    }

    // spawn and place enemies and player
    // the player is placed in a random end point
    // and the rest of the end points are given an
    // enemy spawner
    setSpawn() {
        // get a random end point and place the player and camera there
        let pos = dungeonGenerator.popEndPoint();
        this.player.pos = utils.add(utils.tile2world(pos), utils.Vector2(utils.roomSize / 2.0, utils.roomSize / 2.0));
        this.campos = structuredClone(this.player.pos);
        camera.pos = structuredClone(this.player.pos);
        pos = dungeonGenerator.popEndPoint();
        while (!utils.isNaNV(pos)) { // until out of end points
            // make new spawner, and add it to the list of enemies 
            let spawner = new EnemySpawner(utils.add(utils.tile2world(pos), utils.Vector2(utils.roomSize / 2.0)));
            this.enemies.push(spawner);
            pos = dungeonGenerator.popEndPoint();
            this.enemySpawners++; // count the number of spawners
        }
        
    }

    // get and calculate user input
    getInput() {
        let input = utils.Vector2();
        input.x = utils.inputMoveRight() - utils.inputMoveLeft();
        input.y = utils.inputMoveDown() - utils.inputMoveUp();
        // if the input is diagonal, reduce its magnitude to 1
        if (input.x != 0 && input.y != 0) {
            input.x *= invrt2;
            input.y *= invrt2;
        }
        
        return input;
    }

    // the main game loop, runs every frame before drawing step 
    process(delta) {
        // pause and unpause functionality
        if (utils.paused) {
            if (!utils.inputEscape()) this.escaped = false;
            if (utils.inputEscape() && !this.escaped) {
                utils.paused = false;
                this.escaped = true;
                this.starting = false;
                this.won = false;
            }
            return;
        } else {
            if (!utils.inputEscape()) this.escaped = false;
            if (utils.inputEscape() && !this.escaped) {
                utils.paused = true;
                this.escaped = true;
            }
            this.time += delta;
        }

        // if the player is charging and not dashing, add to dash charge time
        if (this.charging && !this.dashing) this.dashChargeTime += delta;
        // update dash time while dashing
        if (this.dashing) this.dashTime += delta;
        utils.updateMouseWorldPos(); // get the world mouse position
        
        // debug view size changer to zoom in and out
        // utils.setViewSize(utils.viewScale * (1 + 0.01 * utils.input.get("ArrowUp")) / (1 + 0.01 * utils.input.get("ArrowDown")));
        
        // get player input
        let input = this.getInput();

        // allow movement while not dashing
        if (!this.dashing) {
            this.player.input(input, delta);
        }
        // allow velocity to take over
        this.player.move(delta);
        
        // where the camera is trying to go to
        let targetPos = this.player.pos;
        // move towards the target point
        this.campos = utils.add(this.campos, utils.scale(utils.subtract(targetPos, this.campos), 0.1));
 
        // keep the camera from getting too far from the player
        this.campos = utils.subtract(this.campos, this.player.pos);
        let clampDist = 50;
        this.campos = utils.Vector2(Math.max(Math.min(this.campos.x, clampDist), -clampDist), Math.max(Math.min(this.campos.y, clampDist), -clampDist));
        this.campos = utils.add(this.campos, this.player.pos);

        // look ahead offset to let the player look further in the direction of the mouse
        camera.pos = utils.add(this.campos, utils.scale(utils.subtract(utils.Vector2(utils.mousePosition.x, utils.mousePosition.y * 4/3), utils.scale(utils.Vector2(utils.screenScale, utils.screenScale), 0.5)), 0.4));
        // let enemy ai process game state
        for (let i = 0; i < this.enemies.length; i++) this.enemies[i].ai(this, delta);
        // let enemies move with velocity
        for (let i = 0; i < this.enemies.length; i++) this.enemies[i].move(delta);
        
        // check for player collision with an enemy
        for (let i = 0; i < this.enemies.length; i++) {
            if (utils.isColliding(this.player.pos, this.player.radius, this.enemies[i].pos, this.enemies[i].radius)) {
                this.playerHit(this.enemies[i]);
            }
        }
    }

    // draw step called each frame after the process step
    draw(delta) {
        // get the camera so the camera position is the middle of the screen
        let camOffset = utils.subtract(camera.pos, utils.halfView);
        // render the dungeon under everything else
        this.renderDungeon(camOffset);
        
        // start charging if mouse is held and is no currently dashing
        if (utils.mouseDown && !this.dashing) {
            this.charging = true;
            let diff = utils.subtract(utils.mouseWorldPosition, this.player.pos);
            let mouseAngle = Math.atan2(diff.y, diff.x); // get the angle in radians of the player to the mouse
            let arrowRatio = 0.2;
            let arrowLength = Math.min(this.dashChargeTime, this.maxDashChargeTime * arrowRatio) / (this.maxDashChargeTime * arrowRatio);
            render.setColor(140, 250, 180);
            // draw thinner arrow
            this.drawArrow(mouseAngle, 15, 300 * this.ease(arrowLength), this.player.pos);
            arrowLength = Math.min(this.maxDashChargeTime * (1 - arrowRatio), Math.max(0, this.dashChargeTime - this.maxDashChargeTime * arrowRatio)) / (this.maxDashChargeTime * (1 - arrowRatio));
            render.setColor(40, 230, 80);
            // draw larger arrow over the smaller one
            this.drawArrow(mouseAngle, 30, 310 * this.ease(arrowLength), this.player.pos);
            render.setColor(10, 200, 50);
            render.setLineWidth(utils.toScreenX(5));
            render.ctx.stroke();
        } else if (this.charging) {
            // if stopped holding the mouse and was charging, start dashing
            this.charging = false;
            if (this.dashChargeTime > this.maxDashChargeTime * 0.2) {
                this.dashing = true;
                let a = Math.atan2(utils.mouseWorldPosition.y - this.player.pos.y, utils.mouseWorldPosition.x - this.player.pos.x);
                this.player.vel = utils.scale(utils.rotate(utils.Vector2(1, 0), a), this.dashSpeed * Math.min(1, this.dashChargeTime / this.maxDashChargeTime));
                this.player.bounce = true;
            } else {
                this.dashTime = 0;
                this.dashChargeTime = 0;
            }
        } else if (this.dashing) {
            // continue dashing and check for end of dash
            if (this.dashTime >= this.dashLength) {
                this.player.bounce = false;
                this.dashTime = 0;
                this.dashChargeTime = 0;
                this.dashing = false;
                this.player.vel = utils.scale(this.player.vel, this.player.speed / this.dashSpeed);
            }
        }
        
        // enemy death particle rendering
        // loop through each particle and draw it based on lifetime left
        let survivingParticles = [];
        for (let i = 0; i < this.enemyDeathParticles.length; i++) {
            let particle = this.enemyDeathParticles[i];
            particle.lifetime -= delta;
            let box = [];
            if (particle.octagon) { // draw an octagon
                for (let i = (Math.PI / 8) + Math.PI * 2 * particle.lifetime; i <= (Math.PI * 2.125) + Math.PI * 2 * particle.lifetime; i += Math.PI / 4) {
                    box.push(utils.add(particle.pos, utils.scale(utils.Vector2(Math.cos(i), Math.sin(i)), particle.size * particle.lifetime)));
                }
            } else { // draw a square
                box.push(utils.add(utils.scale(utils.rotate(utils.Vector2(1,1), Math.PI * 2 * particle.lifetime), particle.size * particle.lifetime),particle.pos));
                box.push(utils.add(utils.scale(utils.rotate(utils.Vector2(-1,1), Math.PI * 2 * particle.lifetime), particle.size * particle.lifetime),particle.pos));
                box.push(utils.add(utils.scale(utils.rotate(utils.Vector2(-1,-1), Math.PI * 2 * particle.lifetime), particle.size * particle.lifetime),particle.pos));
                box.push(utils.add(utils.scale(utils.rotate(utils.Vector2(1,-1), Math.PI * 2 * particle.lifetime), particle.size * particle.lifetime),particle.pos));
            }
            render.setColor(particle.color[0], particle.color[1], particle.color[2]);
            if (Math.floor(particle.lifetime * 10.0) % 2 == 1) render.setColor(255, 0, 0);
            render.drawPolygonWorld(box);
            // if the particle is at the end of its life, it does not survive
            if (particle.lifetime > 0) {
                survivingParticles.push(particle);
            }
        }
        this.enemyDeathParticles = survivingParticles;

        // render enemies
        for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].render(render);
            // debug render target positions
            // render.setColor(255, 0, 255);
            // render.drawCircleWorld(this.enemies[i].targetPos, 10);
        }
        
        // while dashing, draw a yellow aura to indicate invincibility
        if (this.dashing) {
            render.setColor(255, 255, 0, 0.5);
            this.drawArrow(Math.atan2(this.player.vel.y, this.player.vel.x), 50, 300 * Math.min(this.dashChargeTime, 1.0) * (1 - (this.dashTime / this.dashLength)) + 35, this.player.pos);
            render.setColor(255, 255, 0);
            this.drawArrow(Math.atan2(this.player.vel.y, this.player.vel.x), 15, 300 * Math.min(this.dashChargeTime, 1.0) * (1 - (this.dashTime / this.dashLength)), this.player.pos);
            render.setColor(200, 200, 0);
            render.setLineWidth(utils.toScreenX(2));
            render.ctx.stroke();
        }
        
        // render the player
        this.player.render(render);
        // render the mini map in the top left corner
        this.renderMiniMap(100, 100, 10, 10);
        // render the pause/win/starting screen over everything else
        if (utils.paused) {
            render.setColor(0, 0, 0, 0.3);
            render.drawRect(utils.Rect2(utils.Vector2(), utils.viewSize));
            render.setColor(255, 255, 255, 0.9)
            render.setFont(50);
            // show YOU WON when the player wins
            if (this.won) {
                render.drawText("YOU WON", utils.Vector2(utils.screenScale / 2.0, 100))
            } else {
                render.drawText((this.starting) ? "HOW TO PLAY" : "PAUSED", utils.Vector2(utils.screenScale / 2.0, 100));
            }
            render.setFont(20);
            // instructions
            if (this.won) {
                render.drawText("esc to play again", utils.Vector2(110, 20));
            } else {
                render.drawText((this.starting) ? "esc to start game" : "esc to unpause", utils.Vector2((this.starting) ? 110 : 90, 20));
            }
            render.drawTutorialImage();
        } 
    }
    
    // generic ease out function
    ease(x) {
        // sin ease out from easings.net
        // https://easings.net/#easeOutSine
        return Math.sin((x * Math.PI) / 2);
    }

    // draw an arrow with width and length
    // pointing at an angle angle in radians
    // clockwise from the x axis
    // centered on the origin point
    drawArrow(angle, width, length, origin) {
        let arrow = [];
        arrow.push(utils.add(utils.rotate(utils.Vector2(0, -width/2), angle), origin));
        arrow.push(utils.add(utils.rotate(utils.Vector2(Math.max(length - width, 0), -width/2), angle), origin));
        arrow.push(utils.add(utils.rotate(utils.Vector2(length, 0), angle), origin))
        arrow.push(utils.add(utils.rotate(utils.Vector2(Math.max(length - width, 0), width/2), angle), origin));
        arrow.push(utils.add(utils.rotate(utils.Vector2(0, width/2), angle), origin));
        render.drawPolygonWorld(arrow);
    }
    
    // register enemy hit
    playerHit(enemy) {
        // while dashing, the player is invincible and
        // deals contact damage to enemies
        if (this.dashing) {
            enemy.damage(this.player.pos);
            if (enemy.health <= 0) {
                // remove enemy when it dies
                this.destroyEnemy(enemy);
            }
        } else {
            // damage the player when you hit an enemy
            this.player.damage(enemy.pos);
            if (this.player.health <= 0) { // if the player dies, restart instantly
                this.reset();
            }
        }
    }
    
    // destroy enemies on death and remove 
    // them from the process list
    destroyEnemy(enemy) {
        let newEnemies = [];
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i] != enemy) {
                // remove enemy from list
                newEnemies.push(this.enemies[i]);
            }
        }
        this.enemies = newEnemies;
        // create a new death particle with enemy data
        this.enemyDeathParticles.push({
            pos: structuredClone(enemy.pos),
            color: structuredClone(enemy.color),
            lifetime: 1.0,
            size: enemy.radius,
            octagon: (enemy instanceof EnemySpawner)
        })
        // if an enemy spawner was killed, decrement counter
        // if all enemy spawners are gone, restart the game
        // and mark it as a win
        if (enemy instanceof EnemySpawner) {
            this.enemySpawners--;
            this.player.health = this.player.maxHealth;
            if (this.enemySpawners <= 0) {
                this.won = true;
                this.reset();
            }
        }
    }

    // render the mini map in the top left corner
    // width, height, leftMargin, and topMargin are
    // all in screen coordinates
    renderMiniMap(width, height, leftMargin, topMargin) {
        // update visited map
        this.updateVisited();
        // render an outline for the map
        render.setColor(0,0,0,0.5);
        render.setLineWidth(5);
        let r = {x: utils.screenSize.x - leftMargin - width - 5/2,
                y: topMargin - 5/2,
                w: width + 5,
                h: height + 5
        };
        render.drawRect(r, false);
        // loop through each dungeon tile
        // draw black for walls, white for floors
        // gray if the tile hasn't been visited yet
        for (let i = 0; i < dungeonGenerator.width; i++) {
            for (let j = 0; j < dungeonGenerator.height; j++) {
                let rect = utils.Rect2(
                    utils.Vector2(
                        (width * i / dungeonGenerator.width) + (utils.screenSize.x - leftMargin - width), 
                        (height * j / dungeonGenerator.height) + topMargin
                    ),
                    utils.Vector2(
                        (width * (i + 1) / dungeonGenerator.width) + (utils.screenSize.x - leftMargin - width), 
                        (height * (j + 1) / dungeonGenerator.height) + topMargin
                    )
                );
                render.setLineWidth(1);
                render.setColor(255, 255, 255, 0.5);
                if (dungeonGenerator.getTile(i, j)) render.setColor(0, 0, 0, 0.5);
                if (!this.visited[i][j]) render.setColor(150, 150, 150, 0.5);
                render.drawRect(rect);
            }
        }
        // draw a blinking cursor for the player's current position
        if (Math.floor(this.time * 3) % 2 == 0) {
            render.setLineWidth(2);
            render.setColor(0,0,0, 0.5);
            let rect = utils.Rect2(
                utils.Vector2(
                    (width * roomPos.x / dungeonGenerator.width) + (utils.screenSize.x - leftMargin - width) - 0, 
                    (height * roomPos.y / dungeonGenerator.height) + topMargin - 0
                ),
                utils.Vector2(
                    (width * (roomPos.x + 1) / dungeonGenerator.width) + (utils.screenSize.x - leftMargin - width) + 0, 
                    (height * (roomPos.y + 1) / dungeonGenerator.height) + topMargin + 0
                )
            );
            render.drawRect(rect, false);
        }
    }

    updateVisited() {
        let roomPos = utils.world2tile(this.player.pos);
        // update visited grid by marking all tiles in a 3x3 around the player as visited
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (roomPos.x + i < 0 || roomPos.x + i >= dungeonGenerator.width ||
                    roomPos.y + j < 0 || roomPos.y + j >= dungeonGenerator.height) continue;
                this.visited[roomPos.x + i][roomPos.y + j] = true;
            }
        }
    }

    // render part of the dungeon
    renderDungeon() {
        let pos = utils.world2tile(camera.pos);
        let s = 1;
        let hallSize = 400;
        let sideSize = ((utils.roomSize - hallSize) / 2);
        // render only a 3x3 around the player
        for(let i = -s; i <= s; i++) {
            for (let j = -s; j <= s; j++) {
                if (dungeonGenerator.getTile(pos.x + i, pos.y + j) == 0) {
                    let rect = utils.Rect2(utils.Vector2((pos.x + i) * utils.roomSize, (pos.y + j) * utils.roomSize), 
                                utils.Vector2((pos.x + i + 1) * utils.roomSize + 1, (pos.y + j + 1) * utils.roomSize + 1));
                    render.setColor(230,230,230);
                    render.setLineWidth(0);
                    render.drawRectWorld(rect);
                    render.setColor(255,255,255);
                    rect.h = hallSize;
                    rect.w = hallSize;
                    rect.x = sideSize + (pos.x + i) * utils.roomSize;
                    rect.y = sideSize + (pos.y + j) * utils.roomSize;
                    render.drawRectWorld(rect);
                    rect.h = hallSize;
                    rect.w = sideSize;
                    rect.x = (pos.x + i) * utils.roomSize;
                    rect.y = sideSize + (pos.y + j) * utils.roomSize;
                    // drawing floor designs and hall edges
                    if (!dungeonGenerator.getTile(pos.x + i - 1, pos.y + j)) render.drawRectWorld(rect);
                    rect.x = (pos.x + i + 1) * utils.roomSize - sideSize;
                    if (!dungeonGenerator.getTile(pos.x + i + 1, pos.y + j)) render.drawRectWorld(rect);
                    rect.h = sideSize;
                    rect.w = hallSize;
                    rect.x = sideSize + (pos.x + i) * utils.roomSize;
                    rect.y = (pos.y + j) * utils.roomSize;
                    if (!dungeonGenerator.getTile(pos.x + i, pos.y + j - 1)) render.drawRectWorld(rect);
                    rect.y = (pos.y + j + 1) * utils.roomSize - sideSize;
                    if (!dungeonGenerator.getTile(pos.x + i, pos.y + j + 1)) render.drawRectWorld(rect);
                    rect.h = hallSize - 100; rect.w = rect.h;
                    rect.x = (utils.roomSize / 2) - ((hallSize - 100)/2) + (pos.x + i) * utils.roomSize;
                    rect.y = (utils.roomSize / 2) - ((hallSize - 100)/2) + (pos.y + j) * utils.roomSize;
                    render.setColor(245,245,245);
                    render.drawRectWorld(rect);
                }
            }
        }
    }
}

// make new game object
export const game = new Game();