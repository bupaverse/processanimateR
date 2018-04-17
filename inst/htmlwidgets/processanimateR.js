HTMLWidgets.widget({

  name: "processanimateR",

  type: "output",

  factory: function(el, width, height) {

    return {
      renderValue: function(x) {

        el.innerHTML = Viz(x.diagram,format="svg");
        var svg = document.getElementsByTagName('svg')[0];

    		var edges = document.querySelectorAll('.edge');
    		for(var i = 0; i < edges.length; i++) {
    			var id = edges[i].id;
    			var paths = edges[i].getElementsByTagName("path");
    			for(var j = 0; j < paths.length; j++) {
    				paths[j].id = id + "-path";
    			}
    		}

        var graph = d3.select("#graph0");

        var tokens = HTMLWidgets.dataframeToD3(x.tokens);
        var sizes = HTMLWidgets.dataframeToD3(x.sizes);
        var colors = HTMLWidgets.dataframeToD3(x.colors);
        var images = HTMLWidgets.dataframeToD3(x.images);
        var hasImages = images.some(function (x) { return x !== null; });
        var shape = hasImages ? "image" : x.shape;
        var cases = Array.isArray(x.cases) ? x.cases: [x.cases];
        var startNode = document.querySelector("#a_node"+x.start_activity+" > a > ellipse");
        var endNode = document.querySelector("#a_node"+x.end_activity+" > a > ellipse");

        var circles;
        if (hasImages) {
          circles = graph.selectAll("image")
              		     .data(cases)
              		     .enter()
              		     .append("image")
                       .attr("display", "none")
                       .attr("xlink:href", function(d) {
                          return images.filter(function(image) {
                            return(image.case == d);
                          })[0].image;
                       })
                       .attr("transform", function(d) {
                          var size = sizes.filter(function(size) {
                            return(size.case == d);
                          })[0].size;
                          return "translate("+-size/2+","+-size/2+")";
                       })
                       .attr("preserveAspectRatio", "xMinYMin");
        } else {
          circles = graph.selectAll(shape)
              		     .data(cases)
              		     .enter()
              		     .append(shape)
              		     .attr("fill", "white")
              		     .attr("stroke", "black")
                       .attr("display", "none");
        }

        circles.each(function(d, i) {

            function safeNumber(x) {
              return (parseFloat(x) || 0).toFixed(6);
            }

            var circle = d3.select(this);
            var caseTokens = tokens.filter(function(token) {
              return(token.case == d);
            });

            var motions = circle.selectAll("animateMotion")
              .data(caseTokens)
              .enter();

            motions.append("animateMotion")
      					.attr("begin", function(d) { return safeNumber(d.token_start) + "s"; })
      					.attr("dur", function(d) { return safeNumber(d.token_duration) + "s"; })
      					.attr("fill", "freeze")
      					.attr("rotate", "auto")
                .append("mpath")
      				    .attr("xlink:href", function(d) { return "#edge" + d.edge_id + "-path"; });

      			motions.append("animateMotion")
      			    .attr("begin", function(d) { return safeNumber(d.token_start + d.token_duration) + "s"; })
      					.attr("dur", function(d, i) {
      					  if (d.to_id === x.end_activity) {
                    return "0.5s";
      					  } else  {
      					    return safeNumber(d.activity_duration) + "s";
      					  }
      					})
                .attr("fill", "freeze")
      					.attr("from", function(d) {
                    var edge = document.querySelector("#edge" + d.edge_id + "-path");
                    var point = edge.getPointAtLength(edge.getTotalLength()-0.1);
                    return point.x + "," + point.y;
      					})
      					.attr("to", function(d, i) {
      					    if (d.to_id === x.end_activity) {
                      return endNode.cx.animVal.value + "," + endNode.cy.animVal.value;
      					    } else {
      					      var edge = document.querySelector("#edge" + caseTokens[i+1].edge_id + "-path");
                      var point = edge.getPointAtLength(0.1);
                      return point.x + "," + point.y;
      					    }
      					});

            var setAnimations = circle.selectAll("set")
              .data(caseTokens)
              .enter();

            setAnimations.filter(function(d, i) {
              return i === 0;
            }).append("set")
                .attr("attributeName", "display")
                .attr("to", "inline")
                .attr("begin", function(d) { return safeNumber(d.token_start) + "s"; })
                .attr("dur", function(d) { return safeNumber(d.case_duration + 2.0) + "s"; });

            if (shape === "circle") {
              sizes.filter(function(size) {
                return(size.case == d);
              }).forEach(function(d){
                circle.append('set')
                  .attr("attributeName", "r")
                  .attr("to", d.size )
                  .attr("begin", safeNumber(d.time) + "s")
                  .attr("duration", "0")
                  .attr("fill", "freeze");
              });
            } else {
              sizes.filter(function(size) {
                return(size.case == d);
              }).forEach(function(d){
                circle.append('set')
                  .attr("attributeName", "height")
                  .attr("to", d.size )
                  .attr("begin", safeNumber(d.time) + "s")
                  .attr("duration", "0")
                  .attr("fill", "freeze");
              });

              sizes.filter(function(size) {
                return(size.case == d);
              }).forEach(function(d){
                circle.append('set')
                  .attr("attributeName", "width")
                  .attr("to", d.size )
                  .attr("begin", safeNumber(d.time) + "s")
                  .attr("duration", "0")
                  .attr("fill", "freeze");
              });
            }

            colors.filter(function(color) {
              return(color.case == d);
            }).forEach(function(d){
              circle.append('set')
                .attr("attributeName", "fill")
                .attr("to", d.color )
                .attr("duration", "0")
                .attr("begin", safeNumber(d.time) + "s" )
                .attr("fill", "freeze");
            });

            images.filter(function(image) {
              return(image.case == d);
            }).forEach(function(d,i){
              if (i > 0) {
                circle.append('set')
                  .attr("attributeName", "xlink:href")
                  .attr("to", d.image )
                  .attr("duration", "10s")
                  .attr("begin", safeNumber(d.time) + "s" )
                  .attr("fill", "freeze");
              }
            });

        });

        // Workaround for starting the SVG animation at time 0 in Chrome
        // is re re-add the whole structure to the DOM
        el.innerHTML = el.innerHTML;

        svg = document.getElementsByTagName('svg')[0];
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);

        var svgPan = svgPanZoom(svg);

        document.addEventListener('keypress', function(event) {
          if (event.code === "Space") {
            if (svg.animationsPaused()) {
              svg.unpauseAnimations();
            } else {
              svg.pauseAnimations();
            }
          }
        });

      },

      resize: function(width, height) {

        var svg = document.getElementsByTagName('svg')[0];
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        var svgPan = svgPanZoom(svg);
        svgPan.resize();
        svgPan.fit();
        svgPan.center();

      },

    };
  }
});
