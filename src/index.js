/*
 *  Software Name : dynagraph
 *  Version: 1.0.0
 *  SPDX-FileCopyrightText: Copyright (c) 2021-2022 Orange
 *  SPDX-License-Identifier: BSD-4-Clause
 *
 *  This software is distributed under the BSD-4-Clause,  the text of which is available at https://spdx.org/licenses/ or see the "LICENSE.txt" file for more details.
 *
 *  Author: Lionel TAILHARDAT
 *  Software description: The DynaGraph framework: a system combining classical traces dumping tools (i.e. the tshark tool and Firefox's Network Monitor component) and a ReactJS web app for live 3D graph rendering of streamed graph data derived from traces.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
