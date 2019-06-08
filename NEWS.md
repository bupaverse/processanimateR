## processanimateR 1.0.1

* Integration with `heuristicsmineR` for `animation_mode="off"`
* Added vignette contributed by @DomRowney
* Fix several minor issues with knitR and JS selection code
* Fixed issue #16
* Update embedded leaflet to v1.5.1
* Security fix for embedded JS library braces used by leaflet

## processanimateR 1.0.0

There are breaking changes in the API between v0.3.0 and v1.0.0. The old API was not maintainable and to avoid the list of parameters growing even more, the decision to move to a new API was made.

### Backwards incompatible changes

* Completely changed API to reduce the number of parameters. Factored out functions to deal with specific aspects of the visual representation of tokens to functions `token_aes` and `token_scale`.
* Dropped the `scales` based colors in favour of D3 scales and legends.

### New features

* Added leaflet-based `renderer` that draws the process map on a geographical map.
* Added `initial_` parameters to control the initial playback state.
* Added `repeat_` parameters to control how the animation is repeated.
* Many other small improvements and tweaks.

## processanimateR 0.3.0

* Added legend using d3-legend
* Added Shiny selection event handlers
* Added animation_mode `off` to support use cases without animation but selection features.
* Changed to use d3-scales to support auto generation of legends. The use of the ggplot scales is deprecated and will be removed.
* Bugfix: Play/Pause button did not work with multiple widgets on one page
* Bugfix: 0 duration animation caused issues on Firefox and Safari

## processanimateR 0.2.0

* Timeline slider
* Jitter option
* Opacity option
* Shape option
* Pass-through options to processmapR
* Re-use processmapR calculations (thanks for @gertjanssenswillen)
