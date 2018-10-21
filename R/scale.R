#' @title Token scale to be used as aesthetics
#'
#' @param attribute The event attribute (character) or alternatively a data frame with three columns (case, time, value)
#'  matching the case identifier of the supplied event log.
#' @param scale Which D3 scale function to be used.
#' @param domain The domain of the D3 scale function. Can be left NULL in which case it will be automatically determined.
#' @param range The range of the D3 scale function. Should be a vector of two or more numerical values.
#'
#' @return A scale to be used with `token_mapping`
#' @export
#'
#' @examples
#' data(example_log)
#'
#' # Change token color based on a factor attribute
#' animate_process(example_log,
#'  legend = "color",
#'  mapping = token_aes(color = token_scale("res", scale = "ordinal",
#'   range = RColorBrewer::brewer.pal(8, "Paired"))))
#'
#' @seealso animate_process
#'
token_scale <- function(attribute = NULL,
                        scale = c("identity", "linear", "sqrt", "log", "quantize", "ordinal", "time"),
                        domain = NULL,
                        range = NULL) {

  scale <- match.arg(scale)

  return(c(as.list(environment())))

}
