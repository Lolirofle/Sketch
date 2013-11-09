var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d"),
    painting = false,
    lastX = 0,
    lastY = 0,
    lineThickness = 1,
    thicknessEase = 0.5;

var w = 600;
var h = 600; 
var sketch = document.getElementById("sketch");
var sketchctx = sketch.getContext("2d");

var maxThickness = 3;

var strokes = [];
var currentStroke;

var penStyle = "rgba(0,0,0,0.5)";
var backStyle = "rgba(255,255,255,1)"

var redoStack = [];

resizeCanvas();

window.addEventListener('resize',resizeCanvas,false);

function resizeCanvas() {
    w = window.innerWidth;  // your code here
    h = window.innerHeight; // your code here

    canvas.width = w;
    canvas.height = h;
    sketch.width = w;
    sketch.height = h;

    drawBackground(sketchctx);
    drawAllStrokes(sketchctx);
}

function stroke() {
  this.x = [];
  this.y = [];
  this.thickness = [];
}

function fillCircle(ctx,x,y,radius)
{
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = penStyle;
    ctx.fill();
}

function drawBackground(ctx) {
    ctx.fillStyle = backStyle;
    ctx.fillRect(0, 0, w, h);
}

function drawAllStrokes(ctx){
    ctx.clearRect(0,0,w,h);
    drawBackground(ctx);
    ctx.fillStyle = penStyle;
    for (var i = 0; i < strokes.length; i += 1)
    {
        var s = strokes[i];
        for (var j = 0; j < s.x.length; j+=1)
        {
            //draw the stroke
            drawStroke(ctx,s.x[j],s.y[j],s.thickness[j]);
        }
    }
}

function drawStroke(ctx,x,y,thickness)
{
    // THIN PEN //
    //ctx.fillRect(x,y,thickness,thickness);

    // THIN INK //
    ctx.fillRect(x,y,thickness,thickness);
    fillCircle(ctx,x+thickness/4,y+thickness/4,thickness/2);

    // INK PEN
    //ctx.fillRect(x,y,thickness,thickness);
    //fillCircle(ctx,x,y,thickness);
}

function undoStroke() {
    if (strokes.length>0)
    {
        redoStack.push(strokes.pop());
        drawAllStrokes(sketchctx);
    }
}
    
function addStroke() {
    if (currentStroke.x.length > 2)
    {
        redoStack = [];
        strokes.push(currentStroke);
        drawAllStrokes(sketchctx);
    }
    
}
function redoStroke() {
    if (redoStack.length>0)
    {
        strokes.push(redoStack.pop());
        drawAllStrokes(sketchctx);
    }
    
}

canvas.onmousedown = function(e) {
    painting = true;

    currentStroke = new stroke();
    
    ctx.fillStyle = penStyle;
    lastX = e.pageX - this.offsetLeft;
    lastY = e.pageY - this.offsetTop;
};

canvas.onmouseup = function(e){
    painting = false;

    addStroke();
   
    drawAllStrokes(sketchctx);

    //sketch.drawImage(ctx);

    ctx.clearRect(0,0,canvas.width,canvas.height);

}

canvas.onmousemove = function(e) {
    if (painting) {
        mouseX = e.pageX - this.offsetLeft;
        mouseY = e.pageY - this.offsetTop;

        // find all points between        
        var x1 = mouseX,
            x2 = lastX,
            y1 = mouseY,
            y2 = lastY;


        var steep = (Math.abs(y2 - y1) > Math.abs(x2 - x1));
        if (steep){
            var x = x1;
            x1 = y1;
            y1 = x;

            var y = y2;
            y2 = x2;
            x2 = y;
        }
        if (x1 > x2) {
            var x = x1;
            x1 = x2;
            x2 = x;

            var y = y1;
            y1 = y2;
            y2 = y;
        }

        var dx = x2 - x1,
            dy = Math.abs(y2 - y1),
            error = 0,
            de = dy / dx,
            yStep = -1,
            y = y1;
        
        if (y1 < y2) {
            yStep = 1;
        }
        
        targetLineThickness = maxThickness - Math.sqrt((x2 - x1) *(x2-x1) + (y2 - y1) * (y2-y1))/(10);
        if (lineThickness > targetLineThickness + thicknessEase)
        {
            lineThickness -= thicknessEase;
        }
        else if (lineThickness < targetLineThickness - thicknessEase)
        {
            lineThickness += thicknessEase;
        }
        else
        {
            lineThickness = targetLineThickness;
        }
        if(lineThickness < 1){
            lineThickness = 1;   
        }

        for (var x = x1; x < x2; x++) {
            if (steep) {
                currentStroke.x.push(y);
                currentStroke.y.push(x);
                currentStroke.thickness.push(lineThickness);
                drawStroke(ctx, y, x, lineThickness );
            } else {
                currentStroke.x.push(x);
                currentStroke.y.push(y);
                currentStroke.thickness.push(lineThickness);
                drawStroke(ctx, x, y, lineThickness );
            }
            
            error += de;
            if (error >= 0.5) {
                y += yStep;
                error -= 1.0;
            }
        }



        lastX = mouseX;
        lastY = mouseY;

    }
}

