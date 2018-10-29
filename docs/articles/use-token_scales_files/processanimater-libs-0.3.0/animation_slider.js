function Slider(el) {

  var smargin = {top:5, right:20, bottom:0, left:50};
  var sheight = 75 - smargin.top - smargin.bottom;

  var slider = null,
      sliderSvg = null,
      sliderListener = null,
      sliderLoop = null;

  this.getHeight = function() {
    if (slider) {
      return sheight - smargin.top - smargin.bottom;
    } else {
      return 0;
    }
  };

  this.renderSlider = function(data, svg, width) {

    if (data.timeline &&
        // Polyfill fakesmile does not support pausing/unpausing for IE
        typeof SVGSVGElement.prototype.animationsPaused === "function") {

      // Clean-up
      if (sliderSvg) {
        sliderSvg.remove();
      }
      if (sliderListener) {
        document.removeEventListener(sliderListener);
      }
      if (sliderLoop) {
        window.cancelAnimationFrame(sliderLoop);
      }

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

      var unpauseAnimation = function() {
        svg.unpauseAnimations();
        controlButton
          .transition()
          .duration(500)
          .attr("d", pause);
        animateSlider(svg, data);
      };

      var pauseAnimation = function() {
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
          unpauseAnimation();
        } else {
          pauseAnimation();
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
              unpauseAnimation();
            } else {
              pauseAnimation();
            }
          } else {
            var num = getNumberFromKeyEvent(event);
            if (num !== null) {
              svg.setCurrentTime((data.duration / 10) * num);
            }
          }
        }
      });

      animateSlider(svg, data);
    }
  };

  function animateSlider(svg, data) {
    if (data.mode === "relative") {
      (function(){
          var time = svg.getCurrentTime();
          if (time > 0 && time <= data.duration) {
            slider.silentValue(data.timeline_start + time * data.factor);
          }
          sliderLoop = window.requestAnimationFrame(arguments.callee);
      })();
    } else {
      (function(){
          var time = svg.getCurrentTime();
          if (time > 0 && time <= data.duration) {
            slider.silentValue(new Date(data.timeline_start + (time * data.factor)));
          }
          sliderLoop = window.requestAnimationFrame(arguments.callee);
      })();
    }
  }

}
