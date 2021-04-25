/*
processanimateR
Copyright (c) 2019 Felix Mannhardt
Licensed under MIT license
*/
function PAScales(el) {

  var legendSvg = null;

  this.colorScale = null;
  this.actColorScale = null;
  this.actLinecolorScale = null;
  this.sizeScale = null;
  this.opacityScale = null;
  this.actOpacityScale = null;
  this.imageScale = null;

  this.update = function(data) {

    // Workaround for data type for dates
    if (data.colors_scale.scale === "time") {
      data.colors.value = data.colors.value.map(function(x) { return moment(x).toDate(); });
    }

    if (data.sizes_scale.scale === "time") {
      data.sizes.value = data.sizes.value.map(function(x) { return moment(x).toDate(); });
    }

    if (data.opacities_scale.scale === "time") {
      data.opacities.value = data.opacities.value.map(function(x) { return moment(x).toDate(); });
    }

    if (data.images_scale.scale === "time") {
      data.images.value = data.images.value.map(function(x) { return moment(x).toDate(); });
    }


    this.colorScale = buildScale(data.colors_scale,
                                 data.colors,
                                 "#FFFFFF");

    this.sizeScale = buildScale(data.sizes_scale,
                                data.sizes,
                                6);

    this.opacityScale = buildScale(data.opacities_scale,
                                data.opacities,
                                0.9);

    this.imageScale = buildScale(data.images_scale,
                                data.images,
                                "");

    if (data.act_colors_scale.scale === "time") {
      data.act_colors.value = data.act_colors.value.map(function(x) { return moment(x).toDate(); });
    }

    if (data.act_linecolors_scale.scale === "time") {
      data.act_linecolors.value = data.act_linecolors.value.map(function(x) { return moment(x).toDate(); });
    }

    if (data.act_opacities_scale.scale === "time") {
      data.act_opacities.value = data.act_opacities.value.map(function(x) { return moment(x).toDate(); });
    }

    this.actColorScale = buildScale(data.act_colors_scale,
                                 data.act_colors,
                                 "#FFFFFF");

    this.actLinecolorScale = buildScale(data.act_linecolors_scale,
                                 data.act_linecolors,
                                 "#FFFFFF");

    this.actOpacityScale = buildScale(data.act_opacities_scale,
                                    data.act_opacities,
                                    0.9);

  };

  this.renderLegend = function(data, svg, width, height) {

    // Clean-up anyway
    if (legendSvg) {
        legendSvg.selectAll("*").remove();
    }

    if (data.legend && data.tokens.case !== undefined &&
                       !(data.colors_scale === "time" ||
                         data.act_colors_scale === "time" ||
                         data.sizes_scale === "time")) {

      if (!legendSvg) {
        legendSvg = d3.select(el).append("svg");
      }

      legendSvg.append("defs")
        // text background box and arrow marker
        .html('<filter x="-0.125" y="-0.05" width="1.25" height="1.1" id="' + el.id + '-box"> \
                <feFlood flood-color="white" flood-opacity="0.8"/> \
                <feComposite in="SourceGraphic" /> \
              </filter>');

      var legendGroup = legendSvg.append("g")
        .attr("class", "processanimater-legend")
        .attr("style", "outline: thin solid black;")
        .attr("filter", "url(#" + el.id + "-box)")
        .attr("transform", "translate(20,20)");

      switch(data.legend) {
        case "color":
          legendGroup.call(d3.legendColor().scale(this.colorScale).shape("circle").shapeRadius(6));
        break;
        case "act_color":
          legendGroup.call(d3.legendColor().scale(this.actColorScale).shape("circle").shapeRadius(6));
        break;
        case "size":
          legendGroup.call(d3.legendSize().scale(this.sizeScale).shape("circle"));
        break;
        default:
      }

      legendSvg.attr("width", legendGroup.node().getBBox().width + 30);
      legendSvg.attr("height", legendGroup.node().getBBox().height + 60);
    }

    this.resizeLegend(svg, width, height);

  };

  this.resizeLegend = function(svg, width, height) {
    if (legendSvg && width > 0 && height > 0) {
      legendSvg.attr("style", "position: relative; " +
                              "bottom: "+height+"px; " +
                              "left: "+(width - legendSvg.attr("width")) +"px; "+
                              "z-index: 999;");
      el.insertBefore(legendSvg.node(), null); // keep as last child!
    }
  };

  function buildScale(scale, values, defaultValue) {

    function computeDomain(values) {
      return values.sort().filter(function(x, i, a) {
                            return i == a.length - 1 || a[i+1] != x;
                          });
    }

    values = HTMLWidgets.dataframeToD3(values).map(function(x){
      return(x.value);
    });

    var valDomain = computeDomain(values);
    var domain = scale.domain;
    var range = scale.range;
    var type = scale.scale;

    // Guard against missing values
    if (domain === null) {
      if (type === "ordinal" | type === "identity") {
        domain = valDomain;
      } else if (type === "time") {
        domain = [new Date(Math.min.apply(null, valDomain)), new Date(Math.max.apply(null, valDomain))];
      } else {
        domain = [Math.min.apply(null, valDomain), Math.max.apply(null, valDomain)];
      }
    }
    // Default color is white
    if (range === null) {
      range = [defaultValue];
    }

    switch(type) {
      case "linear":
        scale = d3.scaleLinear();
      break;
      case "quantize":
        scale = d3.scaleQuantize();
      break;
      case "sqrt":
        scale = d3.scaleSqrt();
      break;
      case "log":
        scale = d3.scaleLog();
      break;
      case "ordinal":
        scale = d3.scaleOrdinal();
      break;
      case "time":
        scale = d3.scaleTime();
      break;
      default: // also 'identity'
        scale = d3.scaleOrdinal();
        range = domain;
      break;
    }

    scale.domain(domain)
         .range(range);

    return(scale);
  }

}
