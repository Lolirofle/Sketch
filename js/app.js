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
	this.actions = new History(); //History[*Action] (Stack-like structure of *Actions)
	this.currentAction = null; //*Action
	this.mousePreviousX = 0;
	this.mousePreviousY = 0;
	this.mousePreviousMoveTime = 0;
	this.tool = Sketcher.Tool.Pen; //Tool

	//Settings
	this.settings = new Sketcher.Settings();

	//Intialization
	this.canvas.elem.onkeydown = function(event){
		switch(event.keyCode){
			case 90://z
				if(event.ctrlKey){
					if(event.shiftKey){
						sketcher.redoAction();
					}else if(sketcher.currentAction!==null){
						sketcher.resetCurrentStroke();
					}else{
						sketcher.undoAction();
					}
				}
				break;
			case 89://y
				if(event.ctrlKey){
					sketcher.redoAction();
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
		//Tool action
		if(typeof sketcher.tool.action!=="undefined"){
			sketcher.currentAction = sketcher.tool.action(sketcher.tool.applyDirectly? sketcher.sketch.context : sketcher.canvas.context,sketcher.settings);
			if(sketcher.currentAction!=null){
				sketcher.currentAction.tool = sketcher.tool;
			}
		}
		//Tool action
		else if(typeof sketcher.tool.positionalAction!=="undefined"){
			sketcher.currentAction = sketcher.tool.positionalAction(sketcher.tool.applyDirectly? sketcher.sketch.context : sketcher.canvas.context,event.offsetX,event.offsetY,sketcher.settings);
			if(sketcher.currentAction!=null){
				sketcher.currentAction.tool = sketcher.tool;
			}
		}

		sketcher.mousePreviousX = event.offsetX;
		sketcher.mousePreviousY = event.offsetY;
		sketcher.mousePreviousMoveTime = Date.now();
	};

	this.canvas.elem.onmouseup = this.canvas.elem.onmouseleave = function(event){
		//Releasing a stroke
		if(sketcher.currentAction!==null && typeof sketcher.tool.stroke!=="undefined"){
			//If the action was not applied directly to the sketch
			if(!sketcher.tool.applyDirectly){
				//Copy the canvas to the sketch
				sketcher.sketch.context.drawImage(sketcher.canvas.elem,0,0);
				sketcher.canvas.context.clearRect(0,0,sketcher.width(),sketcher.height());
			}

			//Add the current stroke to the history of strokes (if it is more than a point)
			if(sketcher.currentAction.x.length>2){
				sketcher.addAction(sketcher.currentAction);
			}
			sketcher.currentAction = null;
		}
	}

	this.canvas.elem.onmousemove = function(event){
		if(sketcher.currentAction!==null){
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

					var thickness = sketcher.currentAction.data.length==0? 1 : sketcher.currentAction.data[sketcher.currentAction.data.length-1].thickness;
					var targetThickness = sketcher.settings.lineThickness/(Math.sqrt(dist/(time-sketcher.mousePreviousMoveTime)+1));

					//For each pixel unit distance, draw as a line connecting the two points to get a continuous line
					for(var i=0; i<dist; i+=1){
						var step = i/dist;
						var x    = x2*step - x1*(step-1);
						var y    = y2*step - y1*(step-1);
						var data = {thickness: thickness};
						thickness = Math.max(1,thickness + Math.sign(targetThickness-thickness)/3);

						sketcher.currentAction.x.push(x);
						sketcher.currentAction.y.push(y);
						sketcher.currentAction.data.push(data);
						sketcher.currentAction.time.push(i==0? time-sketcher.mousePreviousMoveTime : 0);
						sketcher.tool.stroke.draw(
							sketcher.tool.applyDirectly? sketcher.sketch.context : sketcher.canvas.context,
							x,
							y,
							data,
							sketcher.currentAction.toolData
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
						var data = {apothem: sketcher.settings.lineThickness};

						sketcher.currentAction.x.push(x);
						sketcher.currentAction.y.push(y);
						sketcher.currentAction.data.push(data);
						sketcher.currentAction.time.push(i==0? time-sketcher.mousePreviousMoveTime : 0);
						sketcher.tool.stroke.draw(
							sketcher.tool.applyDirectly? sketcher.sketch.context : sketcher.canvas.context,
							x,
							y,
							data,
							sketcher.currentAction.toolData
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

function StrokeAction(tool){
	this.tool = tool;
	this.toolData = {};

	this.x    = [];
	this.y    = [];
	this.time = [];
	this.data = [];
}

StrokeAction.prototype.draw = function(context){
	//Pre-stroke action
	if(this.tool.action != null){
		this.tool.action(context,this.toolData,null);//TOOO: Null as settings. action is probably not a good abstraction
	}
	//Draw all parts of the stroke
	for(var i=0; i<this.x.length; i+=1){
		this.tool.stroke.draw(context,this.x[i],this.y[i],this.data[i],this.toolData);
	}
}

Sketcher.prototype.newCanvas = function(){
	//Clear
	this.sketch.context.clearRect(0,0,this.width(),this.height());

	//Reset states
	this.actions = new History();
}

Sketcher.prototype.resizeCanvas = function(w,h){
	this.canvas.elem.width  = w;
	this.sketch.elem.width  = w;

	this.canvas.elem.height = h;
	this.sketch.elem.height = h;
}

Sketcher.prototype.drawAllActions = function(context){
	for(var i=0,len=this.actions.length(); i<len; i+=1){
		this.actions.get(i).draw(context);
	}
}

Sketcher.prototype.undoAction = function(){
	var action = this.actions.pop();
	if(action !== undefined){
		this.sketch.context.clearRect(0,0,this.width(),this.height());
		this.drawAllActions(this.sketch.context);
	}
}

Sketcher.prototype.addAction = function(action){
	this.actions.push(action);
}

Sketcher.prototype.redoAction = function(){
	var action = this.actions.unpop();
	if(action !== undefined){
		action.draw(this.sketch.context);
	}

}

Sketcher.prototype.resetCurrentStroke = function(){
	if(this.currentAction !== null){
		this.currentAction = null;

		if(this.tool.applyDirectly){
			this.drawAllActions(this.sketch.context);
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

	//Draw all strokes //TODO: Only handles strokes
	time_loop({i: 0, len: this.actions.length()} , function(data){return data.i<data.len;} , function(data,nextFn){
		var stroke = this_.actions.get(data.i);

		if(stroke.tool.action != null){
			stroke.tool.action(context,stroke.toolData,this_.settings);
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

Sketcher.Settings = function(){
	this.lineThickness = 10; //px
	this.color = "#000000"; //CssColor (CanvasContext.fillStyle)
}

/**
 * List of tools
 * Each tool is a record entry
 * Each entry have the following possible entries:
 *   action: (CanvasContext,Sketcher) -> *Action|Null
 *     Returns an action if the tool action should be saved to the history
 *   positionalAction: (CanvasContext,x@int,y@int,Sketcher) -> *Action|Null
 *   stroke:
 *     draw: (CanvasContext,x@int,y@int,data@Object,toolData@Object)
 *       Draws part of a stroke.
 *       x, y, data and toolData are from the StrokeAction
 *   applyDirectly: bool
 *     This decides which context that are given to the actions
 *     Though, all actions must be
 *     true  => Sketcher.sketch.context are given
 *     false => Sketcher.sketch.canvas are given
 */
Sketcher.Tool = {
	Pen: {
		action: function(context,settings){
			var action = new StrokeAction();
			action.toolData = {color: settings.color};
			context.fillStyle = action.toolData.color;
			return action;
		},
		stroke: {
			draw: function(context,x,y,data,toolData){
				Sketcher.fillCircle(context,x+data.thickness/4,y+data.thickness/4,data.thickness/2,toolData.color);
			},
		},
		applyDirectly: false,
	},
	Eraser: {
		action: function(context,settings){
			return new StrokeAction();
		},
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
	ColorPicker: {
		positionalAction: function(context,x,y,settings){
			var rgb = context.getImageData(x,y,1,1).data;
			settings.color = "#" + ("000000" + ((rgb[0]<<16) | (rgb[1]<<8) | rgb[2]).toString(16)).slice(-6);
			return null;
		},
		applyDirectly: true,
	},
};
