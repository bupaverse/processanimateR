#' @title Adds a token color attribute
#'
#' @description Adds a color attribute to an event log that can be used in combination with the \code{token_color} parameter of \code{\link{animate_process}}
#' @param eventlog The source eventlog
#' @param attribute The source attribute to calculate the color on
#' @param color_attribute The target attribute to store the color information in
#' @param palette The palette to use with the default color mapping
#' @param na.color The color for NA values
#' @param color_mapping A function that takes the attribute and returns a color, the default is using scales::col_numeric.
#'
#' @import dplyr
#' @importFrom magrittr %>%
#' @importFrom rlang :=
#'
#' @export
add_token_color <- function(eventlog, attribute, color_attribute, palette = "YlOrBr", na.color = "red",
                            color_mapping = scales::col_numeric(palette, eventlog %>% pull(!!attr), na.color = na.color)) {
  attr <- rlang::sym(attribute)
  cAttr <- rlang::sym(color_attribute)
  eventlog %>%
    bupaR::group_by_case() %>%
    mutate(!!cAttr := zoo::na.locf(!!attr, na.rm = F)) %>%
    bupaR::ungroup_eventlog() %>%
    mutate(!!cAttr := color_mapping(!!cAttr))
}
