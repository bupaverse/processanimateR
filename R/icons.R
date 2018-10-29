#' Standard map marker
#'
#' The marker is based on Material Design (Apache 2.0 License): https://material.io/
#'
#' @return SVG code for a map  marker.
#' @export
#'
#' @examples
#' icon_marker()
icon_marker <- function() {
  '<g transform="translate(-12,-22)">
   <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
   </g>'
}

#' Standard circle marker
#'
#' The marker is based on Material Design (Apache 2.0 License): https://material.io/
#'
#' @return SVG code for a map  marker.
#' @export
#'
#' @examples
#' icon_circle()
icon_circle <- function() {
'<g transform="translate(-12,-12)">
 <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10 6c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6z"/>
 </g>'
}
