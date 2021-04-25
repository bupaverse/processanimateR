#
# Private helper functions
#

generate_tokens <- function(cases, precedence, processmap, mode, a_factor,
                            timeline_start, timeline_end, epsilon) {

  case <- end_time <- start_time <- next_end_time <- next_start_time <- case_start <- token_duration <- NULL
  min_order <- token_start <- activity_duration <- token_end <- from_id <- to_id <- case_duration <- NULL

  tokens <- precedence %>%
    left_join(cases, by = c("case")) %>%
    left_join(processmap$edges_df, by = c("from_id" = "from", "to_id" = "to")) %>%
    filter(!is.na(id) & !is.na(case))

  if (mode == "absolute") {
    tokens <- mutate(tokens,
                     token_start = (end_time - timeline_start) / a_factor,
                     token_duration = (next_start_time - end_time) / a_factor,
                     activity_duration = pmax(0, (next_end_time - next_start_time) / a_factor))
  } else {
    tokens <- mutate(tokens,
                     token_start = (end_time - case_start) / a_factor,
                     token_duration = (next_start_time - end_time) / a_factor,
                     activity_duration = pmax(0, (next_end_time - next_start_time) / a_factor))
  }

  tokens <- tokens %>%
    # TODO improve handling of parallelism
    # Filter all negative durations caused by parallelism
    filter(token_duration >= 0, activity_duration >= 0) %>%
    # SVG animations seem to not like events starting at the same time caused by 0s durations
    mutate(token_duration = epsilon + token_duration,
           activity_duration = epsilon + activity_duration) %>%
    arrange(case, start_time, min_order) %>%
    group_by(case) %>%
    # Ensure start times are not overlapping SMIL does not fancy this
    mutate(token_start = token_start + ((row_number(token_start) - min_rank(token_start)) * epsilon)) %>%
    # Ensure consecutive start times, this epsilon just needs to be small
    mutate(token_end = min(token_start) + cumsum(token_duration + activity_duration) + 0.000001) %>%
    mutate(token_start = lag(token_end, default = min(token_start))) %>%
    ungroup()

  tokens %>%
    select(case,
           edge_id = id,
           token_start,
           token_duration,
           activity_duration,
           token_end)

}

# outputs a data frame: { case, time, attribute/value }
generate_token_animation_attribute <- function(eventlog, value, default) {
  attribute <- rlang::sym("value")
  if (is.null(value)) {
    # use fixed default value
    eventlog %>%
      as.data.frame() %>%
      group_by(!!case_id_(eventlog)) %>%
      summarise(time = min(!!timestamp_(eventlog))) %>%
      mutate(!!attribute := default) %>%
      rename(case = !!case_id_(eventlog))
  } else if (is.data.frame(value)) {
    # check data present
    stopifnot(c("case", "time", "value") %in% colnames(value))
    value
  } else if (value %in% colnames(eventlog)) {
    # use existing value from event log
    eventlog %>%
      as.data.frame() %>%
      mutate(!!attribute := !!rlang::sym(value)) %>%
      select(case = !!case_id_(eventlog),
             time = !!timestamp_(eventlog),
             !!attribute)
  } else {
    # set to a fixed value
    eventlog %>%
      as.data.frame() %>%
      mutate(!!attribute := value) %>%
      select(case = !!case_id_(eventlog),
             time = !!timestamp_(eventlog),
             !!attribute)
  }
}

transform_token_time <- function(data, cases, mode, a_factor, timeline_start, timeline_end) {

  .order <- time <- case <- log_start <- case_start <- value <- NULL

  if (nrow(data) != nrow(cases)) {
    data <- data %>%
      group_by(case) %>%
      filter(row_number() == 1 | lag(value) != value) # only keep changes in value
  }

  data <- data %>%
    left_join(cases, by = "case")

  if (mode == "absolute") {
    data <- mutate(data, time = as.numeric(time - timeline_start, units = "secs"))
  } else {
    data <- mutate(data, time = as.numeric(time - case_start, units = "secs"))
  }

  data %>%
    mutate(time = time / a_factor) %>%
    select(case, time, value)
}

# outputs a data frame: { case, time, attribute/value }
generate_activity_animation_attribute <- function(eventlog, value, default) {
  attribute <- rlang::sym("value")
  if (is.null(value)) {
    # use fixed default value
    eventlog %>%
      as.data.frame() %>%
      group_by(!!activity_id_(eventlog)) %>%
      summarise(time = min(!!timestamp_(eventlog))) %>%
      mutate(!!attribute := default) %>%
      rename(act = !!activity_id_(eventlog))
  } else if (is.data.frame(value)) {
    # check data present
    stopifnot(c("act", "time", "value") %in% colnames(value))
    value
  } else if (value %in% colnames(eventlog)) {
    # use existing value from event log
    eventlog %>%
      as.data.frame() %>%
      mutate(!!attribute := !!rlang::sym(value)) %>%
      arrange(!!case_id_(eventlog), !!timestamp_(eventlog)) %>%
      select(act = !!activity_id_(eventlog),
             time = !!timestamp_(eventlog),
             !!attribute)
  } else {
    # set to a fixed value
    eventlog %>%
      as.data.frame() %>%
      mutate(!!attribute := value) %>%
      select(act = !!activity_id_(eventlog),
             time = !!timestamp_(eventlog),
             !!attribute)
  }
}

transform_activity_time <- function(data, mode, a_factor, timeline_start, timeline_end) {

  .order <- time <- case <- log_start <- case_start <- value <- act <- NULL

  data <- data %>%
    group_by(act) %>%
    filter(row_number() == 1 | lag(value) != value) # only keep changes in value

  if (mode == "absolute") {
    data <- mutate(data, time = as.numeric(time - timeline_start, units = "secs"))
  } else {
    # unchanged but will be scaled
    data <- mutate(data, time = as.numeric(time, units = "secs"))
  }

  data %>%
    mutate(time = time / a_factor) %>%
    arrange(act, time) %>%
    select(act, time, value)
}


# Utility functions
# https://github.com/gertjanssenswillen/processmapR/blob/master/R/utils.R
case_id_ <- function(eventlog) rlang::sym(bupaR::case_id(eventlog))
timestamp_ <- function(eventlog) rlang::sym(bupaR::timestamp(eventlog))
activity_id_ <- function(eventlog) rlang::sym(bupaR::activity_id(eventlog))
activity_instance_id_ <- function(eventlog) rlang::sym(bupaR::activity_instance_id(eventlog))
