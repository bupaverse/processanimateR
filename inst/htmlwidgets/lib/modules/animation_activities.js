/*
processanimateR
Copyright (c) 2019 Felix Mannhardt
Licensed under MIT license
*/
function PAActivities(el, data, scales) {

  var colorScale = scales.actColorScale;
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

  this.insertActivityAnimation = function(svg) {

    var nodeElements = d3.select(svg)
      .selectAll(".node")
      .filter(function() {
        return this.id !== "node"+data.start_activity && this.id !== "node"+data.end_activity;
      });

    var colors = HTMLWidgets.dataframeToD3(data.act_colors);
    var opacities = HTMLWidgets.dataframeToD3(data.act_opacities);

    nodeElements.each(function(d, i) {

      var act_group_id = d3.select(this).attr('id');
      var act_path = d3.select(this).selectAll("path")

      var sameActivity = function (x) {
        var actIdx = data.activities.act.indexOf(x.act)
        var actNode = "node" + data.activities.id[actIdx];
        return(actNode == act_group_id);

      }

      var customAttrs = {
        colors: colors.filter(sameActivity),
        opacities: opacities.filter(sameActivity)
      };


      if (!isNullValue(customAttrs.colors)) {
        if (isSingle(customAttrs.colors)) {
            // Improve the rendering performance by avoiding animations if not necessary
            act_path.attr("fill", colorScale(customAttrs.colors[0].value));
        } else {
          customAttrs.colors.forEach(function(d){
            act_path.append('set')
              .attr("attributeName", "fill")
              .attr("to", colorScale(d.value) )
              .attr("begin", safeNumber(d.time) + "s" )
              .attr("fill", "freeze");
          });
        }
        d3.select(svg)
          .selectAll(".node text")
          .style("mix-blend-mode", "difference")
          .style("fill", "white");
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
