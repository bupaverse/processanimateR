context("test-issue-4-order.R")

test_that("patients example works", {
  library(eventdataR)
  data(patients)
  expect_silent(animate_process(patients))
})
