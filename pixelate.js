/*
  TODO:
    - enable getting palettes from a conf file
*/
var fs = require("fs")
  , prg = require("commander")
  , PNG = require("pngjs").PNG
  , PPng = require("./lib/ppng")
  , Palette = PPng.Color.Palette;

var palettes = Palette.Collection.create()
  .add(Palette.create("gray")
    .set([10, 10, 10], "black", "a")
    .set([32, 32, 32], "dark-gray1", "b")
    .set([64, 64, 64], "dark-gray2", "c")
    .set([96, 96, 96], "dark-gray3", "d")
    .set([127, 127, 127], "medium-gray1", "e")
    .set([168, 168, 168], "medium-gray2", "f")
    .set([180, 180, 180], "medium-gray3", "g")
    .set([192, 192, 192], "light-gray1", "h")
    .set([224, 224, 224], "light-gray2", "i")
    .set([242, 242, 242], "light-gray3", "j")
    .set([253, 253, 253], "white", "k")
    .set([40, 50, 90], "blue", "l")
  )
  .add(Palette.create("blue")
    .set([5, 5, 10], "black", "a")
    .set([16, 16, 32], "dark-blue1", "b")
    .set([32, 32, 64], "dark-blue2", "c")
    .set([48, 48, 96], "dark-blue3", "d")
    .set([63, 63, 127], "medium-blue1", "e")
    .set([84, 84, 168], "medium-blue2", "f")
    .set([90, 90, 180], "medium-blue3", "g")
    .set([86, 86, 192], "light-blue1", "h")
    .set([112, 112, 224], "light-blue2", "i")
    .set([121, 121, 242], "light-blue3", "j")
    .set([253, 253, 253], "white", "k")
);

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
  options.out = options.out.replace(/%palette%/, (options.natural?"":"-"+options.palette.name));
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
  var names = palettes.getNames();
  prg.choose(names, function (idx) {
    options.palette = palettes.get(names[idx]);
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
        closest = palette.findClosest(rgba);
      }
      ppng.setPixel(x, y, closest);
    }
  }
  ppng.write(options.out, cb);
}
