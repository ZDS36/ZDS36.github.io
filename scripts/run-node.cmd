@echo off
if defined npm_node_execpath (
  "%npm_node_execpath%" %*
) else (
  node %*
)
