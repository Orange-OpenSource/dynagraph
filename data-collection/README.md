# DynaGraph / data-collection

A set of light WebSocket servers for sending graph data to the DynaGraph app.

## Requirements

*Optional*: activate [Virtual Environment](https://python.land/virtual-environments/virtualenv) (from project's root):
```shell
source venv/bin/activate
```

Install *pyws* requirements:
```shell
# From pyws' directory
pip install -r ./requirements.txt
```

## Usage

Call individual scripts from CLI depending on needs:
* `ws_server.py`: a WS server that sends json messages at random intervals,
* `ws_server_stdin.py`: a WS server that gets data from stdin coming from [TShark](https://www.wireshark.org/docs/man-pages/tshark.html) and sends them as json,
    ```shell
    # Capture net traffic, export data as CSV, transform it to json, send it
    # Press Ctrl-C to stop the process
    tshark -T fields -l -E separator=, -E quote=d \
      -e _ws.col.No. -e _ws.col.Time \
      -e _ws.col.Source -e _ws.col.Destination \
      -e _ws.col.Protocol -e _ws.col.Length -e _ws.col.Info | \
      python ws_server_stdin.py
    ```

    In order to be more specific on TShark capture behavior, a *capture filter* can be set with the `-f` commutator.
    See [CaptureFilters](https://gitlab.com/wireshark/wireshark/-/wikis/CaptureFilters) documentation for syntax insights and example below:
  
    ```shell
    # Capture net traffic, export data as CSV, transform it to json, send it
    # Press Ctrl-C to stop the process
    tshark -T fields -l -E separator=, -E quote=d \
      -e _ws.col.No. -e _ws.col.Time \
      -e _ws.col.Source -e _ws.col.Destination \
      -e _ws.col.Protocol -e _ws.col.Length -e _ws.col.Info \
      -f "ip" | \
      python ws_server_stdin.py
    ```
    One can also wish to send traffic data from a pcapng file. Thereon, the `tshark` will use the `-r` commutator:
    ```shell
    # Capture net traffic, export data as CSV, transform it to json, send it
    # Press Ctrl-C to stop the process
    tshark -T fields -l -E separator=, -E quote=d \
      -e _ws.col.No. -e _ws.col.Time \
      -e _ws.col.Source -e _ws.col.Destination \
      -e _ws.col.Protocol -e _ws.col.Length -e _ws.col.Info \
      -r ../samples/open_github_wireshark_2021-09-04_16-52-21.pcapng | \
      python ws_server_stdin.py
    ```
  ... Firefox and Chrome can export TLS keys **for later decryption** by wireshark or TShark (i.e. no live decryption).
  See "[Decrypting SSL/TLS traffic with Wireshark](https://resources.infosecinstitute.com/topic/decrypting-ssl-tls-traffic-with-wireshark/)" and "[TShark TLS Encrypted](https://tshark.dev/export/export_tls/)" for operational details.
  As a quick hint, call Firefox, after the capture setup, with `SSLKEYLOGFILE=~/.ssl-key.log firefox` for keys exports (*don't forget to delete the file for security purposes*).
  
* `ws_server_har.py`: a WS server that parse a HAR file for 3 facets (Browser=>URL, URL=>Server, Browser=>Server) and sends data as json,

```shell
tshark -Q -a duration:30 \
  -f "tcp port http or https" \
  -w /tmp/http_https_netsniff.pcapng
   & \
  SSLKEYLOGFILE=/tmp/ssl-key.log firefox
```

```shell
# Capture net traffic, export data as CSV, transform it to json, send it
# Press Ctrl-C to stop the process
tshark -T fields -l -E separator=, -E quote=d \
  -e _ws.col.No. -e _ws.col.Time \
  -e _ws.col.Source -e _ws.col.Destination \
  -e _ws.col.Protocol -e _ws.col.Length -e _ws.col.Info \
  -o tls.keylog_file:/tmp/.ssl-key.log \
  -r /tmp/http_https_netsniff.pcapng
   
   | \
  python ws_server_stdin.py
```

```shell
tshark -Q --export-objects http,/tmp/obj -r /tmp/myfile.pcapng \
-o tls.keylog_file:$SSLKEYLOGFILE
```

Unless using modified scripts, the WS is served at `ws://127.0.0.1:5678`.

## HTTP Archive files (HAR)

As an alternative to network traffic sniffing (e.g. tshark, tcpflow, tcpdump, etc.), because of TLS encryption or any other reason, browsing activity can be analyzed through HAR dumps.

The [Haralyzer](https://github.com/haralyzer/haralyzer) package allows for HAR file parsing in Python.


## Debug

If using the Firefox web browser, the [WebSocket Waesel](https://addons.mozilla.org/fr/firefox/addon/websocket-weasel/) add-on can be of great help.
After its installation, open the add-on and connect to the WS (e.g. `ws://127.0.0.1:5678`).
