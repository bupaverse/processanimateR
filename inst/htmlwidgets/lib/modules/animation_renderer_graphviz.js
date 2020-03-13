/*
processanimateR 1.0.3
Copyright (c) 2019 Felix Mannhardt
Licensed under MIT license
*/
function PARendererGraphviz(el) {

  var svg = null;
  var svgPan = null;
  var data = null;
  var viz = new PAViz();

  // source https://stackoverflow.com/questions/178325/how-do-i-check-if-an-element-is-hidden-in-jquery/11511035#11511035
  function isRendered(domObj) {
      if (domObj === null) {
        return false;
      }
      if ((domObj.nodeType != 1) || (domObj == document.body)) {
          return true;
      }
      if (domObj.currentStyle && domObj.currentStyle.display != "none" &&
            domObj.currentStyle.visibility != "hidden") {
          return isRendered(domObj.parentNode);
      } else if (window.getComputedStyle) {
          var cs = document.defaultView.getComputedStyle(domObj, null);
          if (cs.getPropertyValue("display") != "none" &&
                cs.getPropertyValue("visibility") != "hidden") {
              return isRendered(domObj.parentNode);
          }
      }
      return false;
  }

  this.getSvg = function() {
    return svg;
  };

  this.getData = function() {
    return data;
  };

  this.render = function(newData, postRender) {

    data = newData;

    function fixEdgeIds(svg) {
      var edges = svg.querySelectorAll('.edge');
      for(var i = 0; i < edges.length; i++) {
      	var id = edges[i].id;
      	var paths = edges[i].getElementsByTagName("path");
      	paths[0].id = el.id + "-" + id + "-path";
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

    function fixBackground(svg) {
      d3.select(svg).select(".graph > polygon").remove();
    }

    // Render DOT using Graphviz
    viz.renderSVGElement(data.rendered_process).then(function(element) {

        if (el.hasChildNodes()) {
          el.replaceChild(element, el.childNodes[0]);
        } else {
          el.appendChild(element);
        }

        svg = el.querySelector("svg");

        // Some DOM fixes for GraphViz
        wrapInPanZoomViewport(svg);
        fixEdgeIds(svg);
        fixTranslate(svg);
        fixBackground(svg);

        postRender(svg);

      }
    ).catch(function(error) {
      viz = new PAViz();
      var p = document.createElement("p");
      var t = document.createTextNode("Failed to render the graph. It is probably too large. Original error: "+ error.stack);
      p.appendChild(t);
      if (el.hasChildNodes()) {
        el.replaceChild(p, el.childNodes[0]);
      } else {
        el.appendChild(p);
      }
    });
  };

  this.resize = function(width, height) {

    var oldWidth = svg.getAttribute("width");
    var oldHeight = svg.getAttribute("height");

    if (height > 0 && width > 0) {
      // Adjust GraphViz diagram size
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
    }

    if (isRendered(el)) {
      if (svgPan) {

        svgPan.resize();

        if (data.svg_resize_fit) {
          svgPan.center();
          svgPan.fit();
        } else {
          svgPan.pan({x: (svgPan.getPan().x / oldWidth) * width,
                      y: (svgPan.getPan().y / oldHeight) * height});
        }

      } else {

        var eventsHandler = {
          haltEventListeners: ['touchstart', 'touchend', 'touchmove', 'touchleave', 'touchcancel'],
          init: function(options) {
            var instance = options.instance
              , initialScale = 1
              , pannedX = 0
              , pannedY = 0;

            // Init Hammer
            // Listen only for pointer and touch events
            this.hammer = Hammer(options.svgElement, {
              inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
            });

            // Enable pinch
            this.hammer.get('pinch').set({enable: true});

            // Handle double tap
            this.hammer.on('doubletap', function(ev){
              instance.zoomIn();
            });

            // Handle pan
            this.hammer.on('panstart panmove', function(ev){
              // On pan start reset panned variables
              if (ev.type === 'panstart') {
                pannedX = 0;
                pannedY = 0;
              }

              // Pan only the difference
              instance.panBy({x: ev.deltaX - pannedX, y: ev.deltaY - pannedY});
              pannedX = ev.deltaX;
              pannedY = ev.deltaY;
            });

            // Handle pinch
            this.hammer.on('pinchstart pinchmove', function(ev){
              // On pinch start remember initial zoom
              if (ev.type === 'pinchstart') {
                initialScale = instance.getZoom();
                instance.zoomAtPoint(initialScale * ev.scale, {x: ev.center.x, y: ev.center.y});
              }

              instance.zoomAtPoint(initialScale * ev.scale, {x: ev.center.x, y: ev.center.y});
            });

            // Prevent moving the page on some devices when panning over SVG
            options.svgElement.addEventListener('touchmove', function(e){ e.preventDefault(); });
          }

        , destroy: function(){
            this.hammer.destroy();
          }
        };

        svgPan = svgPanZoom(svg, { dblClickZoomEnabled: true,
                                   preventEventsDefaults: true,
                                   controlIconsEnabled: data.zoom_controls,
                                   customEventsHandler: eventsHandler
        });

        if (data.svg_fit) {
          svgPan.fit();
          svgPan.center();
        } else {
          if (data.svg_contain) {
            svgPan.contain();
            svgPan.pan({x: 0, y: 0});
          } else {
            var s = svgPan.getSizes();
            if (s.width > s.height) {
              if (data.zoom_initial) {
                svgPan.zoomAtPoint(data.zoom_initial,
                                   {x: 0, y: s.height / 2});
              } else {
                svgPan.pan({x: 0, y: -s.height / 2});
              }
            } else {
              if (data.zoom_initial) {
                svgPan.zoomAtPoint(data.zoom_initial,
                                   {x: s.width / 2, y: 0});
              } else {
                svgPan.pan({x: s.width / 2, y: 0});
              }
            }
          }
        }

      }
    }

  };

}
