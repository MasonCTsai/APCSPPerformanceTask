// utils.js
// the most useful class, used across all other scripts
// contains Vector2 operations and construction,
// Rect2 construction, the camera object, and 
// inputs, alongside many other utility related
// information
class Utils {
    // canvas is 800 px wide, in a 4:3 box ratio
    screenScale = 800;
    // view is 800 world units wide, in a 4:3 box ratio
    viewScale = 800;
    constructor() {
        // all the keys detected and stored
        this.keys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "Escape"];
        
        // creates a Vector2 with the correct scale and ratio for the screen size
        this.screenSize = {x: this.screenScale, y: this.screenScale * 3 / 4};
        
        // creates a Vector2 with the correct scale and ratio for the viewport size
        this.viewSize = {x: this.viewScale, y: this.viewScale * 3 / 4};

        // the middle of the viewport relative to the top left corner
        this.halfView = this.Vector2(this.viewSize.x / 2, this.viewSize.y / 2);

        // the size of the rooms in world units
        this.roomSize = 600;

        // all the stored inputs; true or false for pressed or not pressed, respectively
        this.input = new Map();

        // stored screen mouse position
        this.mousePosition = structuredClone(this.halfView);
        // stored world mouse position
        this.mouseWorldPosition = structuredClone(this.mousePosition);
        // whether the mouse is being pressed
        this.mouseDown = false;

        // the canvas object used for mouse position
        this.canvas = null;
        // the camera object initialized to null
        this.camera = null;
        // the dungeon object initialized to null
        this.dungeon = null;
        // whether the game is paused
        this.paused = true;
        // experimental time scale to make time in game run faster or slower
        this.timescale = 1.0;
    
        // initialize the input map
        this.initInput();
        // event listeners for key presses and releases and mouse actions
        window.addEventListener('keydown', (e) => {this.processKeyDown(e, this)}, false);
        window.addEventListener('keyup', (e) => {this.processKeyUp(e, this)}, false);
        window.addEventListener('mousemove', (e) => {this.updateMousePos(e, this)}, false);
        window.addEventListener('mousedown', (e) => { this.mouseDown = true; this.updateMousePos(e, this); }, false);
        window.addEventListener('mouseup', (e) => { this.mouseDown = false; this.updateMousePos(e, this); }, false);
    }

    // updates the mouse position every time it moves
    // means that the mouse position isn't updated
    // at the beginning when the mouse hasn't moved yet

    // takes in the event object and utils object
    // because of the quirks of event listeners with 'this'
    updateMousePos(e, c) {
        if (c.canvas != undefined) {
            let rect = c.canvas.getBoundingClientRect();
            // calculations inspired by stack overflow:
            // https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
            c.mousePosition.x = Math.min(Math.max((e.clientX - rect.left) * rect.width / c.canvas.width, 0), this.screenSize.x);
            c.mousePosition.y = Math.min(Math.max((e.clientY - rect.top) * rect.height / c.canvas.height, 0), this.screenSize.y);
        }
    }

    // calculate the mouseWorldPosition based on the screen and camera positions
    updateMouseWorldPos() {
        this.mouseWorldPosition.x = (this.mousePosition.x * this.viewScale / this.screenScale) + this.camera.pos.x - this.halfView.x;
        this.mouseWorldPosition.y = (this.mousePosition.y * this.viewScale / this.screenScale) + this.camera.pos.y - this.halfView.y;
    }
    
    // clamp a vector in screen position to the screen dimensions, to prevent offscreen
    clampedToBounds(p) {
        let _p = structuredClone(p);
        _p.x = Math.max(0, Math.min(_p.x, this.screenSize.x));
        _p.y = Math.max(0, Math.min(_p.y, this.screenSize.y));
        return _p;
    }
    
    // setter for screen size, also updates screenScale
    setScreenSize(scale) { this.screenScale = scale; this.screenSize = {x: this.screenScale, y: this.screenScale * 3 / 4};  }
    // setter for view size, also updates viewScale and halfView
    setViewSize(scale) { 
        this.viewScale = scale; 
        this.viewSize = {x: this.viewScale, y: this.viewScale * 3 / 4}; 
        this.halfView = this.Vector2(this.viewSize.x / 2, this.viewSize.y / 2); 
    }
    
    // register all known inputs into the input map with a value of false
    initInput() {
        for (let i = 0; i < this.keys.length; i++) {
            this.input.set(this.keys[i], false);
        }
    }
    
    // when a key is pressed, check which it is
    // if the key is registered, update its held value to true
    // takes in the event object and 'this' object due to identity crises
    processKeyDown(e, input) {
        let key = e.code;
        if (input.input.has(key)) {
            input.input.set(key, true);
        }
    }
    // when a key is released, check which it is
    // if the key is registered, update its held value to false
    // takes in the event object and 'this' object due to identity crises
    processKeyUp(e, input) {
        let key = e.code;
        if (input.input.has(key)) {
            input.input.set(key, false);
        }
    }
    
    // getter functions for each key's held value
    inputMoveUp() { return this.input.get("KeyW"); }
    inputMoveLeft() { return this.input.get("KeyA"); }
    inputMoveDown() { return this.input.get("KeyS"); }
    inputMoveRight() { return this.input.get("KeyD"); }
    inputEscape() { return this.input.get("Escape"); }

    // scaling functions to go from world to screen coordinates
    // does not account for translations
    // one dimensional version
    toScreenX(x) { return this.screenScale * x / this.viewScale; }
    // vector/2 dimensional version
    toScreenXY(p) { return this.Vector2(this.toScreenX(p.x), this.toScreenX(p.y)); }
    
    // world position to dungeon grid position
    world2tile(p) {
        return this.Vector2(Math.floor(p.x / this.roomSize), Math.floor(p.y / this.roomSize));
    }
    // dungeon grid position to world position
    // returns the top left corner position of the tile
    tile2world(p) {
        return this.scale(p, this.roomSize);
    }
    
    // AABB collision detection using the positions of
    // the centers of the boxes, and their 
    // radii, being half the side length
    isColliding(p1, r1, p2, r2) {
        if (p1.x - r1 < p2.x + r2 &&
            p1.x + r1 > p2.x - r2 &&
            p1.y - r1 < p2.y + r2 &&
            p1.y + r1 > p2.y - r2
        ) {
            return true;
        }
        return false;
    }

    // casts a ray from an origin position (_o) to 
    // a destination position (_d), returning the first
    // point of collision, or a NaN vector if no wall was collided
    // with

    // there were no algorithms online for this specific use case,
    // so this is incredibly unoptimized and convoluted
    // the basic idea is to figure out the closest tile edge (vertical or horizontal)
    // from the origin point in the direction of the destination point,
    // and move the origin point to that edge along the line towards the destination.
    // Before repeating the process, check to see if the tile of the edge landed on
    // is a wall.  If not, repeat the process with the new origin point until reaching
    // the destination
    raycast(_o, _d) {
        if (this.dungeon == null) return utils.Vector2(NaN);
        if (utils.isEqual(_o, _d)) return utils.Vector2(NaN);
        let o = structuredClone(_o);
        let d = structuredClone(_d);
        let dir = this.subtract(d, o);
        let xdist = Math.abs(o.x - d.x); // keeps track of how far the x needs to travel
        let flag = (xdist == 0); // whether the ray is vertical
        if (flag) { xdist = Math.abs(o.y, - d.y); } // use the y distance if the x distance is 0
        do {
            let xt = ((Math.floor(o.x / this.roomSize) + ((dir.x < 0) ? 0 : 1)) * this.roomSize - o.x) * 1.00001 / dir.x;
            let yt = ((Math.floor(o.y / this.roomSize) + ((dir.y < 0) ? 0 : 1)) * this.roomSize - o.y) * 1.00001 / dir.y;
            let t = this.scale(dir, yt);
            if (xt <= yt) {
                t = this.scale(dir, xt);
            }
            o = this.add(o, t);
            // use the y travel distance if the ray is vertical
            xdist -= (flag) ? Math.abs(t.y) : Math.abs(t.x); 
            if (xdist <= 0.0) break; // if the destination point is reached
            let tile = this.world2tile(o);
            // o keeps track of the current origin point, so it will move to the point of collision
            if (this.dungeon.getTile(tile.x, tile.y) == 1) return o; 
        } while (xdist > 0.0);
        // if no collision was detected and the destination was reached, return a NaN vector
        return utils.Vector2(NaN);
    }

    // creates a vector2 object
    // zero inputs is the equivalent of Vector2(0,0);
    // one input is the equivalent of Vector2(x, x);, where x is the input
    // two inputs become the x and y of the returned vector
    Vector2(x = 0, y = NaN) { return { x: x, y: (isNaN(y)) ? x : y }; }
    // add each component of two vectors and return the resulting vector (commutative)
    // a + b
    add(a, b) { return this.Vector2(a.x + b.x, a.y + b.y); }
    // subtract each component of two vectors and return the resulting vector (not commutative)
    // a - b
    subtract(a, b) { return this.Vector2(a.x - b.x, a.y - b.y); }
    // multiply each component of the vector by a scalar value and return the resulting vector
    // a is the vector, i is the scalar constant
    scale(a, i) { return this.Vector2(a.x * i, a.y * i); }
    // return the squared length of the vector v
    slength(v) { return v.x**2+v.y**2;}
    // return the regular length of the vector v
    length(v) { return Math.sqrt(this.slength(v));}
    // return the normalized vector of the vector v, with magnitude 1*
    // if the vector is (0, 0), its magnitude remains 0 without error
    normalize(v) { 
        let l = this.length(v); if (l == 0) l = 1;
        return this.scale(v, 1/l); 
    }
    // checks if either the x component or y component of vector v is NaN
    // used with raycast()
    isNaNV(v) { return isNaN(v.x) || isNaN(v.y); }
    // check if two vectors a and b are equal if their components are both individually equal
    isEqual(a, b) { return (a.x == b.x) && (a.y == b.y); }
    // use a rotation matrix to rotate vector p by r radians clockwise

    // formula from wikipedia
    // https://en.wikipedia.org/wiki/Rotation_matrix
    rotate(p, r) { return this.Vector2(p.x * Math.cos(r) - p.y * Math.sin(r), 
                                        p.x * Math.sin(r) + p.y * Math.cos(r)); } 
    
    // create a Rect2 object and return it
    // consists of an x, y, width, and height
    Rect2(start, end) { return {x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
                                w: Math.abs(start.x - end.x), h: Math.abs(start.y - end.y)}; }
}

// create a new utils object
export const utils = new Utils();
// create a new camera object with position (0, 0)
export const camera = { pos: utils.Vector2() };
// make the camera accessible through utils
utils.camera = camera;