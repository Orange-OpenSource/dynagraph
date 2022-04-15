#!/usr/bin/env bash

#
#  Software Name : dynagraph
#  Version: 1.0.0
#  SPDX-FileCopyrightText: Copyright (c) 2021-2022 Orange
#  SPDX-License-Identifier: BSD-4-Clause
#
#  This software is distributed under the BSD-4-Clause,  the text of which is available at https://spdx.org/licenses/ or see the "LICENSE.txt" file for more details.
#
#  Author: Lionel TAILHARDAT
#  Software description: The DynaGraph framework: a system combining classical traces dumping tools (i.e. the tshark tool and Firefox's Network Monitor component) and a ReactJS web app for live 3D graph rendering of streamed graph data derived from traces.
#

# Capture net traffic, export data as CSV, transform it to json, send it
# Press Ctrl-C to stop the process
tshark -T fields -l -E separator=, -E quote=d \
  -e _ws.col.No. -e _ws.col.Time \
  -e _ws.col.Source -e _ws.col.Destination \
  -e _ws.col.Protocol -e _ws.col.Length -e _ws.col.Info \
  -f "ip" | \
  python ws_server_stdin.py
