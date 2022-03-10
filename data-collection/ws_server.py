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
:synopsis: WS server that sends messages at random intervals. Part of the DynaGraph project.
"""

import asyncio
import datetime
import random
import websockets
import json

import logging
logger = logging.getLogger('websockets')
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


async def time(websocket, path):
    while True:
        now = datetime.datetime.utcnow().isoformat() + "Z"
        data = json.dumps(
            {
                "source": random.randint(0, 25),
                "target": random.randint(0, 25),
                "time": now,
                "group": random.randint(1, 5),
                "value": random.randint(1, 5)
            }
        )
        await websocket.send(data)
        await asyncio.sleep(random.random() * 3)

server_ip = "127.0.0.1"
server_port = 5678
start_server = websockets.serve(
    time,
    server_ip,
    server_port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
