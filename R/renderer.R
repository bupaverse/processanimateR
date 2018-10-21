#' Render as a plain graph
#'
#' @return A rendering function to be used with \code{\link{animate_process}}
#' @export
#'
#' @examples
#' TODO
renderer_graphviz <- function() {
  render <- function(processmap, width, height) {
    # Generate the DOT source
    graph <-
      DiagrammeR::render_graph(processmap, width = width, height = height)
    graph$x$diagram
  }
  attr(render, "name") <- "graph"

  return(render)
}


#' Render as graph on a geographical map
#'
#' @param node_coordinates a data frame with node coordinates in the format `node`, `lat`, `lng`
#' @param edge_coordinates an (optional) data frame with edge path coordinates format TBD
#'
#' @return A rendering function to be used with \code{\link{animate_process}}
#' @export
#'
#' @examples
#' TODO
renderer_leaflet <- function(node_coordinates,
                         tile = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                         center = c(37.8, -96.9),
                         zoom = 4,
                         grayscale = TRUE,
                         # Based on Material Design (Apache 2.0 License): https://material.io/
                         act_icon = '<g transform="translate(-12,-22)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/><path d="M0 0h24v24H0z" fill="none"/></g>',
                         start_icon = '<g transform="translate(-12,-12)"><path fill="none" d="M0 0h24v24H0z"/><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10 6c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6z"/><path fill="none" d="M0 0h24v24H0z"/></g>',
                         end_icon = '<g transform="translate(-12,-12)"><path fill="none" d="M0 0h24v24H0z"/><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10 6c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6z"/><path fill="none" d="M0 0h24v24H0z"/></g>') {

  colConv <- function(color) {
    c <- col2rgb(color)
    rgb(c[1],c[2], c[3], maxColorValue = 255)
  }

  render <- function(processmap, width, height) {
    precedence <- attr(processmap, "base_precedence")
    nodes <- processmap$nodes_df %>%
      select(id, shape, label, fillcolor, fontcolor) %>%
      left_join(precedence %>% distinct(act, from_id), by = c("id" = "from_id")) %>%
      left_join(node_coordinates, by = c("act" = "act")) %>%
      mutate(fillcolor = sapply(fillcolor, colConv))
    if (any(is.na(nodes))) {
      stop("Missing coordinates for one of the activities");
    }
    edges <- processmap$edges_df %>%
      left_join(nodes, by = c("from" = "id")) %>%
      rename(from_act = act, from_lat = lat, from_lng = lng) %>%
      left_join(nodes, by = c("to" = "id")) %>%
      rename(to_act = act, to_lat = lat, to_lng = lng) %>%
      rowwise() %>%
      do({
        # TODO allows to customize path
        path <- I(list(list(list(.$from_lat, .$from_lng),
                            list(.$to_lat, .$to_lng))))
        data.frame(., I(path), stringsAsFactors = F)
      }) %>%
      mutate(color = sapply(color, colConv)) %>%
      select(id, from, to, path, label, penwidth, color)
    list("nodes" = nodes, "edges" = edges, "tile" = tile,
         "center" = center, "zoom" = zoom, "grayscale" = grayscale,
         "act_icon" = act_icon, "start_icon" = start_icon, "end_icon" = end_icon)
  }
  attr(render, "name") <- "map"

  return(render)
}
