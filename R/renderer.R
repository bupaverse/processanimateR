#' @title Render as a plain graph
#'
#' This renderer uses viz.js to render the process map using the DOT layout.
#'
#' @param svg_fit Whether to scale the process map to fully fit in its container. If set to `TRUE` the process map will be scaled to be fully visible and may appear very small.
#' @param svg_contain Whether to scale the process map to use all available space (contain) from its container. If set to `FALSE`, if `svg_fit` is set this takes precedence.
#' @param svg_resize_fit Whether to (re)-fit the process map to its container upon resize.
#' @param zoom_control Whether to show zoom controls.
#' @param zoom_initial The initial zoom level to use.
#' @return A rendering function to be used with \code{\link{animate_process}}
#' @export
#'
#' @examples
#' data(example_log)
#'
#' # Animate the process with the default GraphViz DOT renderer
#' animate_process(example_log, renderer = renderer_graphviz())
#'
#' @seealso animate_process
#'
renderer_graphviz <- function(svg_fit = TRUE,
                              svg_contain = FALSE,
                              svg_resize_fit = TRUE,
                              zoom_controls = TRUE,
                              zoom_initial = NULL) {

  render <- function(processmap, width, height) {
    # Generate the DOT source
    graph <- DiagrammeR::render_graph(processmap, width = width, height = height)
    diagram <- graph$x$diagram

    # hack to add 'weight' attribute to the graph (see same approach in processmapR)
    diagram %>%
      stringr::str_replace_all("len", "weight") %>%
      stringr::str_replace_all("decorate", "constraint")
  }

  attr(render, "name") <- "graph"
  attr(render, "dependencies") <- list(htmltools::htmlDependency(name = "viz.js",
                                                                version = "2.1.2",
                                                                src = c(file="htmlwidgets/lib/viz"),
                                                                script = c("viz.js",
                                                                           "full.render.js"),
                                                                all_files = FALSE,
                                                                package = "processanimateR"))
  attr(render, "config") <- list(
    svg_fit = svg_fit,
    svg_contain = svg_contain,
    svg_resize_fit = svg_resize_fit,
    zoom_controls = zoom_controls,
    zoom_initial = zoom_initial
  )

  return(render)
}


#' Render as graph on a geographical map
#'
#' This renderer uses Leaflet to draw the nodes and egdes of the process map on a geographical map.
#'
#' @param node_coordinates A data frame with node coordinates in the format `act`, `lat`, `lng`.
#' @param edge_coordinates A data frame with additional edge coordinates in the format `act_from`, `act_to`, `lat`, `lng`.
#' @param layer The JavaScript code used to create a Leaflet layer. A TileLayer is used as default value.
#' @param tile The URL to be used for the standard Leaflet TileLayer.
#' @param options A named list of leaflet options, such as the center point of the map and the initial zoom level.
#' @param grayscale Whether to apply a grayscale filter to the map.
#' @param icon_act The SVG code used for the activity icon.
#' @param icon_start The SVG code used for the start icon.
#' @param icon_end The SVG code used for the end icon.
#' @param scale_max The maximum factor to be used to scale the process map with when zooming out.
#' @param scale_min The minimum factor to be used to scale the process map with when zooming in.
#'
#' @return A rendering function to be used with \code{\link{animate_process}}
#' @export
#'
#' @examples
#' data(example_log)
#'
#' # Animate the example process with activities placed in some locations
#' animate_process(example_log,
#'   renderer = renderer_leaflet(
#'     node_coordinates = data.frame(
#'        act = c("A", "B", "C", "D", "Start", "End"),
#'        lat = c(63.443680, 63.426925, 63.409207, 63.422336, 63.450950, 63.419706),
#'        lng = c(10.383625, 10.396972, 10.406418, 10.432119, 10.383368, 10.252347),
#'        stringsAsFactors = FALSE),
#'     edge_coordinates = data.frame(
#'        act_from = c("B"),
#'        act_to = c("C"),
#'        lat = c(63.419207),
#'        lng = c(10.386418),
#'        stringsAsFactors = FALSE),
#'     options = list(center = c(63.412273, 10.399590), zoom = 12)),
#'   duration = 5, repeat_count = Inf)
#'
#' @seealso animate_process
#'
renderer_leaflet <- function(node_coordinates,
                         edge_coordinates = data.frame(act_from = character(0), act_to = character(0),
                                                       lat = numeric(0), lng = numeric(0), stringsAsFactors = FALSE),
                         layer = c(paste0("new L.TileLayer('", tile ,"',"),
                                   paste0("{ attribution : '", attribution_osm() ,"'})")),
                         tile = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                         options = list(),
                         grayscale = TRUE,
                         icon_act = icon_marker(),
                         icon_start = icon_circle(),
                         icon_end = icon_circle(),
                         scale_max = 4,
                         scale_min = 0.25) {

  # GraphViz colors are not understood by SVG
  colConv <- function(color) {
    c <- grDevices::col2rgb(color)
    grDevices::rgb(c[1],c[2], c[3], maxColorValue = 255)
  }

  render <- function(processmap, width, height) {
    id <- shape <- label <- fillcolor <- fontcolor <- act <- from_id <- NULL
    from_act <- from_lat <- from_lng <- to_act <- to_lat <- to_lng <- NULL
    lng <- lat <- color <- penwidth <- from <- to <- . <- NULL

    precedence <- attr(processmap, "base_precedence")
    nodes <- processmap$nodes_df %>%
      select(id, shape, label, fillcolor, fontcolor) %>%
      left_join(precedence %>% distinct(act, from_id), by = c("id" = "from_id")) %>%
      left_join(node_coordinates, by = c("act" = "act")) %>%
      mutate(fillcolor = sapply(fillcolor, colConv))
    if (any(is.na(nodes))) {
      stop(paste0("Missing coordinates for activities",
                  nodes$act[which(is.na(nodes$lat) | is.na(nodes$lng))]));
    }

    edges_from <- processmap$edges_df %>%
      left_join(nodes, by = c("from" = "id")) %>%
      rename(act_from = act) %>%
      left_join(select(nodes, id, act), by = c("to" = "id")) %>%
      rename(act_to = act)

    edges_to <- processmap$edges_df %>%
      left_join(nodes, by = c("to" = "id")) %>%
      rename(act_to = act) %>%
      left_join(select(nodes, id, act), by = c("from" = "id")) %>%
      rename(act_from = act)

    edges_extra <- edge_coordinates %>%
      left_join(edges_from %>% select(-lat, -lng),
                by = c("act_from" = "act_from", "act_to" = "act_to"))

    edges <- bind_rows(edges_from, edges_extra, edges_to) %>%
      mutate(color = sapply(color, colConv)) %>%
      select(id, from, to, lat, lng, label, penwidth, color) %>%
      tidyr::nest("path" = c(lat, lng))

    list("nodes" = nodes,
         "edges" = edges,
         "layer" = htmlwidgets::JS(layer),
         "options" = options,
         "grayscale" = grayscale,
         "icon_act" = icon_act,
         "icon_start" = icon_start,
         "icon_end" = icon_end,
         "scale_max" = scale_max,
         "scale_min" = scale_min)
  }
  attr(render, "name") <- "map"
  attr(render, "dependencies") <- list(htmltools::htmlDependency(name = "leaflet",
                                                                version = "1.5.1",
                                                                src = c(file="htmlwidgets/lib/leaflet"),
                                                                script = "leaflet.min.js",
                                                                stylesheet = c("leaflet.css", "leaflet-grayscale.css"),
                                                                attachment = c("images/layers.png",
                                                                               "images/layers-2x.png",
                                                                               "images/marker-icon-2x.png",
                                                                               "images/marker-icon.png",
                                                                               "images/marker-shadow.png"),
                                                                all_files = FALSE,
                                                                package = "processanimateR"),
                                     htmltools::htmlDependency(name = "leaflet-d3-svg-overlay",
                                                              version = "2.2",
                                                              src = c(file="htmlwidgets/lib/leaflet-d3-svg-overlay"),
                                                              script = "leaflet-d3-svg-overlay.js",
                                                              all_files = FALSE,
                                                              package = "processanimateR"))

  attr(render, "config") <- list(
  )

  return(render)
}

#' Standard attribution
#'
#' This is the standard attribution advised for OPenStreetMap tiles.
#'
#' @return The attribution character vector.
#' @export
#'
#' @examples
#' attribution_osm()
attribution_osm <- function() {
  return('&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors');
}
