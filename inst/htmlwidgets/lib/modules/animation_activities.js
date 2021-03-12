/*
processanimateR
Copyright (c) 2019 Felix Mannhardt
Licensed under MIT license
*/
function PAActivities(el, data, scales) {

  var colorScale = scales.actColorScale;
  var linecolorScale = scales.actLinecolorScale;
  var opacityScale = scales.actOpacityScale;

  function safeNumber(x) {
    return (parseFloat(x) || 0).toFixed(6);
  }

  function generateActivityId(id) {
    return el.id+"-edge" + id + "-path";
  }

  function isSingle(attr) {
    return attr.length === 1;
  }

  function isNullValue(attr) {
    return attr.length === 1 && attr[0].value === null;
  }

  function standardize_color(str){
    var ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = str;
    return ctx.fillStyle;
  }

  // Credits to: https://stackoverflow.com/a/5624139
  function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  // Credits to: https://stackoverflow.com/a/51034288
  function calcTextFill(color) {
    var  rgb = hexToRgb(standardize_color(color));
    var lrgb = [];
    rgb.forEach(function(c) {
        c = c / 255.0;
        if (c <= 0.03928) {
            c = c / 12.92;
        } else {
            c = Math.pow((c + 0.055) / 1.055, 2.4);
        }
        lrgb.push(c);
    });
    var lum = 0.2126 * lrgb[0] + 0.7152 * lrgb[1] + 0.0722 * lrgb[2];
    return (lum > 0.179) ? '#000000' : '#ffffff';
  }

  this.insertActivityAnimation = function(svg) {

    var nodeElements = d3.select(svg)
      .selectAll(".node")
      .filter(function() {
        return this.id !== "node"+data.start_activity && this.id !== "node"+data.end_activity;
      });

    var colors = HTMLWidgets.dataframeToD3(data.act_colors);
    var linecolors = HTMLWidgets.dataframeToD3(data.act_linecolors);
    var opacities = HTMLWidgets.dataframeToD3(data.act_opacities);

    nodeElements.each(function(d, i) {

      var act_group_id = d3.select(this).attr('id');
      var act_path = d3.select(this).selectAll("path")
      var text_node = d3.select(this).selectAll("text")

      var sameActivity = function (x) {
        var actIdx = data.activities.act.indexOf(x.act)
        var actNode = "node" + data.activities.id[actIdx];
        return(actNode == act_group_id);

      }

      var customAttrs = {
        colors: colors.filter(sameActivity),
        linecolors: linecolors.filter(sameActivity),
        opacities: opacities.filter(sameActivity)
      };

      if (!isNullValue(customAttrs.colors)) {
        if (isSingle(customAttrs.colors)) {
            // Improve the rendering performance by avoiding animations if not necessary
            act_path.attr("fill", colorScale(customAttrs.colors[0].value));
            text_node.attr("fill", calcTextFill(colorScale(customAttrs.colors[0].value)));
        } else {
          customAttrs.colors.forEach(function(d){
            act_path.append('set')
              .attr("attributeName", "fill")
              .attr("to", colorScale(d.value) )
              .attr("begin", safeNumber(d.time) + "s" )
              .attr("fill", "freeze");
            text_node.append('set')
              .attr("attributeName", "fill")
              .attr("to", calcTextFill(colorScale(d.value)))
              .attr("begin", safeNumber(d.time) + "s" )
              .attr("fill", "freeze");
          });
        }
      }

      if (isSingle(customAttrs.linecolors)) {
        if (!isNullValue(customAttrs.linecolors)) {
          act_path.attr("stroke", linecolorScale(customAttrs.linecolors[0].value));
        }
      } else {
        customAttrs.linecolors.forEach(function(d){
          act_path.append('set')
            .attr("attributeName", "stroke")
            .attr("to", linecolorScale(d.value) )
            .attr("begin", safeNumber(d.time) + "s" )
            .attr("fill", "freeze");
        });
      }

      if (isSingle(customAttrs.opacities)) {
        if (!isNullValue(customAttrs.opacities)) {
          act_path.attr("fill-opacity", opacityScale(customAttrs.opacities[0].value));
        }
      } else {
        customAttrs.opacities.forEach(function(d){
          act_path.append('set')
            .attr("attributeName", "fill-opacity")
            .attr("to", opacityScale(d.value) )
            .attr("begin", safeNumber(d.time) + "s" )
            .attr("fill", "freeze");
        });
      }

      // User defined attributes
      if (data.act_attributes) {
        act_path.attrs(data.act_attributes);
      }

    });


  };

}
