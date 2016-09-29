function Sketcher(elem){
	var sketcher_this = this;

	this.canvas = document.getElementById("canvas");
	this.canvas.onmousedown = function(event){
		sketcher_this.painting = true;

		sketcher_this.currentStroke = new Stroke();
		sketcher_this.currentStroke.tool = sketcher_this.tool;

		sketcher_this.ctx.fillStyle = sketcher_this.penStyle;
		sketcher_this.lastX = event.pageX - this.offsetLeft;
		sketcher_this.lastY = event.pageY - this.offsetTop;
	};

	this.canvas.onmouseup = function(event){
		sketcher_this.painting = false;

		sketcher_this.sketchctx.drawImage(canvas,0,0);
		sketcher_this.addStroke();

		sketcher_this.ctx.clearRect(0,0,canvas.width,canvas.height);
	}

	this.canvas.onmousemove = function(event){
		if(sketcher_this.painting){
			mouseX = event.pageX - this.offsetLeft;
			mouseY = event.pageY - this.offsetTop;

			// find all points between
			var x1 = mouseX,
				x2 = sketcher_this.lastX,
				y1 = mouseY,
				y2 = sketcher_this.lastY;

			switch(sketcher_this.tool){
				default:
					var steep = (Math.abs(y2 - y1) > Math.abs(x2 - x1));
					if(steep){
						var x = x1;
						x1 = y1;
						y1 = x;

						var y = y2;
						y2 = x2;
						x2 = y;
					}
					if(x1 > x2){
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

					if(y1 < y2){
						yStep = 1;
					}

					var targetLineThickness = sketcher_this.maxThickness - Math.sqrt((x2 - x1) *(x2-x1) + (y2 - y1) * (y2-y1))/(10);
					if(sketcher_this.lineThickness > targetLineThickness + sketcher_this.thicknessEase){
						sketcher_this.lineThickness -= sketcher_this.thicknessEase;
					}
					else if(sketcher_this.lineThickness < targetLineThickness - sketcher_this.thicknessEase){
						sketcher_this.lineThickness += sketcher_this.thicknessEase;
					}
					else{
						sketcher_this.lineThickness = targetLineThickness;
					}
					if(sketcher_this.lineThickness < 1){
						sketcher_this.lineThickness = 1;
					}

					for (var x = x1; x < x2; x++){
						if(steep){
							sketcher_this.currentStroke.x.push(y);
							sketcher_this.currentStroke.y.push(x);
							sketcher_this.currentStroke.thickness.push(sketcher_this.lineThickness);
							sketcher_this.drawStyle(sketcher_this.ctx,y,x,sketcher_this.lineThickness,sketcher_this.tool);
						} else{
							sketcher_this.currentStroke.x.push(x);
							sketcher_this.currentStroke.y.push(y);
							sketcher_this.currentStroke.thickness.push(sketcher_this.lineThickness);
							sketcher_this.drawStyle(sketcher_this.ctx,x,y,sketcher_this.lineThickness,sketcher_this.tool);
						}

						error += de;
						if(error >= 0.5){
							y += yStep;
							error -= 1.0;
						}
					}


					sketcher_this.lastX = mouseX;
					sketcher_this.lastY = mouseY;
				break;

				case Tool.Pen:
					x = event.pageX - sketcher_this.offsetLeft;
					y = event.pageY - sketcher_this.offsetTop;

					// the distance the mouse has moved since last mousemove event
					var dis = Math.sqrt(Math.pow(sketcher_this.lastX-x,2)+Math.pow(sketcher_this.lastY-y,2));

					// for each pixel distance,draw a circle on the line connecting the two points
					// to get a continous line.
					for (i=0;i<dis;i+=1){
						var s = i/dis;
						sketcher_this.currentStroke.x.push(sketcher_this.lastX*s + x*(1-s));
						sketcher_this.currentStroke.y.push(sketcher_this.lastY*s + y*(1-s));
						sketcher_this.currentStroke.thickness.push(w);
						sketcher_this.drawStyle(ctx,sketcher_this.lastX*s + x*(1-s),sketcher_this.lastY*s + y*(1-s),w,tool);
					}
					sketcher_this.lastX = x;
					sketcher_this.lastY = y;
				break;

			}

		}
	}
	this.ctx = canvas.getContext("2d");
	this.painting = false;
	this.lastX = 0;
	this.lastY = 0;
	this.lineThickness = 1;
	this.thicknessEase = 0.5;

	this.buffer = document.getElementById("buffer");
	this.bufferctx = this.buffer.getContext("2d");

	this.w = 1200;
	this.h = 1600;
	this.sketch = document.getElementById("sketch");
	this.sketchctx = this.sketch.getContext("2d");

	this.maxThickness = 3;

	this.penStyle = "rgba(0,0,0,0.5)";
	this.fadeStyle = "rgba(0,0,0,0)";
	this.backStyle = "rgba(240,240,240,1)";
	this.eraserStyle = "rgba(240,240,240,0.3)";
	this.fadeBack = "rgba(240,240,240,0)";

	this.strokes = [];
	this.currentStroke;

	this.undoLimit = 16;

	this.redoStack = [];

	this.tool = 0;
	// 0 = pen
	// 1 = eraser

	this.resizeCanvas(this.w,this.h);
	this.drawBackground(this.sketchctx);

	//window.addEventListener('resize',this.resizeCanvas(),false);
}

function Stroke(){
	this.x = [];
	this.y = [];
	this.thickness = [];
	this.tool = 0;
}

Sketcher.prototype.newCanvas = function(){
	this.bufferctx.clearRect(0,0,w,h);
	this.bufferctx.drawImage(this.sketch,0,0);
	this.drawBackground(this.sketchctx);

	this.strokes = [];
	this.redoStack = [];

	this.strokes.push(new Stroke());
}


Sketcher.prototype.resizeCanvas = function(w,h){
	this.canvas.width = w;
	this.canvas.height = h;
	this.sketch.width = w;
	this.sketch.height = h;

	this.buffer.width = w;
	this.buffer.height = h;

	$(".surface").css("margin-left",function(){ return -w/2; });
}

Sketcher.prototype.fillCircle = function(ctx,x,y,radius){
	ctx.beginPath();
	ctx.arc(x,y,radius,0,2 * Math.PI,false);
	ctx.fillStyle = this.penStyle;
	ctx.fill();
}

Sketcher.prototype.fillCircleEraser = function(ctx,x,y,radius){
	ctx.beginPath();
	ctx.arc(x,y,radius,0,2 * Math.PI,false);
	ctx.fillStyle = this.eraserStyle;
	ctx.fill();
}

Sketcher.prototype.fillEraser = function(ctx,x,y,radius){
	var gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
	gradient.addColorStop(0,this.eraserStyle);
	gradient.addColorStop(1,this.fadeBack);

	ctx.beginPath();
	ctx.arc(x,y,w,0,2 * Math.PI);
	ctx.fillStyle = gradient;
	ctx.fill();
	ctx.closePath();
}

Sketcher.prototype.drawBackground = function(ctx){
	ctx.clearRect(0,0,this.w,this.h);
	ctx.fillStyle = this.backStyle;
	ctx.fillRect(0,0,this.w,this.h);
}

Sketcher.prototype.drawStyle = function(ctx,x,y,thickness,tool){

	switch(tool){
		default:
			// THIN INK //
			ctx.fillRect(x,y,thickness,thickness);
			this.fillCircle(ctx,x+thickness/4,y+thickness/4,thickness/2);
		break;

		case 1:
			// ERASER //
			var markerWidth = 15;
			this.fillCircleEraser(ctx,x+markerWidth/2,y+markerWidth/2,markerWidth);
		break;
	}

	// THIN PEN //
	//ctx.fillRect(x,y,thickness,thickness);

	// THIN INK //
	//ctx.fillRect(x,y,thickness,thickness);
	//this.fillCircle(ctx,x+thickness/4,y+thickness/4,thickness/2);

	// INK PEN
	//ctx.fillRect(x,y,thickness,thickness);
	//this.fillCircle(ctx,x,y,thickness);

	// MARKER

}

Sketcher.prototype.drawStroke = function(ctx,stroke){
	for (var i = 0; i < stroke.x.length; i += 1){
		this.drawStyle(ctx,stroke.x[i],stroke.y[i],stroke.thickness[i],stroke.tool);
	}
}

Sketcher.prototype.drawAllStrokes = function(ctx){
	ctx.clearRect(0,0,w,h);
	this.drawBackground(ctx);
	ctx.fillStyle = this.penStyle;
	for (var i = 0; i < this.strokes.length; i += 1){
		var s = this.strokes[i];
		this.drawStroke(ctx,s);
	}
}
Sketcher.prototype.drawAllStrokesNoClear = function(ctx){
	ctx.fillStyle = this.penStyle;
	for (var i = 0; i < this.strokes.length; i += 1){
		var s = this.strokes[i];
		this.drawStroke(ctx,s);
	}
}
Sketcher.prototype.undoStroke = function(){
	if(this.strokes.length>0){
		this.drawBackground(this.sketchctx);
		this.redoStack.push(this.strokes.pop());
		this.sketchctx.drawImage(this.buffer,0,0);
		this.drawAllStrokesNoClear(this.sketchctx);
		console.log("undo");
	}
}

Sketcher.prototype.addStroke = function(){
	if(this.currentStroke.x.length > 2){
		this.redoStack = [];
		this.strokes.push(this.currentStroke);

		if(this.strokes.length > this.undoLimit){
			this.strokes.reverse();
			var oldStroke = this.strokes.pop();
			this.strokes.reverse();

			this.drawStroke(this.bufferctx,oldStroke);
		}
		else{
			/*if(newlyCreated){
				this.bufferctx.clearRect(0,0,w,h);
				newlyCreated = false;
			}*/

		}
		//this.drawAllStrokes(this.sketchctx);
	}

}
Sketcher.prototype.redoStroke = function(){
	if(this.redoStack.length>0){
		this.drawBackground(this.sketchctx);
		this.strokes.push(this.redoStack.pop());
		this.sketchctx.drawImage(this.buffer,0,0);
		this.drawAllStrokesNoClear(this.sketchctx);
	}

}

var Tool = {
	Pen   : 1,
	Eraser: 2,
};
