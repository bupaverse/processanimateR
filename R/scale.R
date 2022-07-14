#' @title Token scale mapping values to aesthetics
#'
#' @description Creates a `list` of parameters suitable to be used as token scale in (\code{\link{token_aes}}) for mapping values to certain aesthetics of the tokens in a process map animation.
#'  Refer to the d3-scale documentation (https://github.com/d3/d3-scale) for more information about how to set `domain` and `range` properly.
#'
#' @param attribute This may be (1) the name of the event attribute to be used as values,
#' (2) a data frame with three columns (case, time, value) in which the values in the case column are matching the case identifier of the supplied event log, or
#' (3) a constant value that does not change over time.
#' @param scale Which D3 scale function to be used out of `identity`, `linear`, `sqrt`, `log`, `quantize`, `ordinal`, or `time`.
#' @param domain The domain of the D3 scale function. Can be left NULL in which case it will be automatically determined based on the values.
#' @param range The range of the D3 scale function. Should be a vector of two or more numerical values.
#'
#' @return A scale to be used with `token_mapping`
#' @export
#'
#' @examples
#' data(example_log)
#'
#' # (1) Change token color based on a factor attribute
#' animate_process(example_log,
#'  legend = "color",
#'  mapping = token_aes(color = token_scale("res", scale = "ordinal",
#'   range = RColorBrewer::brewer.pal(8, "Paired"))))
#'
#' # (2) Change token color based on second data frame
#' x <- data.frame(case = as.character(rep(c(1,2,3), 2)),
#'                 time = seq(from = as.POSIXct("2018-10-03 03:41:00"),
#'                            to = as.POSIXct("2018-10-03 06:00:00"),
#'                            length.out = 6),
#'                 value = rep(c("orange", "green"), 3),
#'                 stringsAsFactors = FALSE)
#'
#' animate_process(example_log,
#'                 mode = "relative",
#'                 jitter = 10,
#'                 legend = "color",
#'                 mapping = token_aes(color = token_scale(x)))
#'
#'
#' # (3) Constant token color
#' animate_process(example_log,
#'  legend = "color",
#'  mapping = token_aes(color = token_scale("red")))
#'
#' @seealso \code{\link{animate_process}}, \code{\link{token_aes}}
#'
token_scale <- function(attribute = NULL,
                        scale = c("identity", "linear", "sqrt", "log", "quantize", "ordinal", "time"),
                        domain = NULL,
                        range = NULL) {

  scale <- match.arg(scale)

  return(c(as.list(environment())))

}
