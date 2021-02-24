#' @title Animate cases on a process map
#'
#' @description This function animates the cases stored in a `bupaR` event log on top of a process model.
#'  Each case is represented by a token that travels through the process model according to the waiting and processing times of activities.
#'  Currently, animation is only supported for process models created by \code{\link{process_map}} of the `processmapR` package.
#'  The animation will be rendered as SVG animation (SMIL) using the `htmlwidgets` framework. Each token is a SVG shape and customizable.
#'
#' @param eventlog The `bupaR` event log object that should be animated
#' @param processmap A process map created with `processmapR` (\code{\link{process_map}})
#'  on which the event log will be animated. If not provided a standard process map will be generated
#'  from the supplied event log.
#' @param renderer Whether to use Graphviz (\code{\link{renderer_graphviz}}) to layout and render the process map,
#'  or to render the process map using Leaflet (\code{\link{renderer_leaflet}}) on a geographical map.
#' @param mode Whether to animate the cases according to their actual time of occurrence (`absolute`) or to start all cases at once (`relative`).
#' @param duration The overall duration of the animation, all times are scaled according to this overall duration.
#' @param jitter The magnitude of a random coordinate translation, known as jitter in scatterplots, which is added to each token.
#'  Adding jitter can help to disambiguate tokens drawn on top of each other.
#' @param timeline Whether to render a timeline slider in supported browsers (Work only on recent versions of Chrome and Firefox).
#' @param initial_state Whether the initial playback state is `playing` or `paused`. The default is `playing`.
#' @param initial_time Sets the initial time of the animation. The default value is `0`.
#' @param legend Whether to show a legend for the `size` or the `color` scale. The default is not to show a legend.
#' @param repeat_count The number of times the process animation is repeated.
#' @param repeat_delay The seconds to wait before one repetition of the animation.
#' @param epsilon_time A (small) time to be added to every animation to ensure that tokens are visible.
#' @param mapping A list of aesthetic mappings from event log attributes to certain visual parameters of the tokens.
#'  Use \code{\link{token_aes}} to create a suitable mapping list.
#' @param mapping_activity A list of aesthetic mappings from event log attributes to certain visual parameters of the activities
#'  Use \code{\link{activity_aes}} to create a suitable mapping list.
#' @param token_callback_onclick A JavaScript function that is called when a token is clicked.
#'  The function is parsed by \code{\link{JS}} and received three parameters: `svg_root`, 'svg_element', and 'case_id'.
#' @param token_callback_select A JavaScript callback function called when token selection changes.
#' @param activity_callback_onclick A JavaScript function that is called when an activity is clicked.
#'  The function is parsed by \code{\link{JS}} and received three parameters: 'svg_root', 'svg_element', and 'activity_id'.
#' @param activity_callback_select A JavaScript callback function called when activity selection changes.
#' @param elementId passed through to \code{\link{createWidget}}. A custom elementId is useful to capture the selection events
#'  via input$elementId_tokens and input$elementId_activities when used in Shiny.
#' @param preRenderHook passed through to \code{\link{createWidget}}.
#' @param width,height Fixed size for widget (in css units).
#'  The default is NULL, which results in intelligent automatic sizing based on the widget's container.
#' @param sizingPolicy Options that govern how the widget is sized in various
#'   containers (e.g. a standalone browser, the RStudio Viewer, a knitr figure,
#'   or a Shiny output binding). These options can be specified by calling the
#'   \code{\link{sizingPolicy}} function.
#' @param ... Options passed on to \code{\link{process_map}}.
#'
#' @examples
#' data(example_log)
#'
#' # Animate the process with default options (absolute time and 60s duration)
#' animate_process(example_log)
#' \donttest{
#' # Animate the process with default options (relative time, with jitter, infinite repeat)
#' animate_process(example_log, mode = "relative", jitter = 10, repeat_count = Inf)
#' }
#'
#' @seealso \code{\link{process_map}}, \code{\link{token_aes}}
#'
#' @import dplyr
#' @importFrom magrittr %>%
#' @importFrom rlang :=
#' @importFrom processmapR process_map
#'
#' @export
animate_process <- function(eventlog,
                            processmap = process_map(eventlog, render = F, ...),
                            renderer = renderer_graphviz(),
                            mode = c("absolute","relative","off"),
                            duration = 60,
                            jitter = 0,
                            timeline = TRUE,
                            legend = NULL,
                            initial_state = c("playing", "paused"),
                            initial_time = 0,
                            repeat_count = 1,
                            repeat_delay = 0.5,
                            epsilon_time = duration / 1000,
                            mapping = token_aes(),
                            mapping_activity = activity_aes(),
                            token_callback_onclick = c("function(svg_root, svg_element, case_id) {","}"),
                            token_callback_select = token_select_decoration(),
                            activity_callback_onclick = c("function(svg_root, svg_element, activity_id) {","}"),
                            activity_callback_select = activity_select_decoration(),
                            elementId = NULL,
                            preRenderHook = NULL,
                            width = NULL,
                            height = NULL,
                            sizingPolicy = htmlwidgets::sizingPolicy(
                              browser.fill = TRUE,
                              viewer.fill = TRUE,
                              knitr.figure = FALSE,
                              knitr.defaultWidth = "100%",
                              knitr.defaultHeight = "300"
                            ),
                            ...) {

  if (any(startsWith(as.character(names(list(...))), "animation_"))) {
    stop("The old pre 1.0 API using `animation_` parameters is deprecated.")
  }

  # Make CRAN happy about dplyr evaluation
  case_start <- log_end <- start_time <- end_time <- next_end_time <- next_start_time <- NULL
  case <- case_end <- log_start <- log_duration <- case_duration <- from_id <- to_id <- NULL
  label <- act <- NULL
  token_start <- token_end <- activity_duration <- token_duration <- NULL
  constraint <- weight <- NULL

  mode <- match.arg(mode)
  initial_state <- match.arg(initial_state)

  if (initial_time > duration) {
    stop("The 'initial_time' parameter should be less or equal than the specified 'duration'.")
  }

  precedence <- NULL
  if (!is.null(attr(processmap, "base_precedence"))) {
    precedence <- attr(processmap, "base_precedence") %>%
      mutate_at(vars(start_time, end_time, next_start_time, next_end_time), as.numeric, units = "secs")
    activities <- precedence %>%
      select(act, id = from_id) %>%
      stats::na.omit() %>%
      distinct() %>%
      arrange(id)
  } else if (!is.null(attr(processmap, "causal_nodes"))) {
    activities <- attr(processmap, "causal_nodes") %>%
      select(act, id = from_id) %>%
      stats::na.omit() %>%
      distinct() %>%
      arrange(id)
  } else {
    stop("Missing attribute `base_precedence` or `causal_nodes`. Did you supply a process map generated by `process_map` or `render_causal_net`? ")
  }

  start_activity <- processmap$nodes_df %>% filter(label == "Start") %>% pull(id)
  end_activity <- processmap$nodes_df %>% filter(label == "End") %>% pull(id)

  if (mode != "off" && !is.null(precedence)) {

    suppressWarnings({
      cases <- precedence %>%
        group_by(case) %>%
        summarise(case_start = min(start_time, na.rm = T),
                  case_end = max(end_time, na.rm = T)) %>%
        mutate(case_duration = case_end - case_start) %>%
        filter(!is.na(case)) %>%
        ungroup()
    })

    # determine animation factor based on requested duration
    if (mode == "absolute") {
      timeline_start <- cases %>% pull(case_start) %>% min(na.rm = T)
      timeline_end <- cases %>% pull(case_end) %>% max()
      a_factor <- (timeline_end - timeline_start) / duration
    } else {
      timeline_start <- 0
      timeline_end <- cases %>% pull(case_duration) %>% max(na.rm = T)
      a_factor =  timeline_end / duration
    }

    #
    # Token animation
    #

    tokens <- generate_tokens(cases, precedence, processmap, mode, a_factor,
                              timeline_start, timeline_end, epsilon_time)

    adjust <- max(tokens$token_end) / duration

    tokens <- tokens %>%
      mutate(token_start = token_start / adjust,
             token_duration = token_duration / adjust,
             activity_duration = activity_duration / adjust) %>%
      select(-token_end)

    sizes <- generate_token_animation_attribute(eventlog, mapping$size$attribute, 6)
    sizes <- transform_token_time(sizes, cases, mode, a_factor, timeline_start, timeline_end)

    colors <- generate_token_animation_attribute(eventlog, mapping$color$attribute, "white")
    colors <- transform_token_time(colors, cases, mode, a_factor, timeline_start, timeline_end)

    images <- generate_token_animation_attribute(eventlog, mapping$image$attribute, NA)
    images <- transform_token_time(images, cases, mode, a_factor, timeline_start, timeline_end)

    if (mapping$shape == "image" && nrow(images) == 0) {
      stop("Need to supply image URLs in parameter 'mapping' to use shape 'image'.");
    }

    opacities <- generate_token_animation_attribute(eventlog, mapping$opacity$attribute, 0.9)
    opacities <- transform_token_time(opacities, cases, mode, a_factor, timeline_start, timeline_end)

    #
    # Activity animation
    #

    act_colors <- generate_activity_animation_attribute(eventlog, mapping_activity$color$attribute, NA_character_)
    act_colors <- transform_activity_time(act_colors, mode, a_factor, timeline_start, timeline_end)

    act_opacities <- generate_activity_animation_attribute(eventlog, mapping_activity$opacity$attribute, NA_real_)
    act_opacities <- transform_activity_time(act_opacities, mode, a_factor, timeline_start, timeline_end)

  } else {
    # No animation mode, for using activity selection features only
    sizes <- data.frame()
    colors <- data.frame()
    images <- data.frame()
    opacities <- data.frame()
    tokens <- data.frame()

    act_colors <- data.frame()
    act_opacities <- data.frame()

    timeline_start <- 0
    timeline_end <- 0
    timeline <- FALSE
    a_factor <- 0
  }

  if ("weight" %in% colnames(processmap$edges_df)) {
    # hack to add 'weight' attribute to the graph
    processmap$edges_df %>%
      mutate(len = weight) -> processmap$edges_df
  }

  if ("constraint" %in% colnames(processmap$edges_df)) {
    # hack to add 'weight' attribute to the graph
    processmap$edges_df %>%
      mutate(decorate = constraint) -> processmap$edges_df
  }

  # actually render the process map
  rendered_process <- renderer(processmap, width, height)

  x <- list(
    rendered_process = rendered_process,

    activities = activities,
    start_activity = start_activity,
    end_activity = end_activity,

    # Tokens and their timing
    tokens = tokens,

    # Additional token aesthetics
    sizes = sizes,
    sizes_scale = mapping$size,
    colors = colors,
    colors_scale = mapping$color,
    opacities = opacities,
    opacities_scale = mapping$opacity,
    images = images,
    images_scale = mapping$image,
    shape = mapping$shape, #TODO see if this can be a scale too
    attributes = mapping$attributes,

    act_colors = act_colors,
    act_colors_scale = mapping_activity$color,
    act_opacities = act_opacities,
    act_opacities_scale = mapping_activity$opacity,

    duration = duration,
    timeline = timeline,
    mode = mode,

    initial_state = initial_state,
    initial_time = initial_time,
    repeat_count = repeat_count,
    repeat_delay = repeat_delay,
    jitter = jitter,
    factor = a_factor * 1000,

    legend = legend,

    timeline_start = timeline_start * 1000,
    timeline_end = timeline_end * 1000,

    onclick_token_callback = htmlwidgets::JS(token_callback_onclick),
    onclick_token_select = htmlwidgets::JS(token_callback_select),
    onclick_activity_callback = htmlwidgets::JS(activity_callback_onclick),
    onclick_activity_select = htmlwidgets::JS(activity_callback_select),
    processmap_renderer = attr(renderer, "name")
  )

  x <- c(x, attr(renderer, "config"))

  htmlwidgets::createWidget(elementId = elementId,
                            name = "processanimateR",
                            x = x,
                            width = width, height = height,
                            sizingPolicy = sizingPolicy,
                            preRenderHook = preRenderHook,
                            dependencies = attr(renderer, "dependencies"))
}

#' @title Create a process animation output element
#' @description Renders a renderProcessanimater within an application page.
#' @param outputId Output variable to read the animation from
#' @param width,height Must be a valid CSS unit (like 100%, 400px, auto) or a number,
#'  which will be coerced to a string and have px appended.
#'
#' @export
processanimaterOutput <- function(outputId, width = "100%", height = "400px") {
  htmlwidgets::shinyWidgetOutput(outputId = outputId,
                                 name = "processanimateR",
                                 inline = F,
                                 width = width, height = height,
                                 package = "processanimateR")
}

#' @title Renders process animation output
#' @description Renders a SVG process animation suitable to be used by processanimaterOutput.
#' @param expr The expression generating a process animation (animate_process).
#' @param env The environment in which to evaluate expr.
#' @param quoted Is expr a quoted expression (with quote())? This is useful if you want to save an expression in a variable.
#'
#' @export
renderProcessanimater <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, processanimaterOutput, env, quoted = TRUE)
}
