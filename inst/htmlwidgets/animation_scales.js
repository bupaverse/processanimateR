function Scales(el, data) {

  var legendSvg = null;
  var colorScale = null;
  var sizeScale = null;

  this.colorScale = buildScale(data.colors_scale,
                            HTMLWidgets.dataframeToD3(data.colors)
                              .map(function(x){ return(x.color); }),
                            data.colors_scale_domain,
                            data.colors_scale_range,
                            "#FFFFFF");

  this.sizeScale = buildScale(data.sizes_scale,
                              HTMLWidgets.dataframeToD3(data.sizes)
                                .map(function(x){ return(x.size); }),
                              data.sizes_scale_domain,
                              data.sizes_scale_range,
                              6);

  this.renderLegend = function(svg, width) {

    // Clean-up
    if (legendSvg) {
      legendSvg.remove();
    }

    if (data.legend && !(data.colors_scale === "time" || data.sizes_scale === "time")) {

      legendSvg = d3.select(svg).append("g")
        .attr("class", "processanimater-legend")
        .attr("style", "outline: thin solid black; outline-offset: 5px;");

      switch(data.legend) {
        case "color":
          legendSvg.call(d3.legendColor().scale(colorScale).shape("circle").shapeRadius(6));
        break;
        case "size":
          legendSvg.call(d3.legendSize().scale(sizeScale).shape("circle"));
        break;
        default:
      }

      legendSvg.attr("transform", "translate("+(width-legendSvg.node().getBBox().width)+","+10+")");
    }
  };

  function buildScale(type, values, domain, range, defaultValue) {

    function computeDomain(values) {
      return values.sort().filter(function(x, i, a) {
                            return i == a.length - 1 || a[i+1] != x;
                          });
    }

    var valDomain = computeDomain(values);

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
