/*
processanimateR 1.0.3
Copyright (c) 2019 Felix Mannhardt
Licensed under MIT license
*/
function PARendererLeaflet(el) {

  var svg = null;
  var data = null;

  this.getSvg = function() {
    return svg;
  };

  this.getData = function() {
    return data;
  };

  this.render = function(newData, postRender) {

    data = newData;

    var element = d3.select(el).append("div").attr("style", "width: 100%; height: 100%").node();

    if (el.hasChildNodes()) {
      el.replaceChild(element, el.childNodes[0]);
    } else {
      el.appendChild(element);
    }

    var mapData = data.rendered_process;
    var map = new L.Map(element, mapData.options ).addLayer(mapData.layer);

    // facilitate map building by hand
    map.on('click', function(e) {
      var latlng = map.mouseEventToLatLng(e.originalEvent);
      console.log(latlng.lat + ', ' + latlng.lng);
    });

    d3.select(map.getPanes().tilePane).classed("leaflet-grayscale", mapData.grayscale);

    var nodes = HTMLWidgets.dataframeToD3(mapData.nodes);

    var edges = HTMLWidgets.dataframeToD3(mapData.edges);
    edges.forEach(function(x) {
      // Side effect!!
      x.path = HTMLWidgets.dataframeToD3(x.path);
    });

    var d3Overlay = L.d3SvgOverlay(function(selection, projection) {

      var svg = selection.select(function() {
        return this.parentNode;
      }).attr("pointer-events", "visiblePainted")
        .node();

      selection.classed("graph", true);

      d3.select(svg)
        .selectAll("defs")
        .data(["header"])
        .enter()
        .append("defs")
        // text background box and arrow marker
        .html('<filter x="-0.125" y="-0.125" width="1.25" height="1.25" id="box"> \
                <feFlood flood-color="white" flood-opacity="0.7"/> \
                <feComposite in="SourceGraphic" /> \
              </filter> \
              <marker xmlns="http://www.w3.org/2000/svg" id="arrow" viewBox="0 0 10 10" \
                refX="10" refY="5" markerUnits="strokeWidth" \
                markerWidth="4" markerHeight="3" orient="auto"> \
              <path d="M 0 0 L 10 5 L 0 10 z"/> \
            </marker>');

      var actWrapper = selection
            .selectAll(".activities")
            .data(["acts"])
            .enter()
            .append("g")
              .attr("class", "activities")
            .selectAll("g")
            .data(nodes)
            .enter()
              // processmapR uses rectangles for activities
              .filter(function(d) { return d.shape === "rectangle"; })
            .append("g");

      var actIcon = actWrapper.append('g')
            .attr("class", "node")
            .attr("id", function(d) { return "node"+d.id; })
            .attr("fill", function(d) { return d.fillcolor; })
            .html(mapData.icon_act);

      actWrapper.attr("transform", function(d) {
                var point = projection.latLngToLayerPoint( L.latLng(d.lat, d.lng) );
                return "translate("+point.x+","+point.y+")";
              });

      //TODO split on more than two lines
      actWrapper.append("text")
            .text(function(d) { return d.label.split('\n')[0]; })
              .attr("x", 20)
              .attr("y", -20)
              .attr('fill', "black")
              .attr('filter', "url(#box)")
            .append('tspan')
              .text(function(d) { return d.label.split('\n')[1].trim() })
              .attr("x", 20)
              .attr("y", -8);

      var startEndWrapper = selection
              .selectAll(".startend")
              .data(["startend"])
              .enter()
              .append("g")
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
              .append("g")
              .attr("class", "node")
              .attr("id", function(d) { return "node"+d.id; })
              .html(function(d) {
                if (d.id === data.start_activity) {
                  return mapData.icon_start;
                } else {
                  return mapData.icon_end;
                }
              });

      var lineFunction = d3.line()
            .x(function(d) { return projection.latLngToLayerPoint( L.latLng(d.lat, d.lng) ).x; })
            .y(function(d) { return projection.latLngToLayerPoint( L.latLng(d.lat, d.lng) ).y; })
            .curve(d3.curveNatural);

      var edgeSel = selection
        .selectAll(".edge")
        .data(["edges"])
        .enter()
        .append("g")
          .attr("class", "edge")
        .selectAll('path')
          .data(edges);

      edgeSel.enter()
              .append('path')
              .attr("d", function(d) { return lineFunction(d.path); })
              .attr("fill", "none")
              .attr("stroke", function(d) { return d.color; })
              .attr("stroke-width", function(d) { return d.penwidth;  })
              .attr("id", function(d) { return el.id + "-edge" + d.id + "-path"; })
              .attr("marker-end", "url(#arrow)")
              // paint the edge a bit shorter than it actually is to have a smooth ending at the arrow tip
              .each(function(d) { d.totalLength = this.getTotalLength(); })
                .attr("stroke-dasharray", function(d) { return d.totalLength; })
                .attr("stroke-dashoffset", function(d) { return 5; });

      // Update process map and animations according to zoom level

      var scaleFactor = 1 / Math.max(mapData.scale_min, Math.min(mapData.scale_max, projection.scale));

      selection.selectAll(".node")
        .attr("transform", "scale(" + scaleFactor + ")");

      selection.selectAll("text")
        .attr("transform", "scale(" + scaleFactor + ")");

      //TODO look at the strok-dashoffset property
      selection.selectAll(".edge > path")
        .attr("stroke-width", function(d) { return d.penwidth * scaleFactor;  });

      selection.selectAll(".token")
        .attr("transform", "scale(" + scaleFactor + ")");

    }, { zoomDraw: true, zoomHide: true });

    d3Overlay.addTo(map);

    svg = el.querySelector("svg");

    postRender(svg);

  };

  this.resize = function(width, height) {
    el.querySelector(".leaflet-container").style.height = height + "px";
  };

}
