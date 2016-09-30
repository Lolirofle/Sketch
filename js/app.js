function Sketcher(elem){
	var sketcher = this;

	//Elements
	this.canvas = {};
	this.canvas.elem    = document.getElementById("canvas");
	this.canvas.context = this.canvas.elem.getContext("2d");

	this.buffer = {};
	this.buffer.elem    = document.getElementById("buffer");
	this.buffer.context = this.buffer.elem.getContext("2d");

	this.sketch = {};
	this.sketch.elem    = document.getElementById("sketch");
	this.sketch.context = this.sketch.elem.getContext("2d");

	//States
	this.isStroking = false;
	this.w = 1200;
	this.h = 1600;
	this.strokes = [];
	this.currentStroke;
	this.redoStrokesStack = [];
	this.lastX = 0;
	this.lastY = 0;

	//Settings
	this.lineThickness = 5; //px
	this.thicknessEase = 3;
	this.maxThickness = 10; //px
	this.penStyle    = "rgba(0,0,0,0.5)";       //CanvasContext.fillStyle
	this.fadeStyle   = "rgba(0,0,0,0)";         //CanvasContext.fillStyle
	this.backStyle   = "rgba(240,240,240,1)";   //CanvasContext.fillStyle
	this.eraserStyle = "rgba(240,240,240,0.3)"; //CanvasContext.fillStyle
	this.fadeBack    = "rgba(240,240,240,0)";
	this.undoLimit = 16; //UInt
	this.tool = Tool.Pen; //Tool

	//Intialization
	this.canvas.elem.onkeydown = function(event){
		switch(event.keyCode){
			case 90://z
				if(event.ctrlKey){
					if(event.shiftKey){
						sketcher.redoStroke();
					}else{
						sketcher.undoStroke();
					}
				}
				break;
			case 89://y
				if(event.ctrlKey){
					sketcher.redoStroke();
				}
				break;
		}
	};
	this.canvas.elem.onmousedown = function(event){
		sketcher.isStroking = true;

		sketcher.currentStroke = new Stroke();
		sketcher.currentStroke.tool = sketcher.tool;

		sketcher.canvas.context.fillStyle = sketcher.penStyle;
		sketcher.lastX = event.offsetX;
		sketcher.lastY = event.offsetY;
	};

	this.canvas.elem.onmouseup = function(event){
		sketcher.isStroking = false;

		sketcher.sketch.context.drawImage(canvas,0,0);
		sketcher.addStroke(this.currentStroke);
		this.currentStroke = null;

		sketcher.canvas.context.clearRect(0,0,canvas.width,canvas.height);
	}

	this.canvas.elem.onmousemove = function(event){
		if(sketcher.isStroking){
			var mouseX = event.offsetX;
			var mouseY = event.offsetY;

			// find all points between
			var x1 = mouseX,
				x2 = sketcher.lastX,
				y1 = mouseY,
				y2 = sketcher.lastY;

			switch(sketcher.tool){
				case Tool.Pen:
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

					var targetLineThickness = sketcher.maxThickness - Math.sqrt((x2 - x1) *(x2-x1) + (y2 - y1) * (y2-y1))/(10);
					if(sketcher.lineThickness > targetLineThickness + sketcher.thicknessEase){
						sketcher.lineThickness -= sketcher.thicknessEase;
					}
					else if(sketcher.lineThickness < targetLineThickness - sketcher.thicknessEase){
						sketcher.lineThickness += sketcher.thicknessEase;
					}
					else{
						sketcher.lineThickness = targetLineThickness;
					}
					if(sketcher.lineThickness < 1){
						sketcher.lineThickness = 1;
					}

					for (var x = x1; x < x2; x++){
						if(steep){
							sketcher.currentStroke.x.push(y);
							sketcher.currentStroke.y.push(x);
							sketcher.currentStroke.thickness.push(sketcher.lineThickness);
							sketcher.drawWithStyle(sketcher.canvas.context,y,x,sketcher.lineThickness,sketcher.tool);
						} else{
							sketcher.currentStroke.x.push(x);
							sketcher.currentStroke.y.push(y);
							sketcher.currentStroke.thickness.push(sketcher.lineThickness);
							sketcher.drawWithStyle(sketcher.canvas.context,x,y,sketcher.lineThickness,sketcher.tool);
						}

						error += de;
						if(error >= 0.5){
							y += yStep;
							error -= 1.0;
						}
					}


					sketcher.lastX = mouseX;
					sketcher.lastY = mouseY;
				break;

				case Tool.Eraser:
					// the distance the mouse has moved since last mousemove event
					var dis = Math.sqrt(Math.pow(sketcher.lastX-x,2)+Math.pow(sketcher.lastY-y,2));

					// for each pixel distance,draw a circle on the line connecting the two points
					// to get a continous line.
					for (i=0;i<dis;i+=1){
						var s = i/dis;
						sketcher.currentStroke.x.push(sketcher.lastX*s + mouseX*(1-s));
						sketcher.currentStroke.y.push(sketcher.lastY*s + mouseY*(1-s));
						sketcher.currentStroke.thickness.push(w);
						sketcher.drawWithStyle(
							context,
							sketcher.lastX*s + mouseX*(1-s),
							sketcher.lastY*s + mouseY*(1-s),
							w,
							sketcher.tool
						);
					}
				break;

			}
			sketcher.lastX = mouseX;
			sketcher.lastY = mouseY;
		}
	}
	this.resizeCanvas(this.w,this.h);
	this.drawBackground(this.sketch.context);

	//window.addEventListener('resize',this.resizeCanvas(),false);
}

function Stroke(){
	this.x = [];
	this.y = [];
	this.thickness = [];
	this.tool = Tool.Pen;
}

Sketcher.prototype.newCanvas = function(){
	this.buffer.context.clearRect(0,0,this.w,this.h);
	this.buffer.context.drawImage(this.sketch.elem,0,0);
	this.drawBackground(this.sketch.context);

	this.strokes = [];
	this.redoStrokesStack = [];
}


Sketcher.prototype.resizeCanvas = function(w,h){
	this.canvas.elem.width  = w;
	this.buffer.elem.width  = w;
	this.sketch.elem.width  = w;

	this.canvas.elem.height = h;
	this.sketch.elem.height = h;
	this.buffer.elem.height = h;
}

Sketcher.prototype.fillCircle = function(context,x,y,radius){
	context.beginPath();
	context.arc(x,y,radius,0,2 * Math.PI,false);
	context.fillStyle = this.penStyle;
	context.fill();
}

Sketcher.prototype.fillCircleEraser = function(context,x,y,radius){
	context.beginPath();
	context.arc(x,y,radius,0,2 * Math.PI,false);
	context.fillStyle = this.eraserStyle;
	context.fill();
}

Sketcher.prototype.fillEraser = function(context,x,y,radius){
	var gradient = context.createRadialGradient(x,y,0,x,y,radius);
	gradient.addColorStop(0,this.eraserStyle);
	gradient.addColorStop(1,this.fadeBack);

	context.beginPath();
	context.arc(x,y,w,0,2 * Math.PI);
	context.fillStyle = gradient;
	context.fill();
	context.closePath();
}

Sketcher.prototype.drawBackground = function(context){
	context.clearRect(0,0,this.w,this.h);
	context.fillStyle = this.backStyle;
	context.fillRect(0,0,this.w,this.h);
}

Sketcher.prototype.drawWithStyle = function(context,x,y,thickness,tool){
	switch(tool){
		case Tool.Pen:
			context.fillRect(x,y,thickness,thickness);
			this.fillCircle(context,x+thickness/4,y+thickness/4,thickness/2);
		break;

		case Tool.Eraser:
			var markerWidth = 15;//TODO
			this.fillCircleEraser(context,x+markerWidth/2,y+markerWidth/2,markerWidth);
		break;
	}

	// THIN PEN //
	//context.fillRect(x,y,thickness,thickness);

	// THIN INK //
	//context.fillRect(x,y,thickness,thickness);
	//this.fillCircle(context,x+thickness/4,y+thickness/4,thickness/2);

	// INK PEN
	//context.fillRect(x,y,thickness,thickness);
	//this.fillCircle(context,x,y,thickness);

	// MARKER

}

Sketcher.prototype.drawStroke = function(context,stroke){
	for (var i = 0; i < stroke.x.length; i += 1){
		this.drawWithStyle(context,stroke.x[i],stroke.y[i],stroke.thickness[i],stroke.tool);
	}
}

Sketcher.prototype.drawAllStrokes = function(context){
	context.clearRect(0,0,w,h);
	this.drawBackground(context);
	this.drawAllStrokesNoClear(context);	
}
Sketcher.prototype.drawAllStrokesNoClear = function(context){
	context.fillStyle = this.penStyle;
	for (var i = 0; i < this.strokes.length; i += 1){
		var s = this.strokes[i];
		this.drawStroke(context,s);
	}
}
Sketcher.prototype.undoStroke = function(){
	if(this.strokes.length>0){
		this.drawBackground(this.sketch.context);
		this.redoStrokesStack.push(this.strokes.pop());
		this.sketch.context.drawImage(this.buffer.elem,0,0);
		this.drawAllStrokesNoClear(this.sketch.context);
	}
}

Sketcher.prototype.addStroke = function(stroke){
	if(strokje.x.length > 2){
		this.redoStrokesStack = [];
		this.strokes.push(stroke);

		if(this.strokes.length > this.undoLimit){
			this.strokes.reverse();
			var oldStroke = this.strokes.pop();
			this.strokes.reverse();

			this.drawStroke(this.buffer.context,oldStroke);
		}
		else{
			/*if(newlyCreated){
				this.buffer.context.clearRect(0,0,w,h);
				newlyCreated = false;
			}*/

		}
		//this.drawAllStrokes(this.sketch.context);
		return true;
	}else{
		return false;
	}

}
Sketcher.prototype.redoStroke = function(){
	if(this.redoStrokesStack.length>0){
		this.drawBackground(this.sketch.context);
		this.strokes.push(this.redoStrokesStack.pop());
		this.sketch.context.drawImage(this.buffer.elem,0,0);
		this.drawAllStrokesNoClear(this.sketch.context);
	}

}

var Tool = {
	Pen   : 0,
	Eraser: 1,
};
