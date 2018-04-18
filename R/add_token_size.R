#' @title Adds a token size attribute
#'
#' @description Adds a size attribute to an event log that can be used in combination with the token_size parameter of \code{\link{animate_process}}
#' @param eventlog The source eventlog
#' @param attribute The source attribute to calculate the size on
#' @param size_attribute The target attribute to store the size information in
#' @param min.size The minimum size
#' @param max.size The maximum size
#' @param na.size The size for NA values
#' @param size_mapping A function that takes the attribute and returns a size between min.size and max.size, the default is a linear transformation.
#'
#' @import dplyr
#' @importFrom magrittr %>%
#' @importFrom rlang :=
#' @importFrom rlang !!
#'
#' @export
add_token_size <- function(eventlog, attribute, size_attribute,
                           min.size = 2, max.size = 8, na.size = 2,
                           size_mapping = size_numeric(eventlog %>% pull(`!!`(attr)), min.size, max.size, na.size)) {

  attr <- rlang::sym(attribute)
  sAttr <- rlang::sym(size_attribute)

  eventlog %>%
    bupaR::group_by_case() %>%
    mutate(!!sAttr := zoo::na.locf(!!attr, na.rm = F)) %>%
    bupaR::ungroup_eventlog() %>%
    mutate(!!sAttr := size_mapping(!!sAttr))
}

size_numeric <- function(domain, min.size, max.size, na.size) {
  rng <- range(domain, na.rm = T)
  return(function(x) {
    coalesce(min.size + ((x - rng[1]) / (rng[2] - rng[1]) * (max.size - min.size)), na.size)
  })
}
