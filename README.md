pixelate
========

Wreck resolution and narrow color palette of pngs.

do

`node pixelate.js -f <your png> -r <pixel ratio> [-n]`

and a new png plus an HTML file will be created.


Using the -n (for "natural") flag, the image's original colors will be used in the result. Otherwise, you will be presented with the choice of color palettes (blue, gray). This is to be extended and/or pluggable.
