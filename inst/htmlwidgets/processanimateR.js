/*
processanimateR 0.3.0
Copyright (c) 2018 Felix Mannhardt
Licensed under MIT license
*/
HTMLWidgets.widget({

  name: "processanimateR",
  type: "output",

  factory: function(el, width, height) {

    var viz = new Viz();

    var svg = null;
    var svgPan = null;
    var data = null;

    var smargin = {top:5, right:20, bottom:0, left:50};
    var sheight = 75 - smargin.top - smargin.bottom;

    var colorScale = null;
    var sizeScale = null;

    var slider = null;
    var sliderSvg = null;
    var sliderListener = null;
    var sliderLoop = null;

    var legendSvg = null;

    function computeDomain(values) {
      return values.sort().filter(function(x, i, a) {
                            return i == a.length - 1 || a[i+1] != x;
                          });
    }

    function buildScale(type, values, domain, range, defaultValue) {

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

    function renderLegend(data, width) {

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

        legendSvg.attr("transform", "translate("+(width-smargin.right-legendSvg.node().getBBox().width)+","+(smargin.top+10)+")");

      }

    }

    function renderSlider(data, width) {

      if (data.timeline &&
          // Polyfill fakesmile does not support pausing/unpausing for IE
          typeof SVGSVGElement.prototype.animationsPaused === "function") {

        // Clean-up
        if (sliderSvg) {
          sliderSvg.remove();
        }
        if (sliderListener) {
          document.removeEventListener(sliderListener);
        }
        if (sliderLoop) {
          window.cancelAnimationFrame(sliderLoop);
        }

        // re-calculate dimensions
        var swidth = width - smargin.left - smargin.right;

        if (data.mode === "relative") {
          animMin = data.timeline_start;
          animMax = data.timeline_end;
        } else {
          animMin = new Date(data.timeline_start);
          animMax = new Date(data.timeline_end);
        }

        slider = d3.sliderHorizontal()
          .min(animMin)
          .max(animMax)
          .ticks(10)
          .width(swidth)
          .displayValue(true)
          .on('onchange', function(val) {
            svg.setCurrentTime((val - data.timeline_start) / data.factor);
          });

        if (data.mode === "relative") {
          slider.tickFormat(function(val){
            return moment.duration(val, 'milliseconds').humanize();
          });
          slider.displayFormat(function(val){
            return moment.duration(val, 'milliseconds').humanize();
          });
        } else {
          slider.displayFormat(d3.timeFormat("%x %X"));
        }

        sliderSvg = d3.select(el).append("svg")
          .attr("class", "processanimater-control")
          .attr("width", swidth + smargin.left + smargin.right)
          .attr("height", sheight + smargin.top + smargin.bottom);

        sliderSvg.append("g")
          .attr("transform", "translate("+smargin.left+",30)")
          .call(slider);

        var buttonsSvg = sliderSvg.append("g")
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

        var unpauseAnimation = function() {
          svg.unpauseAnimations();
          controlButton
            .transition()
            .duration(500)
            .attr("d", pause);
          animateSlider(svg, data, slider);
        };

        var pauseAnimation = function() {
          svg.pauseAnimations();
          controlButton
            .transition()
            .duration(500)
            .attr("d", play);
          if (sliderLoop) {
            window.cancelAnimationFrame(sliderLoop);
          }
        };

        sliderListener = document.addEventListener('keypress', function(event) {

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
                svg.setCurrentTime((data.duration / 10) * num);
              }
            }
          }
        });

        animateSlider(svg, data, slider);

      }
    }

    function animateSlider(svg, data, slider) {

      if (data.mode === "relative") {
        (function(){
            var time = svg.getCurrentTime();
            if (time > 0 && time <= data.duration) {
              slider.silentValue(data.timeline_start + time * data.factor);
            }
            sliderLoop = window.requestAnimationFrame(arguments.callee);
        })();
      } else {
        (function(){
            var time = svg.getCurrentTime();
            if (time > 0 && time <= data.duration) {
              slider.silentValue(new Date(data.timeline_start + (time * data.factor)));
            }
            sliderLoop = window.requestAnimationFrame(arguments.callee);
        })();
      }

    }

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

    function safeNumber(x) {
      return (parseFloat(x) || 0).toFixed(6);
    }

    function insertTokens(svg, data) {

      var existingTransform = d3.select(svg).select(".graph").attr("transform");

      var tokenGroup = d3.select(svg).select(".graph")
        .select(function() { return this.parentNode; })
        .append("g")
        .attr("transform", existingTransform);

      var tokens = HTMLWidgets.dataframeToD3(data.tokens);
      var cases = tokens.reduce(function (a, e) {
                                   if (a.indexOf(e.case) === -1) {
                                     a.push(e.case);
                                   }
                                   return a;
                                }, []);
      var startNode = svg.querySelector("#a_node"+data.start_activity+" > a > ellipse");
      var endNode = svg.querySelector("#a_node"+data.end_activity+" > a > ellipse");

      var sizes = HTMLWidgets.dataframeToD3(data.sizes);
      var colors = HTMLWidgets.dataframeToD3(data.colors);
      var images = HTMLWidgets.dataframeToD3(data.images);
      var opacities = HTMLWidgets.dataframeToD3(data.opacities);

      var shapes;
      if (data.shape === "image") {
        shapes = tokenGroup.selectAll(data.shape)
            		     .data(cases)
            		     .enter()
            		     .append(data.shape)
            		     .attr("width", 0)
            		     .attr("height", 0)
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
      } else if (data.shape === "rect") {
        shapes = tokenGroup.selectAll(data.shape)
            		     .data(cases)
            		     .enter()
            		     .append(data.shape)
            		     .attr("transform", function(d) {
                        var size = sizes.filter(function(size) {
                          return(size.case == d);
                        })[0].size;
                        return "translate("+-size/2+","+-size/2+")";
                     })
            		     .attr("stroke", "black")
            		     .attr("fill", "white");
      } else {
        shapes = tokenGroup.selectAll(data.shape)
            		     .data(cases)
            		     .enter()
            		     .append(data.shape)
            		     .attr("stroke", "black")
            		     .attr("fill", "white");
      }

      // add tooltip
      shapes.append("title").text(function(d) { return d; });

      if (data.attributes !== null) {
        shapes.attrs(data.attributes);
      }

      if (data.jitter > 0) {
        shapes.attr("transform", function(d) { return "translate(0," + (Math.random() - 0.5) * data.jitter + ")" });
      }

      shapes.each(function(d, i) {

          var shape = d3.select(this);
          var caseTokens = tokens.filter(function(token) {
            return(token.case == d);
          });

          var customAttrs = {
            sizes: sizes.filter(function(x) { return(x.case == d); }),
            colors: colors.filter(function(x) { return(x.case == d); }),
            images: images.filter(function(x) { return(x.case == d); }),
            opacities: opacities.filter(function(x) { return(x.case == d); })
          };
          insertAnimation(svg, shape, caseTokens, startNode, endNode, customAttrs);

      });

      return tokenGroup;

    }

    function insertAnimation(svg, shape, caseTokens, startNode, endNode, customAttrs) {

      var motions = shape.selectAll("animateMotion").data(caseTokens).enter();

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
      	  if (i == caseTokens.length-1) { // last node should be endNode
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
      	    if (i == caseTokens.length-1) { // last node should be endNode
              return endNode.cx.animVal.value + "," + endNode.cy.animVal.value;
      	    } else {
      	      var edge = svg.querySelector("#edge" + caseTokens[i+1].edge_id + "-path");
              var point = edge.getPointAtLength(0.1);
              return point.x + "," + point.y;
      	    }
      	});

      var setAnimations = shape.selectAll("set").data(caseTokens).enter();

      // We improve the rendering performance in Chrome by avoiding to add 'set' animations if the value stays the same.
      function isSingle(attr) {
        return attr.length === 1 && attr[0].time === 0;
      }

      if (data.shape === "circle") {
        if (isSingle(customAttrs.sizes)) {
          shape.attr("r", sizeScale(customAttrs.sizes[0].size));
        } else {
          customAttrs.sizes.forEach(function(d){
            shape.append('set')
              .attr("attributeName", "r")
              .attr("to", sizeScale(d.size))
              .attr("begin", safeNumber(d.time) + "s")
              .attr("fill", "freeze");
          });
        }

      } else {
        if (isSingle(customAttrs.sizes)) {
          shape.attr("height", sizeScale(customAttrs.sizes[0].size));
          shape.attr("width", sizeScale(customAttrs.sizes[0].size));
        } else {
          customAttrs.sizes.forEach(function(d){
            shape.append('set')
              .attr("attributeName", "height")
              .attr("to", sizeScale(d.size))
              .attr("begin", safeNumber(d.time) + "s")
              .attr("fill", "freeze");
          });
          customAttrs.sizes.forEach(function(d){
            shape.append('set')
              .attr("attributeName", "width")
              .attr("to", sizeScale(d.size))
              .attr("begin", safeNumber(d.time) + "s")
              .attr("dur", "0")
              .attr("fill", "freeze");
          });
        }
      }

      if (isSingle(customAttrs.colors)) {
        shape.attr("fill", colorScale(customAttrs.colors[0].color));
      } else {
        customAttrs.colors.forEach(function(d){
          shape.append('set')
            .attr("attributeName", "fill")
            .attr("to", colorScale(d.color) )
            .attr("begin", safeNumber(d.time) + "s" )
            .attr("fill", "freeze");
        });
      }

      if (isSingle(customAttrs.images)) {
        shape.attr("xlink:href", customAttrs.images[0].image);
      } else {
        customAttrs.images.forEach(function(d,i){
          if (i > 0) {
            shape.append('set')
              .attr("attributeName", "xlink:href")
              .attr("to", d.image )
              .attr("begin", safeNumber(d.time) + "s" )
              .attr("fill", "freeze");
          }
        });
      }

      if (isSingle(customAttrs.opacities)) {
        shape.attr("fill-opacity", customAttrs.opacities[0].opacity);
      } else {
        customAttrs.opacities.forEach(function(d){
          shape.append('set')
            .attr("attributeName", "fill-opacity")
            .attr("to", d.opacity )
            .attr("begin", safeNumber(d.time) + "s" )
            .attr("fill", "freeze");
        });
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

    function attachEventListeners(svg, data, tokenGroup) {

      function toggleSelection(element) {
        if (!element.dataset.selected || element.dataset.selected === "false") {
          element.dataset.selected = "true";
        } else {
          element.dataset.selected = "false";
        }
      }

      function isSelected(element) {
        return "selected" in element.dataset && element.dataset.selected === "true";
      }

      tokenGroup.selectAll(data.shape)
        .on("click", function(d) {

          toggleSelection(this);

          tokenGroup.selectAll(data.shape)
              .attr("stroke-width", function() {
                if (isSelected(this)) {
                  return "2";
                } else {
                  return "1";
                }
              })
              .attr("stroke-dasharray", function() {
                if (isSelected(this)) {
                  return "2";
                } else {
                  return "0";
                }
              });

          if ('Shiny' in window) {

            var selectedTokens = tokenGroup.selectAll(data.shape)
              .filter(function(d) { return(isSelected(this)); });
            Shiny.onInputChange(el.id + "_tokens", selectedTokens.data());
          }

          if (data.onclick_token_callback) {
            data.onclick_token_callback(svg, d3.select(this), d);
          }

        });

      d3.select(svg)
        .selectAll(".node")
        .filter(function() {
          return this.id !== "node"+data.start_activity && this.id !== "node"+data.end_activity;
        })
        .on("click", function() {

          toggleSelection(this);

          d3.select(svg).selectAll(".node")
              .each(function() {
                var node = this;
                d3.select(node).select("path")
                  .attr("stroke-width", function() {
                    if (isSelected(node)) {
                      return "3";
                    } else {
                      return "1"; // #c0c0c0
                    }
                  })
                  .attr("stroke", function() {
                    if (isSelected(node)) {
                      return "black";
                    } else {
                      return "#c0c0c0";
                    }
                  });
              })

          if ('Shiny' in window) {

            var selectedActivities = d3.select(svg).selectAll(".node")
              .filter(function(d) { return(isSelected(this)); })
              .nodes().map(function(activity) {
                  // javascript is zero-based
                  var id = Number(activity.id.replace(/.*?(\d+)/,"$1"));
                  return {id: activity.id, activity: data.activities.act[id-1]};
                });

            Shiny.onInputChange(el.id + "_activities", JSON.stringify(selectedActivities));
          }

          if (data.onclick_activity_callback) {
            data.onclick_token_callback(svg, d3.select(this));
          }
        });

    }

    return {

      renderValue: function(x) {

        if ('Shiny' in window) {
          Shiny.onInputChange(el.id + "_tokens", []);
          Shiny.onInputChange(el.id + "_activities", []);
        }

        // Remember data for re- building slider upon resize
        data = x;

        // Fix data type for dates
        if (data.colors_scale === "time") {
          data.colors.color = data.colors.color.map(function(x) { return moment(x).toDate(); });
        }

        if (data.sizes_scale === "time") {
          data.sizes.size = data.sizes.size.map(function(x) { return moment(x).toDate(); });
        }

        // Create D3 scales
        colorScale = buildScale(data.colors_scale,
                                HTMLWidgets.dataframeToD3(data.colors).map(function(x){ return(x.color); }),
                                data.colors_scale_domain,
                                data.colors_scale_range,
                                "#FFFFFF");
        sizeScale = buildScale(data.sizes_scale,
                                HTMLWidgets.dataframeToD3(data.sizes).map(function(x){ return(x.size); }),
                                data.sizes_scale_domain,
                                data.sizes_scale_range,
                                6);

        // Render DOT using Graphviz
        viz.renderSVGElement(data.diagram).then(function(element) {

            // Create detached container
            var container = document.createElement("div");
            container.appendChild(element);
            svg = container.querySelector("svg");

            // Some DOM fixes
            wrapInPanZoomViewport(svg);
            fixEdgeIds(svg);
            fixTranslate(svg);

            // Generate tokens and animations
            var tokenGroup = insertTokens(svg, data);

            // Attach event listeners after re-insertion
            attachEventListeners(svg, data, tokenGroup)

            // Workaround for starting the SVG animation at time 0 in Chrome
            // Whole SVG element is added at once
            if (el.hasChildNodes()) {
              el.replaceChild(container, el.childNodes[0]);
            } else {
              el.appendChild(container);
            }

            // Correct sizing
            if (width > 0) {
              svg.setAttribute("width", width);
            }
            if (height > 0) {
              svg.setAttribute("height", height - sheight - smargin.top - smargin.bottom);
            }

            svgPan = svgPanZoom(svg, { dblClickZoomEnabled: false });

            renderSlider(data, width);
            renderLegend(data, width);
          }
        );

      },

      resize: function(width, height) {

        if (svg && svgPan) {
          // Adjust GraphViz diagram size
          svg.setAttribute("width", width);
          svg.setAttribute("height", height - sheight - smargin.top - smargin.bottom);
          svgPan.resize();
          if (height > 0) {
            svgPan.fit();
          }
          svgPan.center();

          if (data) {
            // Adjust timeline control size
            renderSlider(data, width);
            renderLegend(data, width);
          }

        }

      },

    };
  }
});
