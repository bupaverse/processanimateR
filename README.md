# processanimateR

> Flexible token replay animation for process maps

[![CRAN\_Status\_Badge](https://www.r-pkg.org/badges/version/processanimateR)](https://cran.r-project.org/package=processanimateR)
[![lifecycle](https://img.shields.io/badge/lifecycle-maturing-blue.svg)](https://www.tidyverse.org/lifecycle/#maturing)
[![Travis-CI Build Status](https://travis-ci.org/fmannhardt/processanimateR.svg?branch=master)](https://travis-ci.org/fmannhardt/processanimateR)

[![processanimateR example](man/figures/processanimateR-banner.png)](https://fmannhardt.github.io/processanimateR/example/processanimateR-banner.html)

Flexible token replay animation for process maps created through the [processmapR](https://github.com/gertjanssenswillen/processmapR/) package from the [bupaR](http://www.bupar.net) suite, which uses [DiagrammeR](https://github.com/rich-iannone/DiagrammeR/) and [viz.js](https://github.com/mdaines/viz.js) library to render process maps using GraphViz. 
ProcessanimateR adds a [htmlwidget](https://www.htmlwidgets.org/) that uses SVG animations ([SMIL](https://www.w3.org/standards/techs/smil#w3c_all)) to create the animation. 
Sizes, colors, and the image used for tokens are customizable based on trace, event attributes, or a secondary data frame if an attribute does not change according to the original event log.

## Getting Started

### Installing

A stable version of ProcessanimateR can be installed from CRAN:
```r
install.packages("processanimateR")
```

You can also use the development or specific released version by using the remotes package. 
Note that the current development version may break without warning. 
```r
# install the remotes package
source("https://install-github.me/r-lib/remotes")

# use remotes to install the latest version of processanimateR
remotes::install_github("fmannhardt/processanimateR")

# or install a specific tag
remotes::install_github("fmannhardt/processanimateR@v0.3.0")
```

### Warnings and Limitations
* Tokens travel through the process approximately according to the times at which (start and complete) events of the activities occur. In some cases processanimateR will add a small epsilon time to make sure that the SMIL animation works fine, since there seem to be some limitations with regard to zero duration animations. 
* Be aware that the perceived speed in which tokens travel depends on the length of edges in the process map, which is the result of an automatic layout algorithm and does not represent any kind of real distance between activities. 
* Parallelism is still handled poorly as to be expected from a process map. In particular overlapping start and completion times of activities may result in tokens moving unexpectedly.
* The timeline slider option cannot be used in Internet Explorer due to missing support for certain SVG animation functions.
* There are breaking changes in the API of this package between v0.3.0 and v1.0.0

### Usage

We use the `patients` event log provided by the `eventdataR` package. 
```r
library(processanimateR)
library(eventdataR)
```

A basic animation with static color and token size:
```r
animate_process(patients)
```

Default token color, size, or image can be changed as follows:
```r
animate_process(example_log, mapping = token_aes(size = token_scale(12), shape = "rect"))

animate_process(example_log, mapping = token_aes(color = token_scale("red")))
```

Tokens can also be assigned images, for example this Pacman GIF:
```r
animate_process(example_log,
   mapping = token_aes(shape = "image",
    size = token_scale(10),
    image = token_scale("https://upload.wikimedia.org/wikipedia/en/5/5f/Pacman.gif")))
```

Dynamic token colors or sizes based on event attributes can be configured. 
Based on `ordinal` scales:
```r
library(RColorBrewer)
animate_process(patients, 
                legend = "color", 
                mapping = token_aes(color = token_scale("employee", scale = "ordinal", range = RColorBrewer::brewer.pal(8, "Paired"))))
```
Based on `linear` scales:
```r
library(dplyr)
library(bupaR)
animate_process(sample_n(traffic_fines,1000) %>% filter_trace_frequency(percentage = 0.95),
                mode = "relative",
                legend = "color", 
                mapping = token_aes(color = token_scale("amount", scale = "linear", range = c("yellow","red"))))
```

Based on `time` scales (no legend yet):
```r
animate_process(patients, 
                legend = "color", 
                mapping = token_aes(color = token_scale("time", scale = "time", range = c("blue","red"))))
```

It is also possible to use a secondary data frame to color the tokens irregardless of the event times. This can be useful if measurement are taken throughout a process, but the measurement event itself should not be included in the process map. For example, the lactic acid measurements of the `sepsis` data could be used in that way: 
```r
library(dplyr)
library(bupaR)
# Extract only the lacticacid measurements
lactic <- sepsis %>%
    mutate(lacticacid = as.numeric(lacticacid)) %>%
    filter_activity(c("LacticAcid")) %>%
    as.data.frame() %>%
    select("case" = case_id, 
            "time" =  timestamp, 
            value = lacticacid) # format needs to be 'case,time,value'

# Remove the measurement events from the sepsis log
sepsisBase <- sepsis %>%
    filter_activity(c("LacticAcid", "CRP", "Leucocytes", "Return ER",
                      "IV Liquid", "IV Antibiotics"), reverse = T) %>%
    filter_trace_frequency(percentage = 0.95)

# Animate with the secondary data frame `lactic`
animate_process(sepsisBase, 
                mode = "relative", 
                duration = 300,
                legend = "color", 
                mapping = token_aes(color = token_scale(lactic, scale = "linear", range = c("#fff5eb","#7f2704"))))
```

### More usage examples:
* [Shiny application with processanimateR](articles/use-with-shiny.html)
* [Use processanimateR selection as Shiny inputs](articles/use-shiny-selections.html)

## Libraries Used
This package makes use of the following libraries:
* [bupaR](https://github.com/gertjanssenswillen/bupaR), for the base process mining functions in R.
* [viz.js](https://github.com/mdaines/viz.js), for the GraphViz layout;
* [d3](https://d3js.org), for SVG management;
* [d3-legend](https://github.com/susielu/d3-legend), to render D3 scales;
* [fakesmil](https://github.com/FakeSmile/FakeSmile), to provide SMIL support in most browsers;
* [svg-pan-zoom](https://github.com/ariutta/svg-pan-zoom), for the panning/zooming option;
* [MomentJS](https://github.com/moment/moment), for parsing and formatting times and durations;
* [Leaflet](https://leafletjs.com/), for rendering process maps on geographical maps.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/fmannhardt/processanimateR/tags). 

## Authors
Felix Mannhardt ([SINTEF Digital -- Technology Management Department](https://www.sintef.no/digital/))

## License

This software is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details

## Acknowledgments

This software was partly supported by the [HUMAN project](http://www.humanmanufacturing.eu/), which has received funding from the European Union's Horizon 2020 research and innovation programme under grant agreement no. 723737 (HUMAN)
