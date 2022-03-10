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
:synopsis: WebSockets server sending messages based on a HAR file content. Part of the DynaGraph project.
"""

# =============================================================================
# Imports

import argparse
import os
import json
from dateutil import parser as dtparser, utils
import datetime
import logging

import asyncio
import websockets

from haralyzer import HarParser, HarPage

# =============================================================================

home = os.path.expanduser("~")
destdir_default = home

data_default = "../data-samples/localhost_Archive_21-09-07_00-12-20.har"  # TODO : handle local path when script is called from another dir

serverIP_default = "127.0.0.1"
serverPort_default = 5678

deltaThreshold_default = 50000
# microseconds=5           #   5 us
# microseconds=50          #   50 us
# microseconds=500         #   500 us
# microseconds=5000        #   5 ms
# microseconds=50000       #  50 ms
# microseconds=500000      # 500 ms
# microseconds=5000000     #   5 s
# microseconds=50000000    #  50 s
# microseconds=500000000   #  500 s

logBaseName = "orange.dynagraph.ws-har"
logFileName = logBaseName + ".log"

sUsage_description = "Sending HAR data with WebSockets server."
sUsage_exec = r"python3 .\ws_server_har2.py -h"

parser = argparse.ArgumentParser(
    description=sUsage_description,
    epilog="Example: " + "\n" + sUsage_exec + "\n",
)

parser.add_argument(
    "--data",
    action="store",
    default=data_default,
    help="Path to the local data file to load (default: '%s')" % data_default,
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
    "--deltaThreshold",
    type=int,
    action="store",
    default=deltaThreshold_default,
    help="Sampling period for data aggregation (default : '%s' [ms])" % deltaThreshold_default,
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

# =============================================================================
# Data loading
logging.info("INIT:filename='%s':loading...", args.data)
with open(args.data, 'r') as f:
    har_parser = HarParser(
        json.loads(f.read())
    )
logging.info("INIT:filename='%s':opened", args.data)

# Checking browser's name is set in HAR file
if 'browser' in har_parser.har_data.keys():
    general_source = har_parser.har_data['browser']['name']
else:
    general_source = "SomeBrowser"

# Setting the time bucket period
deltaThreshold = datetime.timedelta(
    microseconds=args.deltaThreshold
)
logging.info("INIT:deltaThreshold=%s", deltaThreshold)


# =============================================================================

async def time(websocket, path):  # TODO : make function reentrant
    lastTimeStamp = None

    for entry in har_parser.har_data["entries"]:
        if 'serverIPAddress' in entry.keys():

            currentTS = dtparser.parse(entry['startedDateTime'])
            if lastTimeStamp is None:
                lastTimeStamp = currentTS

            if not utils.within_delta(lastTimeStamp, currentTS, deltaThreshold):
                # TS old to TS new
                data = json.dumps(
                    {
                        "source": "%s_%s" % (general_source, lastTimeStamp.isoformat()),
                        "sourceGroup": "browser",
                        "target": "%s_%s" % (general_source, currentTS.isoformat()),
                        "targetGroup": "browser",
                        "time": entry['startedDateTime'],
                        "value": entry['time']
                    }
                )
                lastTimeStamp = currentTS
                await websocket.send(data)

            timed_general_source = "%s_%s" % (general_source, lastTimeStamp.isoformat())

            # Browser to ServerIP
            data = json.dumps(
                {
                    "source": timed_general_source,
                    "sourceGroup": "browser",
                    "target": entry['serverIPAddress'],
                    "targetGroup": "server",
                    "time": entry['startedDateTime'],
                    "value": entry['time']
                }
            )
            await websocket.send(data)

            # Browser to URL
            data = json.dumps(
                {
                    "source": timed_general_source,
                    "sourceGroup": "browser",
                    "target": entry['request']['url'],
                    "targetGroup": "url",
                    "time": entry['startedDateTime'],
                    "value": entry['time']
                }
            )
            await websocket.send(data)

            # URL to ServerIp
            data = json.dumps(
                {
                    "source": entry['request']['url'],
                    "target": entry['serverIPAddress'],
                    "time": entry['startedDateTime'],
                    "value": entry['time']
                }
            )
            await websocket.send(data)

        # Parsing reached EOF, we may close the loop.
        asyncio.get_event_loop().stop()

# =============================================================================
# Start server and processing loop
start_server = websockets.serve(
    time,
    args.serverIP,
    args.serverPort)
logging.info("SERVER:serverIP=%s:serverPort=%s:message=%s", args.serverIP, args.serverPort, "server instanciated, starting processing loop, press Ctrl-C to stop...")

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

logging.info("END")
