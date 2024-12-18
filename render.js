// render.js
// a more general use render script
// with generic drawing functions, as well
// as "world" variants that automatically
// translate and scale according to the camera 
// state

// import utils and camera from utils
import { utils, camera } from "./utils.js"

// class for the render object
class Render {
    constructor() {
        // create context member and initialize it to null;
        this.ctx = null;
    }

    // initialize the canvas and set its configurations
    initCanvas(canvas) {
        canvas.width = utils.screenSize.x;
        canvas.height = canvas.width * 3 / 4;
        utils.screenSize.w = canvas.width;
        utils.screenSize.h = canvas.height;
    }

    // grab the context from index
    initializeContext(context) {
        this.ctx = context;
    }

    // set both the fill color and stroke color to abstract and avoid confusion
    setColor(r, g, b, a = 1) {
        this.ctx.fillStyle = 'rgb(' + r.toString() + "," + g.toString() + "," + b.toString() + "," + a.toString() + ")";
        this.ctx.strokeStyle = 'rgb(' + r.toString() + "," + g.toString() + "," + b.toString() + "," + a.toString() + ")";
    }
    // set the line width, mostly unnecessary besides automatically accessing the context
    // used for unfilled shapes
    setLineWidth(width) {
        this.ctx.lineWidth = width;
    }
    // sets the font size for text rendering
    // only sets font to bolded courier
    setFont(size) {
        this.ctx.font = "bold " + size.toString() + "px courier";
    }

    // clear the screen and fill it with a certain color
    clearScreen(r=255, g=255, b=255) {
        this.ctx.beginPath();
        this.ctx.clearRect(0, 0, utils.screenSize.w, utils.screenSize.h);
        this.setColor(r, g, b);
        this.ctx.fillRect(0, 0, utils.screenSize.w, utils.screenSize.h);
    }

    // generic finish draw for fill vs. stroke drawing
    finishDraw(fill) {
        if (fill) this.ctx.fill();
        else this.ctx.stroke();    
    }

    // draw a circle at point p in screen coordinates, with radius r in screen units
    // can be filled or outline
    drawCircle(p, r, fill = true) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2.0);
        this.finishDraw(fill);
    }
    // draw a circle at point p in game world coordinates, transformed according to the camera,
    // with radius r in world units
    // can be filled or outline
    drawCircleWorld(p, r, fill = true) {
        let camOffset = utils.subtract(camera.pos, utils.halfView);
        this.drawCircle(utils.toScreenXY(utils.subtract(p, camOffset)), utils.toScreenX(r), fill);
    }
    
    // draw a rectangle using a rect structure in screen coordinates
    // can be filled or outline
    drawRect(rect, fill = true) {
        this.ctx.beginPath();
        this.ctx.rect(rect.x, rect.y, rect.w, rect.h);
        this.finishDraw(fill);
    }
    // draw a rectangle using a rect structure in world coordinates
    // can be filled or outline
    drawRectWorld(rect, fill = true) {
        let camOffset = utils.subtract(camera.pos, utils.halfView);
        let r = utils.Rect2(utils.toScreenXY(utils.subtract(utils.Vector2(rect.x, rect.y), camOffset)), 
        utils.toScreenXY(utils.subtract(utils.add(utils.Vector2(rect.x, rect.y), utils.Vector2(rect.w, rect.h)), camOffset)))
        this.drawRect(r, fill);
    }

    // connect a list of points with lines in screen coordinates
    // uses lineWidth for line thickness
    drawPolyLine(points) {
        if (points.length == 0) { return; }
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
    }
    // connect a list of points with lines in world coordinates
    // uses lineWidth for line thickness
    drawPolyLineWorld(points) {
        if (points.length == 0) { return; }
        let camOffset = utils.subtract(camera.pos, utils.halfView);
        let n = [];
        for (let i = 0; i < points.length; i++) {
            n.push(utils.toScreenXY(utils.subtract(points[i], camOffset)));
        }
        this.drawPolyLine(n);
    }

    // draw a polygon defined by a list of points in screen coordinates
    // can be filled or outline
    drawPolygon(points, fill = true) {
        if (points.length == 0) { return; }
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.closePath();
        this.finishDraw(fill);
    }
    // draw a polygon defined by a list of points in world coordinates
    // can be filled or outline
    drawPolygonWorld(points, fill = true) {
        let camOffset = utils.subtract(camera.pos, utils.halfView);
        let p = [];
        for (let i = 0; i < points.length; i++) {
            p.push(utils.toScreenXY(utils.subtract(points[i], camOffset)));
        }
        this.drawPolygon(p, fill);
    }

    // draw horizontally centered text at pos
    drawText(text, pos) {
        this.ctx.fillText(text, pos.x - this.ctx.measureText(text).width / 2, pos.y);
    }
    
    // render the loaded tutorial image from github
    // from img component
    drawTutorialImage() {
        let image = document.getElementById("tutorial");
        this.ctx.drawImage(image, 200, 120, 400, 400);
    }
}

export const render = new Render();