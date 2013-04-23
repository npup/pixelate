var fs = require("fs")
  , prg = require("commander")
  , PNG = require("pngjs").PNG
  , PPng = require("./lib/ppng");



var palettes = {
  "gray": {
    "black": [0, 0, 0, "a"]
    , "dark-gray1": [32, 32, 32, "b"]
    , "dark-gray2": [64, 64, 64, "c"]
    , "dark-gray3": [96, 96, 96, "d"]
    , "medium-gray1": [127, 127, 127, "e"]
    , "medium-gray2": [168, 168, 168, "f"]
    , "medium-gray3": [180, 180, 180, "g"]
    , "light-gray": [192, 192, 192, "g"]
    , "very-light-gray": [224, 224, 224, "i"]
    , "white": [255, 255, 255, "j"]
    , "blue": [40, 50, 90, "k"]
  }
  , "blue": {
    "blue-dark": [64, 64, 248, "0"]
    , "blue-medium-dark": [128, 128, 248, "1"]
    , "blue-medium": [168, 168, 248, "2"]
    , "blue-light": [192, 192, 248, "3"]
    , "blue-very-light": [224, 224, 248, "4"]
  }
};

prg
  .version("0.0.1")
  .option("-f, --file [file]", "png file to process", "image.png")
  .option("-r, --ratio [ratio]", "pixel ratio", parseInt, 1)
  .option("-o, --out [out]", "output file name")
  .option("-h, --html", "pattern as HTML file")
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
    return [nameParts[1], "-pixelated-r", prg.ratio, nameParts[2] ].join("");
  })(prg.file);
}

// build options to use later
var options = {
  "ratio": prg.ratio
  , "file": prg.file
  , "out": prg.out
  , "html": "html" in prg
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
  run(options, function (ppng) {
    process.exit();
  });
}
// choose palette and do processing
(function () {
  if (options.natural) {
    do_run(options);
    return;
  }
  console.log("Choose palette:");
  var choices = Object.keys(palettes);
  prg.choose(choices, function (idx) {
    options.palette = palettes[choices[idx]];
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
        closest = {"name": "-original-", "rgb": [rgba.r, rgba.g , rgba.b ,"+"], "symbol": "_"};
      }
      else {
        closest = findClosest(rgba, palette);
      }
      if (!closest.rgb) {
        ppng.setPixel(x, y, {
           "a": 128
        });
        continue;
      }
      var data = {
        "rgb": {
          "r": closest.rgb[0]
          , "g": closest.rgb[1]
          , "b": closest.rgb[2]
        }
        , "name": closest.name
        , "symbol": closest.symbol
      };
      ppng.setPixel(x, y, data);
    }
  }
  ppng.write(options.out, cb, options.html);
}

function findClosest(rgba, palette) {
  var diff = Number.MAX_VALUE, tmp, result;
  for (var key in palette) {
    (tmp = difference([rgba.r, rgba.g, rgba.b], palette[key])) < diff && (result = key, diff = tmp);
  }
  var code = palette[result];
  return {
    "name": result
    , "rgb": code
    , "symbol": code[3]
  };
}

function difference (color, candidate) {
  return Math.pow(((candidate[0]-color[0])*0.30), 2)
    + Math.pow(((candidate[1]-color[1])*0.59), 2)
    + Math.pow(((candidate[2]-color[2])*0.45), 2);
}
