var fs = require("fs");

var PPng = (function () {

  function PPng(png, ratio) {
    var p = this;
    p.ratio = ratio;
    p.png = png;
    p.pixels = {};
    var width = png.width
      , height = png.height
      , x, y, idx;
    for (y = 0; y < height; ++y) {
      for (x = 0; x < width; ++x) {
        x in p.pixels || (p.pixels[x] = {});
        idx = (width * y + x) << 2;
        p.pixels[x][y] = idx;
      }
    }
  }

  function getPixelIdx(ppng, x, y) {
    return ppng.pixels[x*ppng.ratio][y*ppng.ratio];
  }

  PPng.prototype = {
    "constructor": PPng
    , "getPixel": function (x, y) {

      var ppng = this
        , png = ppng.png
        , idx = getPixelIdx(ppng, x, y)
        , ratio = ppng.ratio
        , pixels = [], n = 4;

      for (var offset=0; offset<ratio; ++offset) {
        for (var offset2=0; offset2<ratio; ++offset2) {
          var vPxIdx = idx+offset*n+offset2*png.width*4;
          if (
            ratio*x+offset >= png.width // x fuckup
            || ratio*y+offset2 >= png.height // y fuckup
          ) {continue;}
          pixels.push({
            "r": png.data[vPxIdx]
            , "g": png.data[1+vPxIdx]
            , "b": png.data[2+vPxIdx]
            , "a": png.data[3+vPxIdx]
          });
        }
      }
      return pixels.length == 1 ? pixels[0] : createMedium(pixels);
    }
    , "setPixel": function (x, y, rgba) {
      var ppng = this
        , png = ppng.png
        , idx = getPixelIdx(ppng, x, y)
        , ratio = ppng.ratio
        , n = 4;
      for (var offset=0; offset<ratio; ++offset) {
        for (var offset2=0; offset2<ratio; ++offset2) {
          if (
            ratio*x+offset >= png.width // x fuckup
            || ratio*y+offset2 >= png.height // y fuckup
          ) {continue;}
          "r" in rgba && (png.data[idx+offset*n+0+offset2*png.width*n] = rgba.r);
          "g" in rgba && (png.data[idx+offset*n+1+offset2*png.width*n] = rgba.g);
          "b" in rgba && (png.data[idx+offset*n+2+offset2*png.width*n] = rgba.b);
          "a" in rgba && (png.data[idx+offset*n+3+offset2*png.width*n] = rgba.a);
        }
      }
    }
    , "write": function (name, cb) {
      name || (name = "out.png");
      var ppng = this;
      ppng.png.pack().pipe(fs.createWriteStream(name)).on("close", function () {
        console.log("-- wrote file: %s", name);
        cb && cb(ppng);
      });
    }
    , "getWidth": function () {
      var ppng = this;
      return ppng.png.width / ppng.ratio;
    }
    , "getHeight": function () {
      var ppng = this;
      return ppng.png.height / ppng.ratio;
    }
    , "toString": function () {
      var ppng = this;
      return "[ width: "+ppng.getWidth()+", height: "+ppng.getHeight()+", ratio: "+ppng.ratio+" ]";
    }
  };

  function createMedium(pixels) {
    var rgba = {"r": 0, "g": 0, "b": 0, "a": 0};
    for (var idx=0, len=pixels.length, pixel; idx<len; ++idx) {
      pixel = pixels[idx];
      rgba.r += pixel.r;
      rgba.g += pixel.g;
      rgba.b += pixel.b;
      rgba.a += pixel.a;
    }
    rgba.r /= len;
    rgba.g /= len;
    rgba.b /= len;
    rgba.a /= len;
    return rgba;
  }

  return {
    "create": function (png, ratio) {
      ("number" == typeof ratio && ratio > 0) || (ratio = 1);
      return new PPng(png, ratio);
    }
  };

})();

module.exports = PPng;
