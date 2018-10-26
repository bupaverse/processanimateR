/*
processanimateR 0.3.0
Copyright (c) 2018 Felix Mannhardt
Licensed under MIT license
*/
HTMLWidgets.widget({

  name: "processanimateR",
  type: "output",

  factory: function(el, width, height) {

    var slider = new Slider(el);
    var scales = new Scales(el);
    var tokens = null;
    var renderer = null;

    var repeatLoop = null;
    var repeatCount = 1;

    function repeatAnimation(data, svg) {
      if (data.repeat_count === null) {
        data.repeat_count = Infinity;
      }
      if (repeatLoop) {
        window.cancelAnimationFrame(repeatLoop);
      }
      (function(){
        var time = svg.getCurrentTime();
        if (time > (data.duration + data.repeat_delay) && repeatCount < data.repeat_count) {
          svg.setCurrentTime(0);
          repeatCount++;
        }
        if (repeatCount < data.repeat_count) {
          repeatLoop = window.requestAnimationFrame(arguments.callee);
        }
      })();
    }

    return {

      renderValue: function(data) {

        if ('Shiny' in window) {
          Shiny.onInputChange(el.id + "_tokens", []);
          Shiny.onInputChange(el.id + "_activities", []);
        }

        scales.update(data);

        tokens = new Tokens(el, data, scales);

        // Render process map
        if (data.processmap_renderer === "map") {
          renderer = new RendererLeaflet(el, data);
        } else { // use GraphViz
          renderer = new RendererGraphviz(el, data);
        }

        renderer.render(function(svg) {

          // Generate tokens and animations
          var tokenGroup = tokens.insertTokens(svg);
          tokens.attachEventListeners(svg, tokenGroup);

          slider.renderSlider(data, svg, width);
          scales.renderLegend(data, svg, width, height);

          repeatAnimation(data, svg);

          renderer.resize(width, Math.max(0, height - slider.getHeight()));
        });

      },

      resize: function(width, height) {

        if (renderer) {
          slider.renderSlider(renderer.getData(), renderer.getSvg(), width);
          scales.resizeLegend(renderer.getSvg(), width, height);
          renderer.resize(width, Math.max(0, height - slider.getHeight()));
        }

      }

    };
  }
});
