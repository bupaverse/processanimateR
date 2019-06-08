/*
processanimateR 1.0.1
Copyright (c) 2018 Felix Mannhardt
Licensed under MIT license
*/
HTMLWidgets.widget({

  name: "processanimateR",
  type: "output",

  factory: function(el, width, height) {

    var control = new PAPlaybackControl(el);
    var scales = new PAScales(el);
    var tokens = null;
    var renderer = null;

    return {

      renderValue: function(data) {

        if ('Shiny' in window) {
          Shiny.onInputChange(el.id + "_tokens", []);
          Shiny.onInputChange(el.id + "_activities", []);
        }

        scales.update(data);

        tokens = new PATokens(el, data, scales);

        // Render process map
        if (data.processmap_renderer === "map") {
          renderer = new PARendererLeaflet(el, data);
        } else { // use GraphViz
          renderer = new PARendererGraphviz(el, data);
        }

        renderer.render(function(svg) {

          var tokenGroup = d3.select();
          if (data.tokens.case !== undefined) {
            // Generate tokens and animations
            tokenGroup = tokens.insertTokens(svg);
          }
          tokens.attachEventListeners(svg, tokenGroup);

          control.renderPlaybackControl(data, svg, width, true);
          scales.renderLegend(data, svg, width, height);
          renderer.resize(width, Math.max(0, height - control.getHeight()));
        });

      },

      resize: function(width, height) {

        if (renderer) {
          control.renderPlaybackControl(renderer.getData(), renderer.getSvg(), width, false);
          scales.resizeLegend(renderer.getSvg(), width, height);
          renderer.resize(width, Math.max(0, height - control.getHeight()));
        }

      },

      getPlaybackControl: function() {
        return control;
      }

    };
  }
});
