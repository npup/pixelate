var fs = require("fs")
  , prg = require("commander")
  , PNG = require("pngjs").PNG
  , PPng = require("./ppng");

var palettes = {
  "gray": {
    "black": [0, 0, 0]
    , "dark gray1": [32, 32, 32]
    , "dark gray2": [64, 64, 64]
    , "dark gray3": [96, 96, 96]
    , "medium gray1": [127, 127, 127]
    , "medium gray2": [168, 168, 168]
    , "medium gray3": [180, 180, 180]
    , "light gray": [192, 192, 192]
    , "very light gray": [224, 224, 224]
    , "white": [255, 255, 255]
    , "blue": [40, 50, 90]
  }
  , "blue": {
    "blue-dark": [64, 64, 248]
    , "blue-medium-dark": [128, 128, 248]
    , "blue-medium": [168, 168, 248]
    , "blue-light": [192, 192, 248]
    , "blue-very-light": [224, 224, 248]
  }
};

prg
  .version("0.0.1")
  .option("-f, --file [file]", "png file to process", "image.png")
  .option("-r, --ratio [ratio]", "pixel ratio", parseInt, 1)
  .option("-o, --out [out]", "output file name")
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
    return [nameParts[1], "-pixelated-r", prg.ratio, nameParts[2] ].join("");
  })(prg.file);
}

// build options to use later
var options = {
  "ratio": prg.ratio
  , "file": prg.file
  , "out": prg.out
};

// choose palette and do processing
(function () {
  console.log("Choose palette:");
  var choices = Object.keys(palettes);
    prg.choose(choices, function (idx) {
    options.palette = palettes[choices[idx]];
    run(options, function (ppng) {
      process.exit();
    });
  });  
})();


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

function processPPng(ppng, palette, cb) {
  var width = Math.ceil(ppng.getWidth())
    , height = Math.ceil(ppng.getHeight())
    , rgba, closest;
  for (var y = 0; y < height; ++y) {
    for (var x = 0; x < width; ++x) {
      rgba = ppng.getPixel(x, y);
      closest = findClosest(rgba, palette);
      if (!closest.rgb) {
        ppng.setPixel(x, y, {
           "a": 128
        });
        continue;
      }
      ppng.setPixel(x, y, {
        "r": closest.rgb[0]
        , "g": closest.rgb[1]
        , "b": closest.rgb[2]
      });
    }
  }
  ppng.write(options.out, cb);
}

function findClosest(rgba, palette) {
  var diff = Number.MAX_VALUE, tmp, candidate, result;
  for (var key in palette) {
    (tmp = difference([rgba.r, rgba.g, rgba.b], (candidate = palette[key]))) < diff && (result = key, diff = tmp);
  }
  return {
    "name": result
    , "rgb": palette[result]
  };
}

function difference (color, candidate) {
  return Math.pow(((candidate[0]-color[0])*0.30), 2)
    + Math.pow(((candidate[1]-color[1])*0.59), 2)
    + Math.pow(((candidate[2]-color[2])*0.45), 2);
}
