# rommey
A javascript Rommey game with a server.
You can drag pieces, and get black, blue, red, yellow pieces 1-13.

TODO:
- Check that pieces are placed in a "correct" position (e.g. 5,6,7 or 7,7,7 but not 5,6,6).
- Automatically calculate and display sum of selected items
- When drawing a stone, shouldn't place the stone on top of another stone.

# with server
start server + connect with client:

(in `rommey` directory)
```
npm install
node server.js
open http://localhost:3000
```

Then, use server = `localhost` and a name.

# local mode
Online: [https://martinrupp.github.io/rommey/local.html?skipPrompts](https://martinrupp.github.io/rommey/local.html?skipPrompts) .

If you don't have a node installation or want to avoid server/client, you can use "local" mode, just
`open local.html` with your browser.

In this mode, we still use messages to send from client to server, but we are not sending them over network,
but the call is routed and directly executed. This is done on client side by replacing `socket.io.js` with `local_io.js`.
On the server side, the `local_io.js` directs all calls to `rommeyServer.newConnection`.
Theoretically, this should be possible for a lot of javascript socket.io applications.   

# License
AGPL 3.0
