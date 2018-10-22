function RendererLeaflet(el, data) {

  var svg = null;

  this.getSvg = function() {
    return svg;
  };

  this.getData = function() {
    return data;
  };

  this.render = function(postRender) {

    var mapData = data.rendered_process;

    var mapEl = d3.select(el).append("div").attr("style", "width: 100%; height: 100%").node();

    var map = new L.Map(mapEl, mapData.options ).addLayer(mapData.layer);

    d3.select(map.getPanes().tilePane).classed("leaflet-grayscale", mapData.grayscale);

    var nodes = HTMLWidgets.dataframeToD3(mapData.nodes);
    var edges = HTMLWidgets.dataframeToD3(mapData.edges);

    var d3Overlay = L.d3SvgOverlay(function(selection, projection){

      var svg = selection.select(function() {
        return this.parentNode;
      }).attr("pointer-events", "visiblePainted").node();

      selection.classed("graph", true);

      d3.select(svg)
        .append("defs")
        .html('<filter x="-0.125" y="-0.125" width="1.25" height="1.25" id="box"> \
                <feFlood flood-color="white" flood-opacity="0.7"/> \
                <feComposite in="SourceGraphic" /> \
              </filter> \
              <marker xmlns="http://www.w3.org/2000/svg" id="arrow" viewBox="0 0 10 10" \
                refX="10" refY="5" markerUnits="strokeWidth" \
                markerWidth="4" markerHeight="3" orient="auto"> \
              <path d="M 0 0 L 10 5 L 0 10 z"/> \
            </marker>');

      var actWrapper = selection.append("g")
              .attr("class", "activities")
            .selectAll("g")
            .data(nodes).enter()
              // processmapR uses rectangles for activities
              .filter(function(d) { return d.shape === "rectangle"; })
            .append("g");

      var actIcon = actWrapper.append('g')
            .attr("class", "node")
            .attr("id", function(d) { return "node"+d.id; })
            .attr("fill", function(d) { return d.fillcolor; })
            .html(mapData.act_icon);

      actWrapper.attr("transform", function(d) {
                var point = projection.latLngToLayerPoint( L.latLng(d.lat, d.lng) );
                return "translate("+point.x+","+point.y+")";
              });

      actWrapper.append("text")
            .text(function(d) { return d.label; })
            .attr("x", 12)
            .attr('fill', "black")
            .attr('filter', "url(#box)");

      var startEndWrapper = selection.append("g")
              .attr("class", "startend")
            .selectAll('g')
            .data(nodes).enter()
              // processmapR uses rectangles for start/end
              .filter(function(d) { return d.shape === "circle"; })
            .append("g")
              .attr("transform", function(d) {
                  var point = projection.latLngToLayerPoint( L.latLng(d.lat, d.lng) );
                  return "translate("+ point.x +","+ point.y +")";
                })
            .attr("class", "node")
            .attr("id", function(d) { return "node"+d.id; })
            .html(function(d) {
              if (d.id === data.start_activity) {
                return mapData.start_icon;
              } else {
                return mapData.end_icon;
              }
            });

      var lineFunction = d3.line()
            .x(function(d) { return projection.latLngToLayerPoint( L.latLng(d[0], d[1]) ).x; })
            .y(function(d) { return projection.latLngToLayerPoint( L.latLng(d[0], d[1]) ).y; })
            .curve(d3.curveNatural);

      selection.append("g")
          .attr("class", "edges")
        .selectAll('path').data(edges).enter().append('path')
          .attr("d", function(d) { return lineFunction(d.path); })
          .attr("stroke", function(d) { return d.color; })
          .attr("stroke-width", function(d) { return d.penwidth;  })
          .attr("id", function(d) { return "edge" + d.id + "-path"; })
          .attr("marker-end", "url(#arrow)")
          .each(function(d) { d.totalLength = this.getTotalLength(); })
          .attr("stroke-dasharray", function(d) { return d.totalLength; })
          .attr("stroke-dashoffset", function(d) { return 5; });

    }, { zoomDraw: false });

    d3Overlay.addTo(map);

    svg = el.querySelector("svg");

    postRender(svg);

  };

  this.resize = function(width, height) {
    el.querySelector(".leaflet-container").style.height = height + "px";
  };

}
