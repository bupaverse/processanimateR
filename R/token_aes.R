#' @title Tokens aesthetics mapping
#'
#' @param size The scale used for the token size.
#' @param color The scale used for the token color,
#' @param image The scale used for the token image. Currently, image legends / D3 scales are not supported, only the `attribute` part of the scale is used.
#' @param opacity The scale used for the token opacity. Currently, opacity legends / D3 scales are not supported, only the `attribute` part of the scale is used.
#' @param shape The (fixed) SVG shape to be used to draw tokens. Can be either 'circle' (default), 'rect' or 'image'.
#'  In the latter case the image URL needs to be specified as parameter 'token_image'.
#' @param attributes A list of additional (fixed) SVG attributes to be added to each token.
#'
#' @return An aesthetics mapping for `animate_process`.
#' @export
#'
#' @examples
#' data(example_log)
#'
#' # Change default token sizes / shape
#' animate_process(example_log, mapping = token_aes(size = token_scale(12), shape = "rect"))
#' \donttest{
#' # Change default token color
#' animate_process(example_log, mapping = token_aes(color = token_scale("red")))
#'
#' # Change default token opacity
#' animate_process(example_log, mapping = token_aes(opacity = token_scale("0.2")))
#'
#' # Change default token image (GIFs work too)
#' animate_process(example_log,
#'    mapping = token_aes(shape = "image",
#'     size = token_scale(10),
#'     image = token_scale("https://upload.wikimedia.org/wikipedia/en/5/5f/Pacman.gif")))
#'
#' # A more elaborate example with a secondary data frame
#' library(eventdataR)
#' data(traffic_fines)
#' # Change token color based on a numeric attribute, here the nonsensical 'time' of an event
#' animate_process(edeaR::filter_trace_frequency(bupaR::sample_n(traffic_fines,1000),percentage=0.95),
#'   legend = "color", mode = "relative",
#'   mapping = token_aes(color = token_scale("amount",
#'                                           scale = "linear",
#'                                           range = c("yellow","red"))))
#' }
#'
#' @seealso animate_process
#'
token_aes <- function(size = token_scale(),
                      color = token_scale(),
                      image = token_scale(),
                      opacity = token_scale(),
                      shape = c("circle","rect","image"),
                      attributes = list()) {

  shape <- match.arg(shape)

  return(c(as.list(environment())))

}
