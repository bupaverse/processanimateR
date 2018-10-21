function RendererGraphviz(el, data) {

  var svg = null;
  var svgPan = null;

  this.getSvg = function() {
    return svg;
  };

  this.render = function(postRender) {

    function fixEdgeIds(svg) {
      var edges = svg.querySelectorAll('.edge');
      for(var i = 0; i < edges.length; i++) {
      	var id = edges[i].id;
      	var paths = edges[i].getElementsByTagName("path");
      	for(var j = 0; j < paths.length; j++) {
      		paths[j].id = id + "-path";
      	}
      }
    }

    function wrapInPanZoomViewport(svg) {
      d3.select(svg)
        .insert("g")
        .attr("class", "svg-pan-zoom_viewport")
        .append(function() {        // Append to the wrapper the element...
        	return d3.select(svg).select(".graph").remove().node();
         });
    }

    function fixTranslate(svg) {

      function getTranslate(transform) {
        // More of a hack to get the translate applied by Graphviz
        // Assumes that there is only one translate!
        for (var i=0; i<transform.length; i++) {
          if (transform[i].type == 2) {
            return("translate("+transform[i].matrix.e+","+transform[i].matrix.f+")");
          }
        }
        return("translate(0,0)");
      }

      // This fixes performance issues caused by the no-op scale and rotate transform returned by viz.js
      // TODO profile whether this is really helping
      var graphNode = d3.select(svg).select(".graph");
      var transform = graphNode.node().transform.baseVal;
      graphNode.attr("transform", getTranslate(transform));
    }

    function fixBackground(svg) {
      d3.select(svg).select(".graph > polygon").remove();
    }

    var viz = new Viz();

    // Render DOT using Graphviz
    viz.renderSVGElement(data.rendered_process).then(function(element) {

        if (el.hasChildNodes()) {
          el.replaceChild(element, el.childNodes[0]);
        } else {
          el.appendChild(element);
        }

        svg = el.querySelector("svg");

        // Some DOM fixes for GraphViz
        wrapInPanZoomViewport(svg);
        fixEdgeIds(svg);
        fixTranslate(svg);
        fixBackground(svg);

        postRender(svg);

        svgPan = svgPanZoom(svg, { dblClickZoomEnabled: false });

      }
    );
  };

  this.resize = function(width, height) {

    // Adjust GraphViz diagram size
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    if (svgPan) {
      svgPan.resize();
      if (height > 0) {
        svgPan.fit();
      }
      svgPan.center();
    }

  };

}
