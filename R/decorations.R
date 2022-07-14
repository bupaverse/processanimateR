#' @title Decoration callback for token selection
#'
#' @param stroke Sets the `stroke` attribute of selected tokens.
#'
#' @return A JavaScript callback function called when token selection changes.
#' @export
#'
#' @examples
#' # Create a decoration callback that paints tokens red
#' token_select_decoration("red")
#'
#' @seealso animate_process
token_select_decoration <- function(stroke = "black") {

  return (paste0('function(node, selected) {
          if (selected) {
            node.attr("stroke-width", "3")
                .attr("stroke", "',stroke,'");
          } else {
            node.attr("stroke-width", "1")
                .attr("stroke", "black");
          }
        }'))

}


#' @title Decoration callback for activity selection
#'
#' @param stroke_dasharray Sets the `stroke-dasharray` attribute for selected activities.
#' @param stroke_width Sets the `stroke-width` attribute for selected activities.
#' @param stroke Sets the `stroke` attribute for selected activities.
#'
#' @return A JavaScript callback function called when activity selection changes.
#' @export
#'
#' @examples
#' # Create a decoration callback that increases the activity stroke width
#' activity_select_decoration(stroke_width = "5")
#'
#' @seealso animate_process
activity_select_decoration <- function(stroke_dasharray = "2", stroke_width = "2", stroke = "black") {

  return (paste0('function(node, selected) {
            if (selected) {
              node.attr("stroke-width", "',stroke_width,'")
                  .attr("stroke-dasharray", "',stroke_dasharray,'")
                  .attr("stroke", "',stroke,'");
            } else {
              node.attr("stroke-width", "1")
                  .attr("stroke-dasharray", "0")
                  .attr("stroke", "#c0c0c0");
            }
          }'))

}
