#!/usr/bin/env python
# -*- coding: utf-8 -*-

#   Software Name : dynagraph
#   Version: 1.0.0
#   SPDX-FileCopyrightText: Copyright (c) 2021-2022 Orange
#   SPDX-License-Identifier: BSD-4-Clause
#
#   This software is distributed under the BSD-4-Clause,  the text of which is available at https://spdx.org/licenses/ or see the "LICENSE.txt" file for more details.
#
#   Author: Lionel TAILHARDAT
#   Software description: The DynaGraph framework: a system combining classical traces dumping tools (i.e. the tshark tool and Firefox's Network Monitor component) and a ReactJS web app for live 3D graph rendering of streamed graph data derived from traces.

"""
Created on Sep 2021
@author: Lionel Tailhardat
:synopsis: WS server that sends messages from CSV-formatted tshark output. Part of the DynaGraph project.
"""

# =============================================================================
# Imports

import argparse
import asyncio
import websockets
import json
import sys
import os

import logging

# =============================================================================

home = os.path.expanduser("~")
destdir_default = home

serverIP_default = "127.0.0.1"
serverPort_default = 5678

separator_default = ","
ending_text_default = "q"
keys = ["wsColNo", "wsColTime", "source", "target", "wsColProtocol", "wsColLength", "wsColInfo"]
do_strip_default = True

logBaseName = "orange.dynagraph.ws-stdin"
logFileName = logBaseName + ".log"

sUsage_description = "Sending tshark CSV-formatted data from stdin with WebSockets server."
sUsage_exec = r"python3 .\ws_server_stdin.py -h"

parser = argparse.ArgumentParser(
    description=sUsage_description,
    epilog="Example: " + "\n" + sUsage_exec + "\n",
)

parser.add_argument(
    "--serverIP",
    action="store",
    default=serverIP_default,
    help="IP adress of WebSockets server (default : '%s')" % serverIP_default,
)

parser.add_argument(
    "--serverPort",
    type=int,
    action="store",
    default=serverPort_default,
    help="Port of WebSockets server (default : '%s')" % serverPort_default,
)

parser.add_argument(
    "--stdinSeparator",
    action="store",
    default=separator_default,
    help="Stdin value separator (default : '%s')" % separator_default,
)

parser.add_argument(
    "--stdinStrip",
    action="store",
    default=do_strip_default,
    help="Strip stdin lines (default : '%s')" % do_strip_default,
)

parser.add_argument(
    "--stdinStop",
    action="store",
    default=ending_text_default,
    help="Special char to stop processing whenever found (default : '%s')" % ending_text_default,
)

parser.add_argument(
    "--log",
    type=int,
    choices=[10, 20, 30, 40, 50],
    action="store",
    default=20,
    help="Log verbosity level (default: INFO) : DEBUG = 10, INFO = 20, WARNING = 30, ERROR = 40, CRITICAL = 50",
)

# Arguments parsing
args = parser.parse_args()

# =============================================================================
# Logger creation
loggingFormatString = (
    "%(asctime)s:%(levelname)s:%(threadName)s:%(funcName)s:%(message)s"
)
logging.basicConfig(format=loggingFormatString, level=args.log)

logger = logging.getLogger('websockets')
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())

# =============================================================================

logging.info("INIT:keys='%s'", keys)
logging.info("INIT:ending_text='%s':separator='%s':do_strip=%s",
             args.stdinStop,
             args.stdinSeparator,
             str(args.stdinStrip))
logging.info("INIT:CAPTURE:STARTED")


# =============================================================================
# TODO: allow enable/disable suppress double quotes, allow to change char
# TODO: allow suppress trailing spaces from values

async def time(websocket, path):
    for line in sys.stdin:
        if args.stdinStop == line.rstrip():
            break

        # Clean and split
        line = line.rstrip('\n')
        values = line.split(sep=args.stdinSeparator)

        if args.stdinStrip:
            values = [i.strip('"') for i in values]

        # Map values to keys
        line_dict = {k: v for k, v in zip(keys, values)}
        # TODO: allow skipping a line when it doesn't exactly correspond to key schema

        # Convert to json
        data = json.dumps(line_dict)

        # Send to WS
        await websocket.send(data)
        logging.debug("CAPTURE:line='%s':line_dict='%s'", line, line_dict)

# =============================================================================
# Start server and processing loop
start_server = websockets.serve(
    time,
    args.serverIP,
    args.serverPort)
logging.info(
    "SERVER:serverIP=%s:serverPort=%s:message=%s",
    args.serverIP,
    args.serverPort,
    "server instanciated, starting processing loop, press Ctrl-C or send the '" + args.stdinStop + "' char to stop ...")

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

logging.info("END")
