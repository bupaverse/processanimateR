HTMLWidgets.widget({

  name: "processanimateR",

  type: "output",

  factory: function(el, width, height) {

    var smargin = {top:25, right:30, bottom:0, left:50},
      swidth = width - smargin.left - smargin.right,
      sheight = 75 - smargin.top - smargin.bottom;

    return {
      renderValue: function(x) {

        el.innerHTML = Viz(x.diagram,format="svg");
        var svg = el.querySelector("svg");

    		var edges = svg.querySelectorAll('.edge');
    		for(var i = 0; i < edges.length; i++) {
    			var id = edges[i].id;
    			var paths = edges[i].getElementsByTagName("path");
    			for(var j = 0; j < paths.length; j++) {
    				paths[j].id = id + "-path";
    			}
    		}

        var graph = d3.select(svg).select("#graph0");

        var tokens = HTMLWidgets.dataframeToD3(x.tokens);
        var sizes = HTMLWidgets.dataframeToD3(x.sizes);
        var colors = HTMLWidgets.dataframeToD3(x.colors);
        var images = HTMLWidgets.dataframeToD3(x.images);
        var hasImages = images.some(function (x) { return x !== null; });
        var shape = hasImages ? "image" : x.shape;
        var cases = Array.isArray(x.cases) ? x.cases: [x.cases];
        var startNode = svg.querySelector("#a_node"+x.start_activity+" > a > ellipse");
        var endNode = svg.querySelector("#a_node"+x.end_activity+" > a > ellipse");
        var duration = x.duration;

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
                    var edge = svg.querySelector("#edge" + d.edge_id + "-path");
                    var point = edge.getPointAtLength(edge.getTotalLength()-0.1);
                    return point.x + "," + point.y;
      					})
      					.attr("to", function(d, i) {
      					    if (d.to_id === x.end_activity) {
                      return endNode.cx.animVal.value + "," + endNode.cy.animVal.value;
      					    } else {
      					      var edge = svg.querySelector("#edge" + caseTokens[i+1].edge_id + "-path");
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
        // Whole SVG is re-add to the DOM after creation
        el.innerHTML = el.innerHTML;

        svg = el.querySelector("svg");
        if (width > 0) {
          svg.setAttribute("width", width);
        }
        if (height > 0) {
          svg.setAttribute("height", height - sheight - smargin.top - smargin.bottom);
        }

        var svgPan = svgPanZoom(svg);

        if (x.show_timeline &&
            // Polyfill fakesmile does not support pausing/unpausing for IE
            typeof SVGSVGElement.prototype.animationsPaused === "function") {

          if (x.mode === "relative") {
            animMin = x.timeline_start;
            animMax = x.timeline_end;
          } else {
            animMin = new Date(x.timeline_start);
            animMax = new Date(x.timeline_end);
          }

          var slider = d3.sliderHorizontal()
            .min(animMin)
            .max(animMax)
            .ticks(10)
            .width(swidth)
            .displayValue(true)
            .on('onchange', function(val) {
              svg.setCurrentTime((val - x.timeline_start) / x.factor);
            });

          //TODO formatter
          if (x.mode === "relative") {
            slider.tickFormat(function(val){
              return moment.duration(val, 'milliseconds').humanize();
            });
            slider.displayFormat(function(val){
              return moment.duration(val, 'milliseconds').humanize();
            });
          } else {
            slider.displayFormat(d3.timeFormat("%x %X"));
          }

          var controlSvg = d3.select(el).append("svg")
            .attr("width", swidth + smargin.left + smargin.right)
            .attr("height", sheight + smargin.top + smargin.bottom);

          controlSvg.append("g")
            .attr("transform", "translate("+smargin.left+",30)")
            .call(slider);

          var buttonsSvg = controlSvg.append("g")
            .attr("transform", "translate(0,15)");

          // Inspired by https://gist.github.com/guilhermesimoes/fbe967d45ceeb350b765
          var play = "M11,10 L18,13.74 18,22.28 11,26 M18,13.74 L26,18 26,18 18,22.28",
              pause = "M11,10 L17,10 17,26 11,26 M20,10 L26,10 26,26 20,26";

          var controlButton = buttonsSvg
            .append("g").attr("style", "pointer-events: bounding-box")
            .append("path")
            .attr("d", pause);

          controlButton.on("click", function() {
            if (svg.animationsPaused()) {
              unpauseAnimation();
            } else {
              pauseAnimation();
            }
          });

          unpauseAnimation = function() {
            svg.unpauseAnimations();
            controlButton
              .transition()
              .duration(500)
              .attr("d", pause);
          };

          pauseAnimation = function() {
            svg.pauseAnimations();
            controlButton
              .transition()
              .duration(500)
              .attr("d", play);
          };

          document.addEventListener('keypress', function(event) {

            function getNumberFromKeyEvent(event) {
              if (event.keyCode >= 96 && event.keyCode <= 105) {
                  return event.keyCode - 96;
              } else if (event.keyCode >= 48 && event.keyCode <= 57) {
                  return event.keyCode - 48;
              }
              return null;
            }

            if (svg.offsetParent !== null) {
              if (event.code === "Space") {
                if (svg.animationsPaused()) {
                  unpauseAnimation();
                } else {
                  pauseAnimation();
                }
              } else {
                var num = getNumberFromKeyEvent(event);
                if (num !== null) {
                  svg.setCurrentTime((duration / 10) * num);
                }
              }
            }
          });

          (function(){
              var time = svg.getCurrentTime();
              if (time > 0 && time <= duration) {
                if (!svg.animationsPaused()) {
                  if (x.mode === "relative") {
                    slider.silentValue(x.timeline_start + time * x.factor);
                  } else {
                    slider.silentValue(new Date(x.timeline_start + (time * x.factor)));
                  }
                }
              }
              setTimeout(arguments.callee, 60);
          })();

        }

      },

      resize: function(width, height) {

        var svg = el.querySelector("svg");
        svg.setAttribute("width", width);
        svg.setAttribute("height", height - sheight - smargin.top - smargin.bottom);
        var svgPan = svgPanZoom(svg);
        svgPan.resize();
        try {
          svgPan.fit();
        } catch (err) {
          // might cause an error if initial height was 0
        }
        svgPan.center();

      },

    };
  }
});
