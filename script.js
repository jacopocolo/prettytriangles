
/*TODO: 
X fix the weird resolution divisors 
X query top palettes && a random one 
X fix double resolution
X selected button states
X single function to redraw && reset 
X always change size on random
X avoid having the same three colors on the high sides
X fix loopsn, it should be the EXACT loops number
X fix monochrome: when selecting after random full and mono has different colors 
X refactor color settings (each should have its own function)
X fix slider
- avoid the too similar color in monochrome
X reorder divisors by size
X the settings panel should close if clicked outside
X fix the baseoprions issue with slider
- fix gouped button sizing
- add some more divisors when few
X add a loading icon on generate when pressed
- fix loading icon on mobile, if possibile
- after first visit no splashscreen / tap on splashscreen closes it?
X fix weird pattern (on palette --> remove the bg color from array
- go back one? (next version, maybe)
X fix weirdcount counting issue (should alway create pretty exagons)
- save this should do something different on mobile
*/

/*
The basic logic here is: create a series of triangles (drawTriang()) that fits perfectly the screen. Generate a new one each time the user hits the Generate button (generate()) by resetting a set of parameters that defines size (s), colors (["colorful", "mono", "palette"]) and pattern ["full", "stroke", "wierd"]. 

Since I'm not a professional developer but merely a guy goofing around with code, my coding philosophy is: WHATEVER WORKS. But I feel the need to tell you one thing if you want to reuse bits of this code or understand it: it's full of workarounds. The generator is based on a series of random results but, in order to have always decent background, I had to code some wierd bits here and there that tells the generator stuff he's not supposed to do. Keep this in mind while you read this code. 
*/

$('head').append('<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1" />');

$(window).load(function () {
    $("html, body").animate({
        scrollTop: $(document).height()
    }, 1000);
});

//SETUP
var canvas = document.getElementById('sketch');
var ctx = canvas.getContext("2d");

//retina displays and hi-res screens
function backingScale(context) {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}

var scaleFactor = backingScale(ctx);
if (scaleFactor > 1) {
    canvas.width = screen.width * scaleFactor;
    canvas.height = screen.height * scaleFactor;
    // update the context for the new canvas scale
    ctx = canvas.getContext("2d");
} else {
    canvas.width = screen.width;
    canvas.height = screen.height;
}

ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false; //future

//ask for the top palettes from Colourlovers
$.ajax({
    type: 'GET',
    url: 'http://jsonp.guffa.com/Proxy.ashx?url=colourlovers.com/api/palettes/top?format=json',
    dataType: 'jsonp',
    success: function (data) {
        for (x = 0; x < data.length; x++) {
            palettes.push(data[x].colors);
        }
    }
});
//and a random one
$.ajax({
    type: 'GET',
    url: 'http://jsonp.guffa.com/Proxy.ashx?url=colourlovers.com/api/palettes/random?format=json',
    dataType: 'jsonp',
    success: function (data) {
        for (x = 0; x < data.length; x++) {
            palettes.push(data[x].colors);
        }
    }
});

//STARTING VARIABILES
var triangles = []; //array that will contain all the triangles object
var divisors = []; //array with all the common divisors between height and width

//Calculates all the common divisors between height and width and pushes them in an array
function calcDivisors(w, h) {
    for (l = 0; l < w; l++) {
        if (w % l === 0 && h % l === 0) {
            if (l >= 10) {
                divisors.push(l);
            } //remove common divisors that are too small. They take too much time to render on phones. 10px is a good first divisor.
        }
    }
    if (w > h) {
        //if the divisors are very few, push some more elements in the array
        if (divisors.length <= 3) {
            //push some divisors of the shortest side of the canvas, the triangles won't fit perfectly vertically but will fit horizontally and will look pretty enough
            divisors.push(h / 5);
            divisors.push(h / 4);
            divisors.push(h / 3);
        }
        //and push height and width too
        divisors.push(h);
        divisors.push(w);
    } else {
        if (divisors.length <= 3) {
            divisors.push(w / 5);
            divisors.push(w / 4);
            divisors.push(w / 3);
        }
        divisors.push(w);
        divisors.push(h);

    }
    //let's reorder the array, just to be sure
    function sortNumber(a, b) {
        return a - b;
    }
    divisors.sort(sortNumber);
    $("input").attr({
        "max": divisors.length - 1
    });
}
calcDivisors(canvas.width, canvas.height);
var gcd = divisors.length - 1;
var s; //s = The side of the triangle

//COLORS
function randomFromArray(arrayname) {
    return arrayname[Math.floor(Math.random() * arrayname.length)];
}

var colorsettings = ["colorful", "mono", "palette"];
var setcolor = randomFromArray(colorsettings);

//Full color
var luminosities = ["light", "dark"];
var luminosityOption; //calc just under
var ranColor1; // idem
var ranColor2; // idem
function setRanColor() {
    luminosityOption = randomFromArray(luminosities);
    ranColor1 = randomColor({
        luminosity: 'dark'
    });
    ranColor2 = randomColor({
        luminosity: 'light'
    });
}

//Monochromes
var monocolors = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "monochrome"];
var monocolor; // calc just under
var ranMonoColor1;
var ranMonoColor2;

function setRanMonoColor() {
    monocolor = randomFromArray(monocolors);
    ranMonoColor1 = randomColor({
        hue: monocolor
    });
    ranMonoColor2 = randomColor({
        hue: monocolor
    });
}

//Palettes
var palettes = [
    ["326989", "83BDDA", "2A465C", "F5AC2D", "F4681C"]
]; //first one already in as a fallback till the other palettes are loaded from COLORlovers
var randomPalette; //calc just under
var randomPalette1; //needed for pattern
var ranPalColor1;

function setRanPalColor() {
    randomPalette = Math.floor(Math.random() * palettes.length) + 0;
    ranPalColor1 = '#' + palettes[randomPalette][Math.floor(Math.random() * 5) + 0];

    //let's clone the palette and remove the random color so I can use the others in the pattern settings
    randomPalette1 = palettes[randomPalette].slice(0);
    var index = randomPalette1.indexOf(ranPalColor1.substring(1, 7));
    randomPalette1.splice(index, 1);
}

//Patterns
var patterns = ['full', 'stroke', 'pattern'];
var setpattern = randomFromArray(patterns);

//Pattern count
var count = 0;

//Loop number
var loopsn;
var longSide;
var shortSide;

//Let's calc short and long side of my canvas
function calcLongShort() {
    if (canvas.height >= canvas.width) {
        longSide = canvas.height;
        shortSide = canvas.width;
    } else {
        longSide = canvas.width;
        shortSide = canvas.height;
    }
}
calcLongShort();

function calcLoops() {
    var columns = Math.floor(longSide / s); //the columns: longest side divided by the side of the triangle
    var rows = (shortSide / s) * 2; //the rows: shortest side divided by the side of the triangle 
    loopsn = Math.floor(rows * columns + rows * 2); //the loops: rows*columns + twice the number of rows (in the flipped row there's an extra triangle)
}

//FLIPPING
var flipIt = false;
var firstFlip = false;

//FUNCTIONS
function Triangle(x1, y1, x2, y2, x3, y3, color, pattern) {
    this.x1 = x1;
    this.y1 = y2;
    this.x2 = x2;
    this.y2 = y2;
    this.x3 = x3;
    this.y3 = y3;
    this.lineWidth = 1;

    //FULL PATTERN
    if (pattern === 'full') {

        if (color === 'colorful') {
            this.color = randomColor({
                luminosity: luminosityOption
            });
            this.strokeStyle = this.color;
        } else if (color === 'mono') {
            this.color = randomColor({
                hue: monocolor
            });
            this.strokeStyle = this.color;
        } else if (color === 'palette') {
            this.color = '#' + palettes[randomPalette][Math.floor(Math.random() * 5) + 0];
            this.strokeStyle = this.color;
        } else {
            this.color = randomColor({});
            this.strokeStyle = this.color;
        }
    }
    //STROKE PATTERN    
    else if (pattern === 'stroke') {

        if (color === 'colorful') {
            this.color = ranColor1;
            this.strokeStyle = randomColor({
                luminosity: 'light'
            });
        } else if (color === 'mono') {
            this.color = ranMonoColor1;
            this.strokeStyle = ranMonoColor2;
        } else if (color === 'palette') {
            this.color = ranPalColor1;
            this.strokeStyle = '#' + palettes[randomPalette][Math.floor(Math.random() * 5) + 0];
        } else {
            this.color = randomColor({});
            this.strokeStyle = randomColor({});
        }
    }
    //PATTERN    
    else if (pattern === 'pattern') {

        if (color === 'colorful') {
            if (count >= 0 && count <= 2) {
                this.color = randomColor({
                    luminosity: 'light'
                });
                this.strokeStyle = this.color;
                count += 1;
            } else if (count >= 3 && count <= 5) {
                this.color = ranColor2;
                this.strokeStyle = this.color;
                count += 1;
            } else {
                count = 0;
            }
        } else if (color === 'mono') {
            if (count >= 0 && count <= 2) {
                this.color = ranMonoColor1;
                this.strokeStyle = ranMonoColor2;
                count += 1;
            } else if (count >= 3 && count <= 5) {
                this.color = ranMonoColor2;
                this.strokeStyle = ranMonoColor1;
                count += 1;
            } else {
                count = 0;
            }
        } else if (color === 'palette') {
            if (count >= 0 && count <= 2) {
                this.color = '#' + randomPalette1[Math.floor(Math.random() * 4) + 0];
                this.strokeStyle = this.color;
                count += 1;
            } else if (count >= 3 && count <= 5) {
                this.color = ranPalColor1;
                this.strokeStyle = this.color;
                count += 1;
            } else {
                count = 0;
            }
        }
    }
}

function drawTriang(side, color, pattern) {

    x1 = 0 - side / 2;
    y1 = 0 + side;
    x2 = 0 + side / 2;
    y2 = 0 + side;
    x3 = 0;
    y3 = 0;

    for (i = 0; i <= loopsn; i++) {

        //the first triangle is generated with default values and only once
        if (triangles.length === 0) {
            triang = new Triangle(x1, y1, x2, y2, x3, y3, color, pattern);
            triangles.push(triang);
        }
        //all the following triangles in the same row are generated just by rotating the coordinated of the first triangle
        var ultimo = triangles.length - 1;
        if (x3 < canvas.width) {
            x1 = triangles[ultimo].x3;
            y1 = triangles[ultimo].y3;
            x2 = triangles[ultimo].x3 + s;
            y2 = triangles[ultimo].y3;
            x3 = triangles[ultimo].x2;
            y3 = triangles[ultimo].y2;
            triang = new Triangle(x1, y1, x2, y2, x3, y3, color, pattern);
            triangles.push(triang);
        } else {
            // while triangles are inside the canvas we copy and move them, when they are drawn outside the canvas we find the first triangle of their row and create another one under it and start a new row
            var trianglesInLine;
            if (firstFlip === false) {
                trianglesInLine = i;
                firstFlip = true;
                //this runs only once, gets to the number of triangles for each line (the first i after the flip)
            }
            var primo = ultimo - trianglesInLine;
            //one every two triangles must be flipped so we have different coordinates depending if flipIt is false or true
            if (flipIt === false) {
                x1 = triangles[primo].x1;
                y1 = triangles[primo].y1;
                x2 = triangles[primo].x2;
                y2 = triangles[primo].y2;
                x3 = triangles[primo].x3;
                y3 = triangles[primo].y3 + s + s;
                triang = new Triangle(x1, y1, x2, y2, x3, y3, color, pattern);
                triangles.push(triang);
                flipIt = !flipIt;
            } else {
                x1 = triangles[primo].x1;
                y1 = triangles[primo].y1 + s + s;
                x2 = triangles[primo].x2;
                y2 = triangles[primo].y2 + s + s;
                x3 = triangles[primo].x3;
                y3 = triangles[primo].y3;
                triang = new Triangle(x1, y1, x2, y2, x3, y3, color, pattern);
                triangles.push(triang);
                flipIt = !flipIt;
            }
        }
    }
}

function drawTriangles() {

    for (l = 0; l < triangles.length; l++) {
        ctx.beginPath();
        ctx.moveTo(triangles[l].x1, triangles[l].y2);
        ctx.lineTo(triangles[l].x2, triangles[l].y2);
        ctx.lineTo(triangles[l].x3, triangles[l].y3);
        ctx.closePath();
        ctx.fillStyle = triangles[l].color;
        ctx.fill();
        ctx.strokeStyle = triangles[l].strokeStyle;
        ctx.lineWidth = triangles[l].lineWidth;
        ctx.stroke();
    }
}

function generateBackground(reset) {
    //reset starting values
    triangles = [];
    flipIt = false;
    firstFlip = false;
    calcLoops();
    count = 1; //so if it's an exagon it won't look bad

    if (reset === true) {
        //resetSize
        cd = Math.floor(Math.random() * divisors.length) + 0;
        s = divisors[cd];
        //set slider accordingly
        $("input").val(cd);
        calcLoops();

        //resetColor and set buttons accordingly
        setcolor = randomFromArray(colorsettings);
        setRanMonoColor();
        setRanColor();
        setRanPalColor();
        if (setcolor === 'colorful') {
            $('.color').removeClass('selectedButton');
            $('#colorful').addClass('selectedButton');
        } else if (setcolor === 'mono') {
            $('.color').removeClass('selectedButton');
            $('#mono').addClass('selectedButton');
        } else if (setcolor === 'palette') {
            $('.color').removeClass('selectedButton');
            $('#palette').addClass('selectedButton');
        }

        //resetPattern and set buttons accordingly
        setpattern = randomFromArray(patterns);
        if (setpattern === 'full') {
            $('.pattern').removeClass('selectedButton');
            $('#full').addClass('selectedButton');
        } else if (setpattern === 'stroke') {
            $('.pattern').removeClass('selectedButton');
            $('#stroke').addClass('selectedButton');
        } else if (setpattern === 'pattern') {
            $('.pattern').removeClass('selectedButton');
            $('#pattern').addClass('selectedButton');
        }
    }

    //clears the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //redraw
    drawTriang(s, setcolor, setpattern);

    /*next three lines: trying to fix the ugly rendering of the canvas by painting a full rectangle filled the same color of the first triangle under the whole canvas. I'm not entirely sure if it's useful but it doesn't hurt.*/
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = triangles[1].color;
    ctx.fill();

    //let's be sure there are no backgrounds made of triangles with the exact same color 
    if (triangles[0].color === triangles[1].color && s === divisors[divisors.lenght - 1] && setcolor === 'palette' && setpattern === 'pattern') {
        generate();
    } else {
        drawTriangles();
    }

    $('#bg').fadeOut(700);
    $('#bg').remove();
    //create an actual image inside the view
    function getImage() {
        var imgData = document.getElementById("sketch").toDataURL();
        $('body').append('<img style="display:none;" id="bg" src="' + imgData + '"/>');
        $('#bg').fadeIn(700);
        if (scaleFactor > 1) {
            $('#bg').width(canvas.width / scaleFactor);
            $('#bg').height(canvas.height / scaleFactor);
        }
    }
    getImage();
    $('#generator').text('Generate');
    closeSettingsOnClick(); //calling it here so the query is updated with every new image
}

function generate() {
    if ($('#randomcheckbox')[0].checked) {
        generateBackground(true);
    } else {
        //create some new colors with the same settings
        setRanColor();
        setRanMonoColor();
        setRanPalColor();
        //draw me something new
        generateBackground(false);
    }
}

generate();





//INTERFACE FUNCTIONS
function setColorful() {
    luminosityOption = randomFromArray(luminosities);
    setcolor = 'colorful';
    setRanColor();
    generateBackground(false);
}

function setMono() {
    setcolor = 'mono';
    monocolor = randomFromArray(monocolors);
    setRanMonoColor();
    generateBackground(false);
}

function setPalette() {
    setcolor = 'palette';
    randomPalette = Math.floor(Math.random() * palettes.length) + 0;
    setRanPalColor();
    generateBackground(false);
}

function setFull() {
    setpattern = 'full';
    generateBackground(false);
}

function setStroke() {
    setpattern = 'stroke';
    generateBackground(false);
}

function setPattern() {
    setpattern = 'pattern';
    generateBackground(false);
}

function setSize() {
    s = divisors[$('#sizes').val()];
    generateBackground(false);
}

//input range listener
$('#sizes').on("change", function () {
    setLoading();
    setTimeout(setSize, 250); //the delay allows the slider to be responsive on mobile
});

function onOffButtons() {
    if ($('.color, .pattern, #sizes').is(':disabled')) {
        $('.color, .pattern, #sizes').prop('disabled', false);
        $('.separator').css('color', '#000');
    } else {
        $('.color, .pattern, #sizes').prop('disabled', true);
        $('.separator').css('color', '#999');
    }
}

//open settings
function openSettings() {
    if ($('#inputscontanier').hasClass('open')) {

        $('#settings').delay(10).animate({
            bottom: '70px'
        }).text('Settings');
        $('#inputscontanier').animate({
            bottom: '-420px'
        }).removeClass('open');

    } else { //nesting is there to synchronize animations
        $('#inputscontanier').animate({
            bottom: '-300px'
        }, 70, function () {
            $('#settings').animate({
                bottom: '360px'
            }).text('Close');
            $('#inputscontanier').animate({
                bottom: '0px'
            }).addClass('open');

        });
    }
}

//close settings if you tap/click on image when settings is open
function closeSettingsOnClick() {
    $('#bg').on('click touchstart', function () {
        if ($('#inputscontanier').hasClass('open')) {
            $('#settings').delay(10).animate({
                bottom: '70px'
            }).text('Settings');
            $('#inputscontanier').animate({
                bottom: '-370px'
            }).removeClass('open');
        }
    });
}

$('#overlay').on('click touchstart', function () {
    $('#overlay').fadeOut();
});

function saveThis() {
    function saveImgData() {
        window.location.href = document.getElementById("sketch").toDataURL().replace('image/png', 'image/octet-stream');
    }
    saveImgData();
}

function setLoading() {
    $('#generator').text('');
    $('#generator').spin({
        lines: 11, // The number of lines to draw
        length: 5, // The length of each line
        width: 2, // The line thickness
        radius: 5, // The radius of the inner circle
        corners: 1, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 1, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: true, // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        top: '50%', // Top position relative to parent
        left: '50%' // Left position relative to parent
    });
}