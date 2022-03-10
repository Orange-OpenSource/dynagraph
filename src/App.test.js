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

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
