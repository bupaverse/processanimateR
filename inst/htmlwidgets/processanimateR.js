/*
processanimateR 1.0.1.9000
Copyright (c) 2018 Felix Mannhardt
Licensed under MIT license
*/
HTMLWidgets.widget({

  name: "processanimateR",
  type: "output",

  factory: function(el, width, height) {

    var control = new PlaybackControl(el);
    var scales = new Scales(el);
    var tokens = null;
    var renderer = null;

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
