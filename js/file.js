function saveCanvas(c){
	localStorage.setItem("imgSave",c.toDataURL());
	$.bootstrapGrowl("Sketch saved.", {delay: 3000,allow_dismiss: false});
}
function loadCanvas(c) {
	if (!localStorage.getItem("imgSave")) return;
    var img = new Image();
    img.onload = function() {
       var ctx=c.getContext("2d");
       ctx.drawImage(img, 0, 0, img.width, img.height);
    };
    img.src= localStorage.getItem("imgSave");
    $.bootstrapGrowl("Sketch loaded.", {delay: 3000,allow_dismiss: false});
}

function downloadImg(c, filename) {

    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a'),
        e;

    /// the key here is to set the download attribute of the a tag
    lnk.download = filename;

    /// convert canvas content to data-uri for link. When download
    /// attribute is set the content pointed to by link will be
    /// pushed as "download" in HTML5 capable browsers
    lnk.href = c.toDataURL();

    /// create a "fake" click-event to trigger the download
    if (document.createEvent) {

        e = document.createEvent("MouseEvents");
        e.initMouseEvent("click", true, true, window,
                         0, 0, 0, 0, 0, false, false, false,
                         false, 0, null);

        lnk.dispatchEvent(e);

    } else if (lnk.fireEvent) {

        lnk.fireEvent("onclick");
    }
}