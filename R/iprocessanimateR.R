#' @title Interactive Process Animation
#'
#' @description Creates an interactive Shiny dashbord that allows to configure the animation produced by processanimateR.
#' @param eventlog The event log object that should be animated
#' @param min.time Minimum animation time selectable
#' @param max.time Maximum animation time selectable
#' @param default.time Default animation time selectable
#'
#' @examples{
#' \dontrun{
#' library(eventdataR)
#' library(edeaR)
#' library(dplyr)
#' ianimate_process(sepsis %>%
#'  filter_trace_frequency(percentage = 0.2) %>%
#'  filter_activity(c("Return ER"), reverse = T) %>%
#'  # we fix the datatype of some of the attributes to allow proper rendering of the token color
#'  # the token size option currently only support numeric attributes
#'  mutate_at(c("lacticacid", "leucocytes", "crp", "age"), as.numeric) %>%
#'  mutate_at(c("disfuncorg", "sirscriteria2ormore", "infectionsuspected"), as.logical))
#' }
#' }
#'
#' @author Felix Mannhardt <felix.mannhardt@sintef.no> (SINTEF Technology and Society)
#'
#' @seealso animate_process
#' @import shiny
#' @import dplyr
#' @import processmapR
#' @importFrom magrittr %>%
#'
#' @export
ianimate_process <- function(eventlog, min.time = 30, max.time = 600, default.time = 60) {

  ui <- function(request) {
    fluidPage(
      tags$head(tags$style("#process{height:90vh !important;}")),
      titlePanel("Hello processanimateR!"),

      sidebarLayout(

        sidebarPanel(
          width = 2,
          sliderInput("duration", "Animation duration", min.time, max.time, default.time),
          selectInput("type", "Animation type", c("relative", "absolute"), "relative"),
          selectInput("sizeAttribute", "Size attribute", c("none", colnames(eventlog)), "none"),
          selectInput("colorAttribute", "Color attribute", c("none", colnames(eventlog)), "none"),
          selectInput("orientation", "Orientation", c("horizontal"="LR", "vertical"="TB"), "horizontal")
        ),

        mainPanel(
          width = 10,
          shinycssloaders::withSpinner(processanimaterOutput("process"))
        )
      )
    )
  }

  server <- function(session, input, output) {

    data <- reactive({

      if (input$colorAttribute != "none") {
        attr <- rlang::sym(input$colorAttribute)
        val <- eventlog %>% pull(!!attr)
        if (is.character(val) || is.factor(val)) {
          eventlog <- eventlog %>%
            add_token_color(input$colorAttribute, "color",
                            color_mapping = scales::col_factor("YlOrBr", val, na.color = "red"))
        } else if (is.logical(val)) {
          eventlog <- eventlog %>%
            add_token_color(input$colorAttribute, "color",
                            color_mapping = scales::col_factor(c("green", "orange"), levels = c(T,F), na.color = "red"))
        } else { #fallback to numeric
          eventlog <- eventlog %>%
            mutate(!!attr := as.numeric(!!attr)) %>%
            add_token_color(input$colorAttribute, "color")
        }
      }

      if (input$sizeAttribute != "none") {
        # TODO implement strategy for non-numeric attributes
        attr <- rlang::sym(input$sizeAttribute)
        val <- eventlog %>% pull(!!attr)
        if (is.numeric(val)) {
          eventlog <- eventlog %>%
            mutate(!!attr := as.numeric(!!attr)) %>%
            add_token_size(input$sizeAttribute, "size")
        } else {
          warning("Trying to use a non-numeric attribute for the token size!")
          eventlog <- eventlog %>%
            mutate(size = 6)
        }
      }

      eventlog

    })

    output$process <- renderProcessanimater(expr = {
      model <- process_map(data(), render = F) %>%
          DiagrammeR::add_global_graph_attrs(attr = "rankdir", value = input$orientation, attr_type = "graph")
      if (input$sizeAttribute != "none" && input$colorAttribute != "none") {
        animate_process(data(), model,
                        animation_mode = input$type,
                        token_size = "size",
                        token_color = "color",
                        animation_duration = input$duration)
      } else if (input$sizeAttribute != "none") {
        animate_process(data(), model,
                        animation_mode = input$type,
                        token_size = "size",
                        animation_duration = input$duration)

      } else if (input$colorAttribute != "none") {
        animate_process(data(), model,
                        animation_mode = input$type,
                        token_color = "color",
                        animation_duration = input$duration)
      } else {
        animate_process(data(), model,
                        animation_mode = input$type,
                        animation_duration = input$duration)
      }

    })

  }

  shinyApp(ui, server)

}
