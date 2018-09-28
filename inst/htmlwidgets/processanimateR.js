HTMLWidgets.widget({

  name: "processanimateR",

  type: "output",

  factory: function(el, width, height) {

    var svg = null;
    var svgPan = null;
    var data = null;

    var smargin = {top:5, right:20, bottom:0, left:50};
    var sheight = 75 - smargin.top - smargin.bottom;
    var slider = null;
    var sliderSvg = null;
    var sliderListener = null;
    var sliderLoop = null;

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
          .attr("class", "control")
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

        unpauseAnimation = function() {
          svg.unpauseAnimations();
          controlButton
            .transition()
            .duration(500)
            .attr("d", pause);
          animateSlider(svg, data, slider);
        };

        pauseAnimation = function() {
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

      var existingTransform = d3.select(svg).select("#graph0").attr("transform");

      var tokenGroup = d3.select(svg).select("#graph0")
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

      var shapes;
      if (data.shape === "image") {
        shapes = tokenGroup.selectAll(data.shape)
            		     .data(cases)
            		     .enter()
            		     .append(data.shape)
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
            		     .attr("stroke", "black");
      } else {
        shapes = tokenGroup.selectAll(data.shape)
            		     .data(cases)
            		     .enter()
            		     .append(data.shape)
            		     .attr("stroke", "black");
      }

      // add tooltip
      shapes.append("title").text(function(d) { return d; });

      if (data.options !== null) {
        shapes.attrs(data.options);
      }

      if (data.jitter > 0) {
        shapes.attr("transform", function(d) { return "translate(0," + (Math.random() - 0.5) * data.jitter + ")" });
      }

      var sizes = HTMLWidgets.dataframeToD3(data.sizes);
      var colors = HTMLWidgets.dataframeToD3(data.colors);
      var images = HTMLWidgets.dataframeToD3(data.images);
      var opacities = HTMLWidgets.dataframeToD3(data.opacities);

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
          shape.attr("r", customAttrs.sizes[0].size);
        } else {
          customAttrs.sizes.forEach(function(d){
            shape.append('set')
              .attr("attributeName", "r")
              .attr("to", d.size )
              .attr("begin", safeNumber(d.time) + "s")
              .attr("fill", "freeze");
          });
        }

      } else {
        if (isSingle(customAttrs.sizes)) {
          shape.attr("height", customAttrs.sizes[0].size);
          shape.attr("width", customAttrs.sizes[0].size);
        } else {
          customAttrs.sizes.forEach(function(d){
            shape.append('set')
              .attr("attributeName", "height")
              .attr("to", d.size )
              .attr("begin", safeNumber(d.time) + "s")
              .attr("fill", "freeze");
          });
          customAttrs.sizes.forEach(function(d){
            shape.append('set')
              .attr("attributeName", "width")
              .attr("to", d.size )
              .attr("begin", safeNumber(d.time) + "s")
              .attr("dur", "0")
              .attr("fill", "freeze");
          });
        }
      }

      if (isSingle(customAttrs.colors)) {
        shape.attr("fill", customAttrs.colors[0].color);
      } else {
        customAttrs.colors.forEach(function(d){
          shape.append('set')
            .attr("attributeName", "fill")
            .attr("to", d.color )
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

    return {

      renderValue: function(x) {

        // Remember data for re- building slider upon resize
        data = x;

        // Create detached container
        var container = document.createElement("div");

        // Render DOT using Graphviz
        container.innerHTML = data.diagram;
        svg = container.querySelector("svg");

        // Assign edge ids
        fixEdgeIds(svg);

        // Generate tokens and animations
        var tokenGroup = insertTokens(svg, data);

        // Attach event listeners after re-insertion

        tokenGroup.selectAll(data.shape)
          .on("click", function(d) {

            if (d3.select(this).attr("stroke") === "red") {
              d3.select(this).attr("stroke", "black");
            } else {
              d3.select(this).attr("stroke", "red");
            }

            if ('Shiny' in window) {

              if (!this.dataset.selected) {
                this.dataset.selected = "true";
              }

              var selectedTokens = tokenGroup.selectAll(data.shape)
                .filter(function(d) {
                  if ("selected" in this.dataset) {
                    return(this.dataset.selected === "true");
                  } else {
                    return false;
                  }
                })

              Shiny.onInputChange(el.id + "_tokens", selectedTokens.data());
            }


            if (data.onclick_token_callback) {
              data.onclick_token_callback(svg, d3.select(this), d);
            }
          });

        d3.select(svg)
          .selectAll(".node")
          .on("click", function() {

            var path = d3.select(this).select("path");
            if (path.attr("stroke") === "red") {
              path.attr("stroke", "#c0c0c0");
            } else {
              path.attr("stroke", "red");
            }

            if ('Shiny' in window) {

              if (!this.dataset.selected) {
                this.dataset.selected = "true";
              }

              var selectedActivities = d3.select(svg).selectAll(".node")
                .filter(function(d) {
                  if ("selected" in this.dataset) {
                    return(this.dataset.selected === "true");
                  } else {
                    return false;
                  }
                })

              var selectedIds = selectedActivities.nodes().map(function(activity) { return activity.id });

              Shiny.onInputChange(el.id + "_activities", selectedIds);
            }

            if (data.onclick_activity_callback) {
              data.onclick_token_callback(svg, d3.select(this));
            }
          });

        // Workaround for starting the SVG animation at time 0 in Chrome
        // Whole SVG element is added at once
        if (el.hasChildNodes()) {
          el.replaceChild(container, el.childNodes[0]);
        } else {
          el.appendChild(container);
        }

        if (width > 0) {
          svg.setAttribute("width", width);
        }
        if (height > 0) {
          svg.setAttribute("height", height - sheight - smargin.top - smargin.bottom);
        }

        svgPan = svgPanZoom(svg, { dblClickZoomEnabled: false });

        renderSlider(data, width);

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
        }

        if (data) {
          // Adjust timeline control size
          renderSlider(data, width);
        }

      },

    };
  }
});
