/*
processanimateR 1.0.3
Copyright (c) 2019 Felix Mannhardt
Licensed under MIT license
*/
function PAPlaybackControl(el) {

  var smargin = {top:5, right:20, bottom:0, left:50};
  var sheight = 75 - smargin.top - smargin.bottom;

  var slider = null,
      sliderSvg = null,
      sliderListener = null,
      sliderLoop = null;

  this.getHeight = function() {
    if (slider) {
      return sheight + smargin.top + smargin.bottom;
    } else {
      return 0;
    }
  };

  this.unpauseAnimation = function() {};
  this.pauseAnimation = function() {};
  this.getCurrentTime = function() {};

  this.renderPlaybackControl = function(data, svg, width, initial) {

    function cleanup() {
      if (sliderSvg) {
        sliderSvg.remove();
      }
      if (sliderListener) {
        document.removeEventListener(sliderListener);
      }
      if (sliderLoop) {
        window.cancelAnimationFrame(sliderLoop);
      }
    }

    if (typeof SVGSVGElement.prototype.animationsPaused !== "function") {
      // Polyfill fakesmile does not support pausing/unpausing for IE
      return;
    }

    if (!data.timeline) {

      cleanup();

    } else {

      // Clean-up
      cleanup();

      // re-calculate dimensions
      var swidth = width - smargin.left - smargin.right;

      if (data.mode === "relative") {
        animMin = data.timeline_start;
        animMax = data.timeline_end;
      } else {
        animMin = new Date(data.timeline_start);
        animMax = new Date(data.timeline_end);
      }

      slider = d3.sliderHorizontal()
        .min(animMin)
        .max(animMax)
        .ticks(10)
        .width(swidth)
        .displayValue(true)
        .on('onchange', function(val) {
          svg.setCurrentTime((val - data.timeline_start) / data.factor);
        });

      if (data.mode === "relative") {
        slider.tickFormat(function(val){
          return moment.duration(val, 'milliseconds').humanize();
        });
        slider.displayFormat(function(val){
          return moment.duration(val, 'milliseconds').humanize();
        });
      } else {
        slider.displayFormat(d3.timeFormat("%x %X"));
      }

      sliderSvg = d3.select(el).append("svg")
        .attr("class", "processanimater-control")
        .attr("width", swidth + smargin.left + smargin.right)
        .attr("height", sheight + smargin.top + smargin.bottom);

      sliderSvg.append("g")
        .attr("transform", "translate("+smargin.left+",30)")
        .call(slider);

      var buttonsSvg = sliderSvg.append("g")
        .attr("transform", "translate(0,15)");

      // Inspired by https://gist.github.com/guilhermesimoes/fbe967d45ceeb350b765
      var play = "M11,10 L18,13.74 18,22.28 11,26 M18,13.74 L26,18 26,18 18,22.28",
          pause = "M11,10 L17,10 17,26 11,26 M20,10 L26,10 26,26 20,26";

      var controlButton = buttonsSvg
        .append("g").attr("style", "pointer-events: bounding-box")
        .append("path")
        .attr("d", pause);

      var _unpauseAnimation = function() {
        svg.unpauseAnimations();
        controlButton
          .transition()
          .duration(500)
          .attr("d", pause);
        animateSlider(svg, data);
      };

      var _pauseAnimation = function() {
        svg.pauseAnimations();
        controlButton
          .transition()
          .duration(500)
          .attr("d", play);
        if (sliderLoop) {
          window.cancelAnimationFrame(sliderLoop);
        }
      };

      controlButton.on("click", function() {
        if (svg.animationsPaused()) {
          _unpauseAnimation();
        } else {
          _pauseAnimation();
        }
      });

      sliderListener = document.addEventListener('keypress', function(event) {

        function getNumberFromKeyEvent(event) {
          if (event.keyCode >= 96 && event.keyCode <= 105) {
              return event.keyCode - 96;
          } else if (event.keyCode >= 48 && event.keyCode <= 57) {
              return event.keyCode - 48;
          }
          return null;
        }

        if (svg.offsetParent !== null) {
          if (event.keyCode === 32) {
            if (svg.animationsPaused()) {
              _unpauseAnimation();
            } else {
              _pauseAnimation();
            }
          } else {
            var num = getNumberFromKeyEvent(event);
            if (num !== null) {
              svg.setCurrentTime((data.duration / 10) * num);
            }
          }
        }
      });

      if (data.mode != "off") {
        animateSlider(svg, data);

        if (initial) {
          repeatAnimation(svg, data, 'Shiny' in window);
          // Configure initial playback state
          if (data.initial_state === "paused") {
            _pauseAnimation();
          }
          svg.setCurrentTime(Math.max(0,Math.min(data.duration, data.initial_time)));
        }
      }

      // Wire-up the public API
      this.getCurrentTime = function() {
        return svg.getCurrentTime();
      };
      this.unpauseAnimation = _unpauseAnimation;
      this.pauseAnimation = _unpauseAnimation;
    }

  };

  var repeatLoop = null;
  var repeatCount = 1;

  function repeatAnimation(svg, data, isShiny) {
    if (data.repeat_count === null) {
      data.repeat_count = Infinity;
    }
    if (repeatLoop) {
       clearInterval(repeatLoop);
    }
    repeatLoop = setInterval(function () {
      var time = svg.getCurrentTime();
      if (time > (data.duration + data.repeat_delay) && repeatCount < data.repeat_count) {
        svg.setCurrentTime(0);
        repeatCount++;
      }
      if (isShiny) {
        if (time > data.duration) {
          time = data.duration;
        }
        if (data.mode === "relative") {
          Shiny.onInputChange(el.id + "_time", data.timeline_start + time * data.factor);
        } else {
          Shiny.onInputChange(el.id + "_time", new Date(data.timeline_start + (time * data.factor)));
        }
      }
    }, 1000);
  }

  function animateSlider(svg, data) {
    var lastTime = 0;
    var throttleDelta = 1000 / 18;
    (function(timestamp){
        if (timestamp - lastTime > throttleDelta) {
          var time = svg.getCurrentTime();
          if (time > 0 && time <= data.duration && !svg.animationsPaused()) {
            var realTime = data.timeline_start + time * data.factor;
            if (data.mode === "absolute") {
              realTime = new Date(realTime);
            }
            slider.silentValue(realTime);
          }
          lastTime = timestamp;
        }
        sliderLoop = window.requestAnimationFrame(arguments.callee);
    })();
  }

}
