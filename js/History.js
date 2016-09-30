function History(){
	this.stack = [];
	this.pops  = 0;
};

History.prototype.clear = function(){
	this.stack = [];
	this.pops  = 0;
}

History.prototype.length = function(){
	return this.stack.length - this.pops;
}

History.prototype.push = function(elem){
	if(this.pops>0){
		this.stack.length = this.length()+1;
		this.pops = 0;
		return (this.stack[this.stack.length-1] = elem);
	}else{
		return this.stack.push(elem);
	}
}

History.prototype.pop = function(){
	if(this.stack.length>this.pops){
		this.pops+=1;
		return this.stack[this.length()];
	}
}

History.prototype.popAll = function(){
	this.pops = this.stack.length;
}

History.prototype.unpop = function(){
	if(this.pops>0){
		this.pops-=1;
		return this.stack[this.length()-1];
	}
}

History.prototype.unpopAll = function(){
	this.pops = 0;
}

History.prototype.get = function(index){
	return this.stack[index];
}

History.prototype.latest = function(){
	return this.stack[this.length()-1];
}

History.prototype.elements = function(){
	return this.stack.slice(0,this.length());
}

History.prototype.poppedElements = function(){
	return this.stack.slice(this.length());
}
