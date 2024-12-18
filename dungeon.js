// dungeon.js
// generates and represents the dungeon

// import utils for vectors 
import { utils } from "./utils.js";

// dungeon generator class
class DungeonGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = []; // dungeon, walls == 1, floors == 0
        this.endpoints = [] // all the one-way rooms
    }

    // get and return the tile at the position, 
    // return that it is a wall if it is out of bounds
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) 
            return 1;
        return this.grid[y][x]; 
    }

    // get a random end point (tile with only one opening)
    // remove it from the end points list
    popEndPoint() {
        if (this.endpoints.length == 0) return utils.Vector2(NaN);
        let r = Math.floor(Math.random() * this.endpoints.length);
        let tmp = [];
        for (let i = 0; i < this.endpoints.length; i++) {
            if (r != i) tmp.push(this.endpoints[i]);
        }
        let e = this.endpoints[r];
        this.endpoints = tmp;
        return e;
    }

    // helper function for dungeon generation
    // checks if the value is out of bounds, or if 
    // it was already checked
    // return false if so, or otherwise return true
    verifyPos(x, y, checked) {
        if (x < 0 || x >= this.width) return false;
        if (y < 0 || y >= this.height) return false;
        if (checked.find((v) => (v.x == x && v.y == y)) != undefined) return false;
        return true;
    }

    // a modified depth first search maze 
    // generation algorithm, walking through 
    // the grid and breaking down random walls
    // to reach every tile until all are checked
    // the random walls make up the dungeon's structure
    // not all tiles are marked checked, meaning
    // the walker can move back to them and create
    // loops in the maze
    generateDungeon() {
        // path for backtracking when a dead end is hit
        let path = new Array();
        // all the tiles already checked
        let checked = new Array();
        // the current position, starting at a random point in the grid
        let pos = utils.Vector2(Math.floor(Math.random() * Math.floor(this.width / 2)) * 2,
                                Math.floor(Math.random() * Math.floor(this.height / 2)) * 2);
        // reset the grid
        this.grid = [];
        // reset the endpoints list
        this.endpoints = [];
        // repopulate grid with proper width and height
        for (let i = 0; i < this.height; i++) {
            let row = [];
            for (let j = 0; j < this.width; j++) {
                row.push((i % 2 == 0 && j % 2 == 0) ? 0 : 1);
            }
            this.grid.push(row);
        }
        // start path with starting position
        path.push(pos);
        // while the path still exists
        while (path.length > 0) {
            // 90% of the time mark the tile as checked
            if (Math.random() > 0.1) checked.push(structuredClone(pos));
            let options = new Array();
            // find all available rooms to move to
            if (this.verifyPos(pos.x + 0, pos.y + 2, checked))
                { options.push(utils.Vector2(0, 1)); }
            if (this.verifyPos(pos.x + 0, pos.y - 2, checked))
                { options.push(utils.Vector2(0, -1)); }
            if (this.verifyPos(pos.x + 2, pos.y + 0, checked))
                { options.push(utils.Vector2(1, 0)); }
            if (this.verifyPos(pos.x - 2, pos.y + 0, checked))
                { options.push(utils.Vector2(-1, 0)); }
            if (options.length > 0) { // if it isn't a dead end
                // choose an option to move to
                let choice = options[Math.floor(Math.random() * options.length)];
                // move there and break down the connecting wall
                this.grid[pos.y + choice.y][pos.x + choice.x] = 0
                pos.x += choice.x * 2;
                pos.y += choice.y * 2;
                // fill in the path
                path.push(structuredClone(pos));
            } else {
                // if a dead end is reached, move back one
                // will repeat until a new spot to branch out is found
                pos = path.pop();
            }
        }

        // find all end points by counting 
        // the number of adjacent floors, 
        // and storing the ones with only one route out
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.getTile(i, j) == 0) {
                    let c = 0;
                    if (this.getTile(i + 1, j) == 0) c++;
                    if (this.getTile(i - 1, j) == 0) c++;
                    if (this.getTile(i, j + 1) == 0) c++;
                    if (this.getTile(i, j - 1) == 0) c++;
                    if (c == 1) this.endpoints.push(utils.Vector2(i, j));
                }
            }
        }
    }
}

// create a dungeon of size 7x7
export const dungeonGenerator = new DungeonGenerator(7,7);
// make the dungeon accessible to the inspect console
globalThis.dungeonGenerator = dungeonGenerator;
// make the dungeon accessible through utils
utils.dungeon = dungeonGenerator;