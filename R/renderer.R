#' @title Render as a plain graph
#'
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
renderer_graphviz <- function() {
  render <- function(processmap, width, height) {
    # Generate the DOT source
    graph <- DiagrammeR::render_graph(processmap, width = width, height = height)
    graph$x$diagram
  }
  attr(render, "name") <- "graph"

  return(render)
}


#' Render as graph on a geographical map
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
      tidyr::nest(lat, lng, .key = "path")

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

  return(render)
}

#' Standard attribution advised for OpenStreetMap tiles.
#'
#' @return The attribution character vector.
#' @export
#'
#' @examples
#' attribution_osm()
attribution_osm <- function() {
  return('&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors');
}

#' Standard map marker based on Material Design (Apache 2.0 License): https://material.io/
#'
#' @return SVG code for a map  marker.
#' @export
#'
#' @examples
#' icon_marker()
icon_marker <- function() {
  '<g transform="translate(-12,-22)">
   <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
   <path d="M0 0h24v24H0z" fill="none"/></g>'
}

#' Standard circle marker based on Material Design (Apache 2.0 License): https://material.io/
#'
#' @return SVG code for a map  marker.
#' @export
#'
#' @examples
#' icon_circle()
icon_circle <- function() {
'<g transform="translate(-12,-12)">
 <path fill="none" d="M0 0h24v24H0z"/>
 <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10 6c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6z"/>
 <path fill="none" d="M0 0h24v24H0z"/></g>'
}
