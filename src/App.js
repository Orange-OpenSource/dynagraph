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

import React, {Component, useEffect, useRef, useCallback, useState} from 'react';
import Select from 'react-dropdown-select';  // https://www.npmjs.com/package/react-dropdown-select
import { FilePicker } from 'react-file-picker';  // Source: https://www.npmjs.com/package/react-file-picker
import ForceGraph3D from "react-force-graph-3d";
import SimpleReactValidator from 'simple-react-validator';  // See: https://www.npmjs.com/package/simple-react-validator
import { w3cwebsocket as W3CWebSocket } from "websocket";

// ============================================================================

const PROCESSING_REFS = [
    {
        processingName: "None (clear)",
        processingId: 0
    },
    {
        processingName: "WS jSG",
        processingId: 1
    },
    {
        processingName: "File jSG",
        processingId: 4
    },
]

const ALERT_STYLES = {
    success: "alert alert-success",
    info: "alert alert-info",
    warning: "alert alert-warning",
    danger: "alert alert-danger"
}

const WSALERT_MESSAGES = {
    opened: {
        type: "success",
        text: "WS connected."
    },
    closed: {
        type: "info",
        text: "WS closed."
    },
    closed_reconnecting: {
        type: "warning",
        text: "WS closed, trying to (re)connect ..."
    },
    error: {
        type: "danger",
        text: "WS with error.",
    }
}

// ============================================================================

function Alert({type, message}) {
    return (
        <div className={ALERT_STYLES[type]} role="alert">
            <span className="alert-icon"><span className="visually-hidden">Notification</span></span>
            <p>{message}</p>
        </div>
    )
}


function NodeFocusSelect(props) {
    return <div className="container p-3">
        <Select
            backspaceDelete={false}
            dropdownPosition="auto"
            keepSelectedInList={true}
            labelField="id"
            onChange={props.onChange}
            options={props.graph.nodes}
            placeholder="Select a node to focus on ..."
            valueField="id"
            searchable={true}
        />
    </div>;
}


// ============================================================================

function BasicForceGraph3D(props) {
    return <ForceGraph3D
        ref={props.graphRef}

        enableNodeDrag={true}
        nodeLabel="id"
        graphData={props.graphData}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeAutoColorBy="group"

        width={props.width}
        height={props.height}

        onNodeClick={props.graphOnNodeClick}

    />;
}

// ============================================================================

function crossLinkingNodes(graph) {
    // cross-link node objects
    const clonedGraph = {
        nodes: [...graph.nodes],
        links: [...graph.links],
    };
    console.log("crossLinkingNodes graph: " + graph);
    // console.log(graph);
    console.log("crossLinkingNodes clonedGraph: " + clonedGraph);
    // console.log(clonedGraph);

    clonedGraph.links.forEach(link => {
        console.log(link)
        const aIndex = clonedGraph.nodes.findIndex( ({ id }) => id === link.source );
        const bIndex = clonedGraph.nodes.findIndex( ({ id }) => id === link.source );
        console.log(aIndex)
        console.log(bIndex)
        const a = clonedGraph.nodes[aIndex];
        const b = clonedGraph.nodes[bIndex];
        console.log("crossLinkingNodes a: " + a);
        !a.neighbors && (a.neighbors = []);
        !b.neighbors && (b.neighbors = []);
        a.neighbors.push(b);
        b.neighbors.push(a);
    });
    return clonedGraph;
    // this.setState({
    //     graph: {
    //         nodes: clonedNodes,
    //         links: [...this.state.graph.links],
    //     }
    // });
}

function HighlightGraph3D(props) {
    const NODE_R = 8;

    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);

    const updateHighlight = () => {
        setHighlightNodes(highlightNodes);
        setHighlightLinks(highlightLinks);
    };

    const handleNodeHover = node => {
        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
            highlightNodes.add(node);
            node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
            node.links.forEach(link => highlightLinks.add(link));
        }

        setHoverNode(node || null);
        updateHighlight();
    };

    const handleLinkHover = link => {
        highlightNodes.clear();
        highlightLinks.clear();

        if (link) {
            highlightLinks.add(link);
            highlightNodes.add(link.source);
            highlightNodes.add(link.target);
        }

        updateHighlight();
    };

    const paintRing = useCallback((node, ctx) => {
        // add ring just for highlighted nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R * 1.4, 0, 2 * Math.PI, false);
        ctx.fillStyle = node === hoverNode ? 'red' : 'orange';
        ctx.fill();
    }, [hoverNode]);

    return <ForceGraph3D
        enableNodeDrag={false}
        nodeLabel="id"
        graphData={props.graphData}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeAutoColorBy="group"

        width={props.width}
        height={props.height}

        nodeRelSize={NODE_R}
        autoPauseRedraw={false}
        linkWidth={link => highlightLinks.has(link) ? 5 : 1}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 4 : 0}
        nodeCanvasObjectMode={node => highlightNodes.has(node) ? 'before' : undefined}
        nodeCanvasObject={paintRing}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
    />;
}

/**
 * Basic integration of the orbiting 3D graph
 * This function will be transformed to follow the HOC pattern upon BasicForceGraph3D
 * See: https://github.com/vasturiano/react-force-graph/blob/master/example/camera-auto-orbit/index.html
 * See: https://www.robinwieruch.de/react-higher-order-components
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
function OrbitingForceGraph3D(props) {
    const fgRef = useRef();
    const distance = 1400;

    useEffect(() => {
        fgRef.current.cameraPosition({ z: distance });

        // camera orbit
        let angle = 0;
        setInterval(() => {
            fgRef.current.cameraPosition({
                x: distance * Math.sin(angle),
                z: distance * Math.cos(angle)
            });
            angle += Math.PI / 300;
        }, 10);
    }, []);

    return <ForceGraph3D
        ref={fgRef}

        enableNodeDrag={false}
        nodeLabel="id"
        graphData={props.graphData}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeAutoColorBy="group"

        width={props.width}
        height={props.height}

        enableNavigationControls={false}
        showNavInfo={false}

    />;
}

function saveJsonToPC(jsonData,filename) {
    const fileData = JSON.stringify(jsonData);
    const blob = new Blob([fileData], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.json`;
    link.href = url;
    link.click();
}

// ============================================================================

function WSJSGInfo(props) {
    const message = WSALERT_MESSAGES[props.ws_statusType].text + " Graph has " + props.graph.nodes.length + " nodes and " + props.graph.links.length + " links. Link (" + props.dataFromServer.source + ")=>(" + props.dataFromServer.target + ") received.";
    return <Alert type={WSALERT_MESSAGES[props.ws_statusType].type} message={message}/>;
}


class RenderBlockWSJSG extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ws: null,
            ws_statusType: "closed_reconnecting",
            dataFromServer: { "source": 0, "target": 0},

            graph: { nodes: [], links: [] },

            graphDisplayWidth: null, //10, //window.innerWidth * 0.8,
            graphDisplayHeight: window.innerHeight * 0.7,
        };

        /**
         * Declare a client variable for future WebSocket object sharing across methods
         * @type {null}
         */
        this.client = null;

        // Store a reference to Graph container for width/height adjustment of ForceGraph3D component + future usage
        // see: https://reactjs.org/docs/refs-and-the-dom.html#callback-refs
        this.graphContainerElement = null;
        this.setGraphContainerRef = element => {
            this.graphContainerElement = element;
            if (element != null) {
                this.setState({
                    graphDisplayWidth: element.getBoundingClientRect().width,
                    graphDisplayHeight: element.getBoundingClientRect().height
                });
            }
        };

        /**
         * Declare a graphElement variable for future Graph rendering control across methods
         * @type {null}
         */
        this.graphElement = null;
    }

    /**
     * @function addNode
     * Check if a given node (id) already exists in tre graph, then add it if not found.
     */
    addNode(id1, group1) {
        const node_indexOfResult = this.state.graph.nodes.findIndex( ({ id }) => id == id1 );
        if (node_indexOfResult < 0) {
            const clonedNodes = [...this.state.graph.nodes];
            let newNode = {};
            newNode["id"] = id1;
            newNode["group"] = group1;
            clonedNodes.push(newNode);
            this.setState({
                graph: {
                    nodes: clonedNodes,
                    links: [...this.state.graph.links],
                }
            });
            // console.log('Node (' + id1 + ') created ...');
        } else {
            // console.log('Node (' + id1 + ') already exists, skipped ...');
        }
    };

    /**
     * @function addLink
     * Check if a given link (source, target) already exists in tre graph, then add it if not found.
     */
    addLink(id1, id2, value) {
        const link_indexOfResult = this.state.graph.links.findIndex( ({ source, target }) => { return (source.id === id1) & (target.id === id2) } );
        if (link_indexOfResult < 0) {
            const newLinks = [...this.state.graph.links];
            let linkToAdd = {};
            linkToAdd["source"] = id1;
            linkToAdd["target"] = id2;
            linkToAdd["value"] = value;
            newLinks.push(linkToAdd);
            this.setState({
                graph: {
                    nodes: [...this.state.graph.nodes],
                    links: newLinks,
                }
            });
            // console.log('Link (' + id1 + ')-[' + value + ']->(' + id2 + ') created ...');
        } else {
            // console.log('Link (' + id1 + ')->(' + id2 + ') already exists, skipped ...');
        }
    };

    componentDidMount() {
        this.connect();
    };

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        if (this.props.connectIntent !== prevProps.connectIntent) {
            if (this.props.connectIntent) {
                // User asked "Connect"
                this.connect();

            } else {
                // User asked "Disconnect"
                this.client.close();
            }
        }
    }


    /**
     * @function connect
     * This function establishes the connection with the websocket and handle incoming messages
     * Periodic reconnection is triggered if connection closes
     */
    connect = () => {
        // let client = new W3CWebSocket(this.props.uri);
        this.client = new W3CWebSocket(this.props.uri);
        let timeout = 250; // Initial timeout duration as a class variable
        let connectInterval;

        this.client.onopen = () => {
            console.log('WebSocket Client Connected');

            this.setState({
                ws: this.client,
                ws_statusType: "opened",
            });

            timeout = 250; // reset timer to 250 on open of websocket connection
            clearTimeout(connectInterval); // clear Interval on on open of websocket connection

        };

        this.client.onclose = e => {
            if (this.props.connectIntent) {
                // Connexion is down though user wishes to be connected: try to reconnect ...
                console.log(
                    `Socket is closed. Reconnect will be attempted in ${Math.min(
                        10000 / 1000,
                        (timeout + timeout) / 1000
                    )} second.`,
                    e.reason
                );
                this.setState({
                    ws_statusType: "closed_reconnecting",
                });

                timeout = timeout + timeout * 0.5; //increment retry interval
                connectInterval = setTimeout(this.check, Math.min(10000, timeout)); //call check function after timeout
            } else {
                // Connexion is down and user asked Disconnect or do not wishes to be connected: do nothing.
                console.log(
                    `Socket is closed.`,
                    e.reason
                );
                this.setState({
                    ws_statusType: "closed",
                });
            }
        };

        this.client.onerror = err => {
            console.error(
                "Socket encountered error: ",
                err.message,
                "Closing socket"
            );
            this.setState({
                ws_statusType: "error",
            });
            this.client.close();
        };

        this.client.onmessage = (message) => {
            const message_data = JSON.parse(message.data);
            this.setState({dataFromServer: message_data});
            const received_source = message_data["source"];
            const received_target = message_data["target"];
            const received_sourceGroup = message_data["sourceGroup"] ? message_data["sourceGroup"] : 0;
            const received_targetGroup = message_data["targetGroup"] ? message_data["targetGroup"] : 0;
            const received_value = message_data["value"] ? message_data["value"] : 0;
            this.addNode(received_source, received_sourceGroup);
            this.addNode(received_target, received_targetGroup);
            this.addLink(received_source, received_target, received_value);
        };

    };

    /**
     * utilited by the @function connect to check if the connection is close, if so attempts to reconnect
     * WebSocket reconnect source: see https://dev.to/finallynero/using-websockets-in-react-4fkp
     */
    check = () => {
        const { ws } = this.state;
        if (!ws || ws.readyState == WebSocket.CLOSED) this.connect(); //check if websocket instance is closed, if so call `connect` function.
    };


    /**
     * Change this.graphElement camera positon to focus on node.
     * See: https://github.com/vasturiano/react-force-graph/blob/master/example/click-to-focus/index.html
     * In constructor, initialize as follows:
     *   this.graphElement = null;
     * Then, the BasicForceGraph3D must be configured with the following arguments:
     *   graphRef={el => this.graphElement = el}
     *   graphOnNodeClick={this.handleClick}
     * @param node
     */
    handleClick = (node) => {
        // Aim at node from outside it
        const distance = 40;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

        this.graphElement.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
        );
    }

    /**
     * onClick handler for saving graph data as jSon file
     * May not be responsive as it gets the full graph data with rendering details
     * Source: https://stackoverflow.com/a/62128055
     */
    handleSaveButtonClick = () => {
        saveJsonToPC(this.state.graph, "dynagraphData");
    }

    render() {
        return (
            <div className="container-fluid p-3 rounded" id="RenderBlockWSJSG">
                <WSJSGInfo
                    ws_statusType={this.state.ws_statusType}
                    graph={this.state.graph}
                    dataFromServer={this.state.dataFromServer}
                />
                <div className="border bg-light" id="graphContainer" ref={this.setGraphContainerRef}>
                    <BasicForceGraph3D
                        graphRef={el => this.graphElement = el}

                        graphData={this.state.graph}

                        width={this.state.graphDisplayWidth}
                        height={this.state.graphDisplayHeight}

                        graphOnNodeClick={this.handleClick}
                />
                </div>
                <NodeFocusSelect onChange={(values) => this.handleClick(values[0])} graph={this.state.graph}/>

                <div className="container">
                    <button className="btn btn-secondary text-nowrap" type="button" onClick={this.handleSaveButtonClick}>Save data</button>
                </div>
            </div>
        );
    }
}

// return (
//     <div className="container-fluid p-3 rounded" id="RenderBlockWSJSG">
//         <WSJSGInfo
//             ws_statusType={this.state.ws_statusType}
//             graph={this.state.graph}
//             dataFromServer={this.state.dataFromServer}
//         />
//         <div className="border bg-light" id="graphContainer" ref={this.setGraphContainerRef}>
//             <BasicForceGraph3D graphData={this.state.graph} width={this.state.graphDisplayWidth}
//                                height={this.state.graphDisplayHeight}/>
//         </div>
//     </div>
// );


const ConnectButton = ({state, handler}) => {
    return (
        <button className="btn btn-primary text-nowrap" type="button" onClick={handler}>{state ? 'Disconnect' : 'Connect'}</button>
    )
}

function UriInput(props) {
    if (!props.disabled) {
        return (
            <input className="form-control me-3"
                   id="uriInput"
                   onChange={props.onChange}
                   placeholder="URI (e.g. ws://127.0.0.1:5678/)"
                   aria-label="URI"
                   aria-describedby="uriInputHelp"/>)
    } else {
        return (
            <input className="form-control me-3"
                   type="search"
                   onChange={props.onChange}
                   placeholder="URI (e.g. ws://127.0.0.1:5678/)"
                   aria-label="URI"
                   disabled/>
        );
    }
}


class ProcBlockWSJSG extends Component {

    constructor(props) {
        super(props);

        this.state = {
            uri: null,
            uriValid: false,
            connectIntentBool: false,
            connectIntentCount: 0,
        };

        this.validator = new SimpleReactValidator({
            validators: {
                wsip: {  // name the rule
                    message: 'The :attribute must be a valid IP address and must be :values.',
                    rule: (val, params, validator) => {
                        return validator.helpers.testRegex(val,
                            /^ws:\/\/(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}(:(\d{1,4}))?(\/.*)?/i
                        ) && params.indexOf(val) === -1
                    }
                }
            }
        });
    }


    /**
     * @function handleUriInput
     * Delegated function for updating the `uri` state
     */
    handleUriInput = event => {
        this.validator.message('uri', event.target.value, 'required|wsip')
        if (this.validator.fieldValid('uri')) {
            // console.log("URI validation: '" + event.target.value + "' is valid.")
            this.setState({
                    uri: event.target.value,
                    uriValid: true,
            });
        } else {
            this.setState({
                uriValid: false,
            });
        //     console.log("URI validation: '" + event.target.value + "' is NOT valid.")
        }
    };


    /**
     * @function handleConnectButton
     * Callback function for connectIntentBool state toggle
     * connectIntentCount is increased (if URI is valid) in order to trigger @function conditionedWSComponent
     */
    handleConnectButton = () => {
        if (this.state.uri && this.state.uriValid) {
            console.log("WS connect user intent: switching to '" + !this.state.connectIntentBool + "' with URI = '" + this.state.uri + "'.")
            const connectIntentIncrement = !this.state.connectIntentBool ? 1 : 0;
            this.setState({
                connectIntentBool: !this.state.connectIntentBool,
                connectIntentCount: this.state.connectIntentCount + connectIntentIncrement,
            })
        } else {
            console.log("WS connect user intent: dismissed, URI is null/empty/not-valid.")
        }
    }


    /**
     * @function invalidMessage
     * Conditioned rendering of an "invalid URI" alert
     */
    invalidMessage = (isValid) => {
        if (isValid) {
            return null;
        } else {
            return <pre id="uriInputHelp" className="form-text">Please enter a valid URI.</pre>;
        }
    }


    /**
     * @function handleConnectButton
     * Conditioned rendering of the RenderBlockWSJSG component.
     * This prevent first initialization of websocket with insufficient parameters.
     * Greeting and help message is returned by default.
     */
    conditionedWSComponent = () => {
        if ((this.state.uri) && (this.state.connectIntentCount > 0)) {
            return <RenderBlockWSJSG uri={this.state.uri} connectIntent={this.state.connectIntentBool}/>
        } else {
            return (
                <div className="container bg-light p-3 rounded" id="conditionedWSComponent">
                    <h1>Willing to connect to a WebSocket ? ...</h1>
                    <p className="lead">Please enter a WebSocket URI in the input box above and then click on the <i>Connect</i> button. Graph rendering will start as soon as connexion is established and data received.</p>
                </div>
            )
        }
    }


    render() {
        return(
            <div id="ProcBlockWSJSG">
                <div className="container p-3">
                    <form className="d-flex">
                        <UriInput onChange={this.handleUriInput} disabled={this.state.connectIntentBool}/>
                        <ConnectButton state={this.state.connectIntentBool} handler={this.handleConnectButton}/>
                    </form>
                    {this.invalidMessage(this.state.uriValid)}
                </div>
                {this.conditionedWSComponent()}
            </div>
        )
    }
}

// ============================================================================

class RenderBlockFileJSG extends Component {
    constructor(props) {
        super(props);

        this.state = {
            graph: null,

            graphDisplayWidth: null, //10, //window.innerWidth * 0.8,
            graphDisplayHeight: window.innerHeight * 0.7,

            selectedNodeData: {}
        };


        /**
         * FileReader and its handler for data loading.
         * Triggered by this.fileReader.readAsText(this.props.file);
         */
        this.fileReader = new FileReader();  // https://developer.mozilla.org/en-US/docs/Web/API/FileReader
        this.fileReader.onload = event => {
            this.setState({ graph: JSON.parse(event.target.result) }, () => {
                console.log('Graph data loading with FileReader: done.');
            });
        };


        /**
         * @function setGraphContainerRef
         * Store a reference to Graph container for width/height adjustment of ForceGraph3D component + future usage
         * see: https://reactjs.org/docs/refs-and-the-dom.html#callback-refs
         */
        // TODO: fix updating as it currently do not react on window change.
        this.graphContainerElement = null;
        this.setGraphContainerRef = element => {
            this.graphContainerElement = element;
            if (element != null) {
                this.setState({
                    graphDisplayWidth: element.getBoundingClientRect().width,
                    graphDisplayHeight: element.getBoundingClientRect().height
                });
            }
        };

        /**
         * Reference to Graph object for future manipulations
         */
        this.graphElement = null;

    }

    componentDidMount() {
        if (!this.props.file) {
            // Skip loading process if no file object provided
            console.log('Fetching file: no file object provided !');
        } else {
            // Load file content
            console.log('Fetching file: ' + this.props.file.name);
            this.fileReader.readAsText(this.props.file);
        }
    }


    /**
     * @function fileStatusMessage
     * Helper function to generate a human-friendly text about current graph's statistics.
     * @returns {JSX.Element|string}
     */
    fileStatusMessage = () => {
        if (!this.state.graph) {
            return "No data to summarize from " + this.props.file.name + " !";
        } else {
          return (
              <div>
                  <i>{this.props.file.name}</i> file loaded. {this.state.graph.nodes.length} nodes, {this.state.graph.links.length} links.
              </div>
          )
        }
    }


    /**
     * Change this.graphElement camera positon to focus on node.
     * See: https://github.com/vasturiano/react-force-graph/blob/master/example/click-to-focus/index.html
     * In constructor, initialize as follows:
     *   this.graphElement = null;
     * Then, the BasicForceGraph3D must be configured with the following arguments:
     *   graphRef={el => this.graphElement = el}
     *   graphOnNodeClick={this.handleClick}
     * @param node
     */
    handleClick = (node) => {
        // Aim at node from outside it
        const distance = 40;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

        this.graphElement.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
        );
    }

    /**
     * onClick handler for saving graph data as jSon file
     * May not be responsive as it gets the full graph data with rendering details
     * Source: https://stackoverflow.com/a/62128055
     */
    handleSaveButtonClick = () => {
        saveJsonToPC(this.state.graph, "dynagraphData");
    }

    render() {
        if (!this.state.graph) {
            // Skip rendering if no graph data is available yet
            return null;
        } else {
            // Provide rendering and info components
            return (
                <div className="container-fluid p-3 rounded" id="RenderBlockFileJSG">
                    <div className="container">
                        <Alert type="success" message={this.fileStatusMessage()}/>
                    </div>
                    <div className="border bg-light" id="graphContainer" ref={this.setGraphContainerRef}>
                        <BasicForceGraph3D
                            graphRef={el => this.graphElement = el}
                            graphData={this.state.graph}
                            width={this.state.graphDisplayWidth}
                            height={this.state.graphDisplayHeight}
                            graphOnNodeClick={this.handleClick}
                        />
                    </div>
                    <NodeFocusSelect onChange={(values) => this.handleClick(values[0])} graph={this.state.graph}/>

                    <div className="container">
                        <button className="btn btn-secondary text-nowrap" type="button" onClick={this.handleSaveButtonClick}>Save data</button>
                    </div>
                </div>
            )
        }
    }
}

class ProcBlockFileJSG extends Component {
    constructor(props) {
        super(props);

        this.state = {
            file: null,
        };
    }

    handleFileSelected = (FileObject) => {
        this.setState({file: FileObject})
    }

    render() {
        if (!this.state.file) {
            return (
                <div class="container bg-light p-3 rounded" id="ProcBlockFileJSG">
                    <h1>jSon Graph (jSG) file processing ...</h1>
                    <p className="lead">Please click button below to pick a jSon Graph file to render from your computer.</p>
                    <FilePicker
                        extensions={['json']}
                        onChange={ FileObject => (
                            this.handleFileSelected(FileObject)
                        ) }
                        onError={ errMsg => ( console.log('File jSG FilePicker err: ' + errMsg) ) }
                    >
                        <button className="btn btn-primary text-nowrap" type="button">Open jSG file ...</button>
                    </FilePicker>
                </div>
            )
        } else {
            return (<RenderBlockFileJSG file={this.state.file}/>);
        }
    }

}

// ============================================================================

function ProcessingBlockRouter({processingSelected}) {
    if (!processingSelected) {
        return (
                <div className="container bg-light p-5 rounded" id="ProcessingBlockRouter">
                    <h1>Welcome to <i>DynaGraph</i></h1>
                    <p className="lead">Select a data processing method from the drop-down menu (top-right) to start using the DynaGraph app ...</p>
                </div>

            )
    } else {
        switch (processingSelected.processingId) {
            case 0:
                return <div className="container" id="ProcessingBlockRouter"><Alert type="warning" message={processingSelected.processingName + " - Not implemented yet (sorry)"}/></div>;
            case 1:
                return <ProcBlockWSJSG/>;
            case 4:
                return <ProcBlockFileJSG/>;
            default:
                return null;
        }
    }
}

// ============================================================================

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            processingSelected: null,
            processingIdSelected: null,
        };
    }

    onSelectChange = (value) => {
        console.log('User processing selection: ' + value[0].processingName);
        this.setState({
            processingSelected: value[0],
            processingIdSelected: value[0].processingId
        })
    }

    render() {
        return (
            <div className="App">
                <div className="container" role="navigation">
                    <header className="d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom">
                        <a href="/"
                           className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-dark text-decoration-none">
                            <svg className="bi me-2" width="40" height="32">
                                <use xlinkHref="#boosted"/>
                            </svg>
                            <span className="fs-4">DynaGraph</span>
                        </a>

                        <Select
                            className="d-flex justify-content-left"
                            keepSelectedInList={true}
                            labelField="processingName"
                            onChange={(values) => this.onSelectChange(values)}
                            options={PROCESSING_REFS}
                            placeholder="Select a data processing method ..."
                            valueField="processingId"
                        />
                    </header>
                </div>
                <ProcessingBlockRouter processingSelected={this.state.processingSelected}/>
            </div>
        );
    }
}

export default App;
