pixelate
========

Wreck resolution and narrow color palette of pngs.

do

`node pixelate.js -f <your png> -r <pixel ratio> [-n] [-h]`

and a new png plus textfile - or, with the -h (for "HTML") option, an HTML file - will be created


Using the -n (for "natural") flag, the original colors will be used in the result. Otherwise, you will be presented with the choice of color palettes (blue, gray). This is to be extended and/or pluggable.

