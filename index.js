// index.js
// the main script file used for the page, importing and facilitating 
// the running of the rest of the scripts

// use of js and html canvas for rendering inspired by:
// https://www.youtube.com/watch?v=nr8biZfSZ3Y&index=1&t=38s (1)

// documentation from MDN Web Docs:
// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API (2)

// index.js draw loop and initialization functions
// taken and modified from:
// https://codepen.io/mikolasan/pen/vYJgmyb (3)

// imports
import { utils } from "./utils.js";
import { render } from "./render.js";
import { game } from "./game.js";

// used for calculating deltas and keeping track of the page's age
let timestamp = 0;

// draw function loop
function _draw(delta) {
    game.process(delta);
    game.draw(delta);
}

// structure and usage inspired by above codepen source (3)
// calculates the delta and calls the draw function
// then requests that it be called again for the next frame
function call_draw(t0) {
    // calculating delta (time between frames)
    let delta = (t0 - timestamp) / 1000.0;
    // preventing delta from getting too high
    // because collision isn't checked properly
    // such as when switching tabs
    if (delta > 0.1) delta = 0.0;
    // if the game is paused, no time is passing
    if (utils.paused) delta = 0.0;
    timestamp = t0;
    
    render.clearScreen(0,0,0);
    _draw(delta * utils.timescale);

    window.requestAnimationFrame(call_draw);
}

// initialize the game, canvas, and scripts
function initGame() {
    // get canvas element and error check
    const c = document.getElementById("game");
    if (!c) {
        console.error("no canvas");
        return;
    }
    // get canvas context for drawing and error check
    const ctx = c.getContext("2d");
    if (!ctx) {
        console.error("no context");
        return;
    }
    
    // initialize the canvas with the render script
    render.initCanvas(c);
    // initialize the canvas with utils
    utils.canvas = c;
    // initialize the context with the render script
    render.initializeContext(ctx);
    // request the first frame
    window.requestAnimationFrame(call_draw);
}

// makes the modules accessible in the inspect console
globalThis.utils = utils;
globalThis.render = render;
globalThis.game = game;

// start the game!
initGame();