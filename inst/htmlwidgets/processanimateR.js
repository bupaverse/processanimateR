/*
processanimateR 0.3.0
Copyright (c) 2018 Felix Mannhardt
Licensed under MIT license
*/
HTMLWidgets.widget({

  name: "processanimateR",
  type: "output",

  factory: function(el, width, height) {

    var slider = null;
    var scales = null;
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

        // Fix data type for dates
        if (data.colors_scale === "time") {
          data.colors.color = data.colors.color.map(function(x) { return moment(x).toDate(); });
        }

        if (data.sizes_scale === "time") {
          data.sizes.size = data.sizes.size.map(function(x) { return moment(x).toDate(); });
        }

        scales = new Scales(el, data);
        tokens = new Tokens(data, scales);

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

          slider = new Slider(el, data, svg);
          slider.renderSlider(width);

          scales.renderLegend(svg, width);
          repeatAnimation(data, svg);

          renderer.resize(width, Math.max(0, height - slider.getHeight()));

        });

      },

      resize: function(width, height) {

        if (renderer) {
          slider.renderSlider(width);
          scales.renderLegend(renderer.getSvg(), width);
          renderer.resize(width, Math.max(0, height - slider.getHeight()));
        }

      }

    };
  }
});
