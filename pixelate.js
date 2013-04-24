/*
  TODO:
    - enable getting palettes from a conf file
*/
var fs = require("fs")
  , prg = require("commander")
  , PNG = require("pngjs").PNG
  , PPng = require("./lib/ppng");

var palettes = {
  "gray": {
    "black": PPng.Color.create([0, 0, 0], "black", "a")
    , "dark-gray1": PPng.Color.create([32, 32, 32], "dark-gray1", "b")
    , "dark-gray2": PPng.Color.create([64, 64, 64], "dark-gray2", "c")
    , "dark-gray3": PPng.Color.create([96, 96, 96], "dark-gray3", "d")
    , "medium-gray1": PPng.Color.create([127, 127, 127], "medium-gray1", "e")
    , "medium-gray2": PPng.Color.create([168, 168, 168], "medium-gray2", "f")
    , "medium-gray3": PPng.Color.create([180, 180, 180], "medium-gray3", "g")
    , "light-gray": PPng.Color.create([192, 192, 192], "light-gray", "g")
    , "very-light-gray": PPng.Color.create([224, 224, 224], "very-light-gray", "i")
    , "white": PPng.Color.create([255, 255, 255], "white", "j")
    , "blue": PPng.Color.create([40, 50, 90], "blue", "k")
  }
  , "blue": {
    "blue-dark": PPng.Color.create([64, 64, 248], "blue-dark", "a")
    , "blue-medium-dark": PPng.Color.create([128, 128, 248], "blue-medium-dark", "b")
    , "blue-medium": PPng.Color.create([168, 168, 248], "blue-medium", "c")
    , "blue-light": PPng.Color.create([192, 192, 248], "blue-light", "d")
    , "blue-very-light": PPng.Color.create([224, 224, 248], "blue-very-light", "e")
  }
};

prg
  .version("0.0.1")
  .option("-f, --file [file]", "png file to process", "image.png")
  .option("-r, --ratio [ratio]", "pixel ratio", parseInt, 1)
  .option("-o, --out [out]", "output file name")
  .option("-n, --natural", "use natural (closest) color instead of using a palette constraint")
  .parse(process.argv);

var argErrors = [];
if (isNaN(prg.ratio) || prg.ratio < 1) {
  argErrors.push(" - give ratio as a whole number > 0");
}
if ("string" != typeof prg.file || prg.file.length < 1) {
  argErrors.push(" - give file name as a non empty string");
}
if (!prg.file.match(/\.png$/)) {
  argErrors.push(" - works only with .png files currently");
}

if (argErrors.length) {
  console.log(argErrors.join("\n"));
  process.exit(1);
}

if ("string" != typeof prg.out || prg.out.length < 1) {
  // build name from input file
  prg.out = (function (path) {
    var nameParts = (/^(.*)(\.png)$/).exec(path.substring(path.lastIndexOf("/")+1));
    return [nameParts[1], "-pixelated-r", prg.ratio, "%palette%", nameParts[2]].join("");
  })(prg.file);
}

// build options to use later
var options = {
  "ratio": prg.ratio
  , "file": prg.file
  , "out": prg.out
  , "natural": "natural" in prg
};



function run(options, cb) {
  console.log("-- opening file "+options.file);
  fs.createReadStream(options.file).on("error", function (err) {
    console.error("#error: "+err);
  }).pipe(new PNG({
    "filterType": 4
  })).on("parsed", function () {
    console.log("-- processing...");
    var ppng = PPng.create(this, options.ratio);
    processPPng(ppng, options.palette, cb);
  });
}

function do_run(options) {
  options.out = options.out.replace(/%palette%/, (options.natural?"":"-"+options.paletteName));
  run(options, function (ppng) {
    process.exit();
  });
}


(function () {
  // use natural colors
  if (options.natural) {
    do_run(options);
    return;
  }
  // choose palette and do processing
  console.log("Choose palette:");
  var choices = Object.keys(palettes);
  prg.choose(choices, function (idx) {
    options.paletteName = choices[idx];
    options.palette = palettes[options.paletteName];
    do_run(options);
  });
})();


function processPPng(ppng, palette, cb) {
  var width = Math.ceil(ppng.getWidth())
    , height = Math.ceil(ppng.getHeight())
    , rgba, closest = {};
  for (var y = 0; y < height; ++y) {
    for (var x = 0; x < width; ++x) {
      rgba = ppng.getPixel(x, y);
      if (options.natural) {
        closest = rgba;
        closest.name = null;
        closest.symbol = "_";
      }
      else {
        closest = findClosest(rgba, palette);
      }
      ppng.setPixel(x, y, closest);
    }
  }
  ppng.write(options.out, cb);
}

function findClosest(rgba, palette) {
  var diff = Number.MAX_VALUE, tmp, result;
  for (var key in palette) {
    (tmp = difference(rgba, palette[key])) < diff && (result = key, diff = tmp);
  }
  return palette[result];
}

function difference (color, candidate) {
  var weights = {
    "r": .3
    , "g": .59
    , "b": .45
  }
  , result = 0;
  for (var prop in weights) {
    result += Math.pow((candidate.rgba[prop]-color.rgba[prop])*weights[prop] , 2);
  }
  return result;
}
