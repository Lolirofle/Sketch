'use strict';

function Sketcher(elem){
	var sketcher = this;

	//Elements
	this.elem = elem;
	this.sketch = {};//The drawing
	this.sketch.elem = document.createElement("CANVAS");
		this.sketch.elem.classList.add('sketcher-sketch');
		this.sketch.elem.style.position = 'absolute';
		elem.appendChild(this.sketch.elem);
	this.sketch.context = this.sketch.elem.getContext("2d");

	this.canvas = {};//Temporary draw surface
	this.canvas.elem = document.createElement("CANVAS");
		this.canvas.elem.classList.add('sketcher-canvas');
		this.canvas.elem.style.position = 'absolute';
		this.canvas.elem.tabIndex = 1;
		elem.appendChild(this.canvas.elem);
	this.canvas.context = this.canvas.elem.getContext("2d");

	//States
	this.strokes = new History();
	this.currentStroke = null;
	this.mousePreviousX = 0;
	this.mousePreviousY = 0;
	this.mousePreviousMoveTime = 0;

	//Settings
	this.lineThickness = 10; //px
	this.color = "#000000"; //CssColor (CanvasContext.fillStyle)
	this.undoLimit = 16;           //UInt
	this.tool = Sketcher.Tool.Pen; //Tool

	//Intialization
	this.canvas.elem.onkeydown = function(event){
		switch(event.keyCode){
			case 90://z
				if(event.ctrlKey){
					if(event.shiftKey){
						sketcher.redoStroke();
					}else if(sketcher.currentStroke!==null){
						sketcher.resetCurrentStroke();
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
			case 80://p
				sketcher.playback(sketcher.sketch.context);
				break;
			case 27://Escape
				sketcher.resetCurrentStroke();
				break;
		}
	};
	this.canvas.elem.onmousedown = function(event){
		//Prepare for the new stroke
		sketcher.currentStroke = new Stroke();
		sketcher.currentStroke.tool = sketcher.tool;
		sketcher.currentStroke.initialTime = Date.now();
		switch(sketcher.tool){
			case Sketcher.Tool.Pen:
				sketcher.currentStroke.toolData = {color: sketcher.color};
				break;
		}

		//Tool specific initialization of context
		if(sketcher.tool.preDraw != null){
			sketcher.tool.preDraw(sketcher.canvas.context,this.toolData);
		}

		sketcher.mousePreviousX = event.offsetX;
		sketcher.mousePreviousY = event.offsetY;
		sketcher.mousePreviousMoveTime = Date.now();
	};

	this.canvas.elem.onmouseup = this.canvas.elem.onmouseleave = function(event){
		if(sketcher.currentStroke!==null){
			if(!sketcher.tool.applyDirectly){
				//Copy the canvas to the sketch canvas
				sketcher.sketch.context.drawImage(sketcher.canvas.elem,0,0);
				sketcher.canvas.context.clearRect(0,0,sketcher.width(),sketcher.height());
			}

			//Add the current stroke to the history of strokes
			sketcher.addStroke(sketcher.currentStroke);
			sketcher.currentStroke = null;
		}
	}

	this.canvas.elem.onmousemove = function(event){
		if(sketcher.currentStroke!==null){
			var mouseX = event.offsetX;
			var mouseY = event.offsetY;

			var x1 = sketcher.mousePreviousX,
				y1 = sketcher.mousePreviousY,
				x2 = mouseX,
				y2 = mouseY;
			var time = Date.now();

			switch(sketcher.tool){
				case Sketcher.Tool.Pen:
					//Distance the mouse has moved since last mouse move event
					var dist = Math.hypot(x2-x1,y2-y1);

					var thickness = sketcher.currentStroke.data.length==0? 1 : sketcher.currentStroke.data[sketcher.currentStroke.data.length-1].thickness;
					var targetThickness = sketcher.lineThickness/(Math.sqrt(dist/(time-sketcher.mousePreviousMoveTime)+1));

					//For each pixel unit distance, draw as a line connecting the two points to get a continuous line
					for(var i=0; i<dist; i+=1){
						var step = i/dist;
						var x    = x2*step - x1*(step-1);
						var y    = y2*step - y1*(step-1);
						var data = {thickness: thickness};
						thickness = Math.max(1,thickness + Math.sign(targetThickness-thickness)/3);

						sketcher.currentStroke.x.push(x);
						sketcher.currentStroke.y.push(y);
						sketcher.currentStroke.data.push(data);
						sketcher.currentStroke.time.push(i==0? time-sketcher.mousePreviousMoveTime : 0);
						sketcher.tool.stroke.draw(
							sketcher.tool.applyDirectly? sketcher.sketch.context : sketcher.canvas.context,
							x,
							y,
							data,
							sketcher.currentStroke.toolData
						);
					}

					break;

				case Sketcher.Tool.Eraser:
					//Distance the mouse has moved since last mouse move event
					var dist = Math.hypot(x2-x1,y2-y1);

					//For each pixel unit distance, draw as a line connecting the two points to get a continuous line
					for(var i=0; i<dist; i+=1){
						var step = i/dist;
						var x    = x2*step - x1*(step-1);
						var y    = y2*step - y1*(step-1);
						var data = {apothem: 16};

						sketcher.currentStroke.x.push(x);
						sketcher.currentStroke.y.push(y);
						sketcher.currentStroke.data.push(data);
						sketcher.currentStroke.time.push(i==0? time-sketcher.mousePreviousMoveTime : 0);
						sketcher.tool.stroke.draw(
							sketcher.tool.applyDirectly? sketcher.sketch.context : sketcher.canvas.context,
							x,
							y,
							data,
							sketcher.currentStroke.toolData
						);
					}
					break;
			}
			sketcher.mousePreviousMoveTime = time;
			sketcher.mousePreviousX = mouseX;
			sketcher.mousePreviousY = mouseY;
		}
	}

	//Initialize canvas
	this.resizeCanvas(this.width(),this.height());
}

function Stroke(tool){
	this.tool = tool;
	this.toolData = {};
	this.initialTime = 0;

	this.x    = [];
	this.y    = [];
	this.time = [];
	this.data = [];
}

Stroke.prototype.draw = function(context){
	if(this.tool.preDraw != null){
		this.tool.preDraw(context,this.toolData);
	}
	for(var i=0; i<this.x.length; i+=1){
		this.tool.stroke.draw(context,this.x[i],this.y[i],this.data[i],this.toolData);
	}
}

Sketcher.prototype.newCanvas = function(){
	//Clear
	this.sketch.context.clearRect(0,0,this.width(),this.height());

	//Reset states
	this.strokes = new History();
}

Sketcher.prototype.resizeCanvas = function(w,h){
	this.canvas.elem.width  = w;
	this.sketch.elem.width  = w;

	this.canvas.elem.height = h;
	this.sketch.elem.height = h;
}

Sketcher.prototype.drawAllStrokes = function(context){
	for(var i=0,len=this.strokes.length(); i<len; i+=1){
		this.strokes.get(i).draw(context);
	}
}

Sketcher.prototype.undoStroke = function(){
	var stroke = this.strokes.pop();
	if(stroke !== undefined){
		this.sketch.context.clearRect(0,0,this.width(),this.height());
		this.drawAllStrokes(this.sketch.context);
	}
}

Sketcher.prototype.addStroke = function(stroke){
	if(stroke.x.length>2){
		this.strokes.push(stroke);
		return true;
	}else{
		return false;
	}

}

Sketcher.prototype.redoStroke = function(){
	var stroke = this.strokes.unpop();
	if(stroke !== undefined){
		stroke.draw(this.sketch.context);
	}

}

Sketcher.prototype.resetCurrentStroke = function(){
	if(this.currentStroke !== null){
		this.currentStroke = null;

		if(this.tool.applyDirectly){
			this.drawAllStrokes(this.sketch.context);
		}else{
			this.canvas.context.clearRect(0,0,this.width(),this.height());
		}
	}
}

Sketcher.prototype.width = function(){
	return this.elem.offsetWidth;
}

Sketcher.prototype.height = function(){
	return this.elem.offsetHeight;
}

Sketcher.prototype.playback = function(context){
	var this_ = this;

	//Clear everything
	context.clearRect(0,0,this.width(),this.height());

	//Draw all strokes
	time_loop({i: 0, len: this.strokes.length()} , function(data){return data.i<data.len;} , function(data,nextFn){
		var stroke = this_.strokes.get(data.i);

		if(stroke.tool.preDraw != null){
			stroke.tool.preDraw(context,stroke.toolData);
		}

		//Draw all individual parts of the strokes
		time_loop({i: 0, len: stroke.x.length} , function(data){return data.i<data.len;} , function(data,nextFn){
			stroke.tool.stroke.draw(context,stroke.x[data.i],stroke.y[data.i],stroke.data[data.i],stroke.toolData);
			data.i+=1;
			nextFn(data,stroke.time[data.i++]);
		},function(){
			data.i+=1;
			nextFn(data,300);
		});
	},null);
}

function time_loop(data,predicateFn,fn,endFn){
	if(predicateFn(data)){(function loop(){
		fn(data,function(data,nextTime){
			if(predicateFn(data)){
				if(nextTime==0){
					loop();
				}else{
					window.setTimeout(loop,nextTime);
				}
			}else{
				if(endFn!==null){
					endFn();
				}
			}
		});
	})();}
}

Sketcher.fillCircle = function(context,x,y,radius,color){
	context.beginPath();
	context.arc(x,y,radius,0,2*Math.PI,false);
	context.fillStyle = color;
	context.fill();
}

Sketcher.Tool = {
	Pen: {
		stroke: {
			preDraw: function(context,toolData){
				context.fillStyle = toolData.color;
			},
			draw: function(context,x,y,data,toolData){
				Sketcher.fillCircle(context,x+data.thickness/4,y+data.thickness/4,data.thickness/2,toolData.color);
			},
		},
		applyDirectly: false,
	},
	Eraser: {
		stroke: {
			draw: function(context,x,y,data,toolData){
				context.clearRect(
					x-data.apothem/2,
					y-data.apothem/2,
					data.apothem,
					data.apothem
				);
			},
		},
		applyDirectly: true,
	},
};
