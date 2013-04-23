var fs = require("fs");

var PPng = (function () {

  var Color = (function () {
    function Color(rgba, name, symbol) {
      var instance = this;
      for (var idx=0, val; idx<4; ++idx) {
        val = rgba[idx];
        ("number" == typeof val) || (rgba[idx] = 255);
      }
      instance.rgba = {"r": rgba[0], "g": rgba[1], "b": rgba[2], "a": rgba[3]};
      instance.name = name;
      instance.symbol = symbol;
    }
    Color.prototype = {
      "constructor": Color
      , "toRGBA": function () {
        var instance = this;
        return "rgba("+instance.rgba.r+", "+instance.rgba.g+", "+instance.rgba.b+", "+instance.rgba.a+")";
      }
    };
    return {
      "create": function (rgba, name, symbol) {
        return new Color(rgba, name, symbol);
      }
    };
  })();

  function PPng(png, ratio) {
    var p = this;
    p.ratio = ratio;
    p.png = png;
    p.pixels = {};
    p.colorNames = [];
    var width = png.width
      , height = png.height
      , x, y, idx;
    for (y = 0; y<Math.ceil(height/ratio); ++y) {
      p.colorNames.push(Array(Math.ceil(width/ratio)));
    }
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
    , "setPixel": function (x, y, data) {
      var rgba = data.rgba;
      var ppng = this
        , png = ppng.png
        , idx = getPixelIdx(ppng, x, y)
        , ratio = ppng.ratio
        , n = 4;
      for (var offset=0; offset<ratio; ++offset) {
        var o1 = offset * n;
        for (var offset2=0; offset2<ratio; ++offset2) {
          var o2 = offset2*png.width*n;
          if (
            ratio*x+offset >= png.width // x fuckup
            || ratio*y+offset2 >= png.height // y fuckup
          ) {continue;}
          // the pixel pattern map
          ppng.colorNames[y][x] = data;
          // the image to save
          png.data[idx+o1+0+o2] = rgba.r;
          png.data[idx+o1+1+o2] = rgba.g;
          png.data[idx+o1+2+o2] = rgba.b;
          png.data[idx+o1+3+o2] = rgba.a;
        }
      }
    }
    , "write": function (name, cb, html) {
      name || (name = "out.png");
      var ppng = this;
      // image file
      ppng.png.pack().pipe(fs.createWriteStream(name)).on("close", function () {
        console.log("-- wrote image file: %s", name);

        // pattern file
        var txtFile = name.replace(/\.png$/, "")
          , txt;
        if (html) {
          var rulesArr = [], usedRules = {};
          txtFile += ".html";
          txt = (function () {
            var html = [
              "<!DOCTYPE html>"
              , "<html>"
              , "<head>"
              , "<style>"
              , "table.pixelate {border-collapse: collapse; text-align: center; color: #000; text-shadow: 1px 1px 1px #fff; font-size: 10px; font-family: Courier, Serif;}"
              , "table.pixelate caption {font-size: 3em;}"
              , "table.pixelate:hover td {text-shadow: none; color: transparent;}"
              , "table.pixelate td {width: 12px; height: 12px;}"
              , "dl.pixelate * {padding: .3em; margin-bottom: .2em; text-align: right; float: left;}"
              , "dl.pixelate dt {color: #000; text-shadow: 1px 1px 1px #fff; width: 12em; clear: left;}"
              , "dl.pixelate dd {margin-left: 1em; min-width: 2em;}"
              , "dl.pixelate dt:last-of-type, dl.pixelate dt:last-of-type + dd {font-weight: bold;}"
              , (function (colors) {
                  var rules = {};
                  colors.forEach(function (row) {
                    row.forEach(function (color) {
                      if (color.name in usedRules) {usedRules[color.name].count += 1;}
                      else {
                        usedRules[color.name] = {
                          "count" : 1
                          , "name": color.name
                          , "symbol": color.symbol
                        };
                      }
                      var selector = ".pixelate ."+color.name;
                      if (selector in rules) {return;}
                      var code = "rgba("+color.rgba.r+", "+color.rgba.g+", "+color.rgba.b+", 255)";
                      rules[selector] = selector + " {box-shadow: inset 40px 40px "+code+"; background-color: "+code+";}";
                    });
                  });
                  return (function (rules) {
                      for (var p in rules) {
                        rulesArr.push(rules[p]);
                      }
                      return rulesArr;
                    })(rules);
              })(ppng.colorNames).join("\n")
              , "</style>"
              , "</head>"
              , "<body>"
            ].join("\n");
            html += "\n<table class=pixelate>";
            html += "<tbody>";
            html += ppng.colorNames.map(function (row) {
              var html = "<tr>";
              html += row.map(function (color, idx) {
                var value = color.toRGBA()
                  , colorMaker = "class="+color.name;
                if (color.name==="-original-") {
                  colorMaker = "style='background-color: "+value+"; box-shadow: 40px 40px "+value+" inset'";
                }
                var html = "<td "+colorMaker+">";
                html += color.symbol;
                html += "</td>";
                return html;
              }).join("");
              html += "</tr>";
              return html;
            }).join("\n");
            html += (function () {
              return [
                "<caption>"
                , "Pixelated<br/>"+name
                , "</caption>"
              ];
            })().join("\n");
            html += "</tbody></table>";
            html += "<dl class=pixelate>";
            var sum = 0
              , usedRulesKeys = Object.keys(usedRules);
            if (usedRulesKeys.length==1 && usedRulesKeys[0] == "-original-") {
              sum = ppng.colorNames[0].length * ppng.colorNames.length;
            }
            else {
              html += usedRulesKeys.sort(function (k1, k2) {
                return usedRules[k2].count - usedRules[k1].count;
              }).map(function (key) {
                var count = usedRules[key].count;
                sum += count;
                return "<dt class="+key+">"+key+" ("+usedRules[key].symbol+")</dt><dd>"+count+"</dd>";
              }).join("\n");
            }
            html += "<dt>Total</dt><dd>"+sum+" ("+ppng.colorNames[0].length + " x " + ppng.colorNames.length+")</dd>";
            html += "</dl>"
            html += [
              , "</body>"
              , "</html>"
            ].join("\n");
            return html;
          })();
        }
        else {
          txtFile += ".txt";
          txt = (function () {
            return ppng.colorNames.map(function (row) {
              return row.map(function (color) {
                return color.symbol;
              }).join("");
            }).join("\n");
          })();
        }
        fs.writeFile(txtFile, txt, function () {
          console.log("-- wrote pattern file: %s", txtFile);
          cb && cb(ppng);
        });
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
    rgba.r = Math.floor(rgba.r/len);
    rgba.g = Math.floor(rgba.g/len);
    rgba.b = Math.floor(rgba.b/len);
    rgba.a = Math.floor(rgba.a/len);
    return rgba;
  }

  return {
    "create": function (png, ratio) {
      ("number" == typeof ratio && ratio > 0) || (ratio = 1);
      return new PPng(png, ratio);
    }
    , "Color": Color
  };

})();

module.exports = PPng;
