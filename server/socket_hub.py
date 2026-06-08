import socketio
from fastapi import WebSocket

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)

touchdesigner_clients: set[WebSocket] = set()


async def connect_touchdesigner(websocket: WebSocket):
    await websocket.accept()
    touchdesigner_clients.add(websocket)
    print(f"[ws] touchdesigner connected: {len(touchdesigner_clients)}")


def disconnect_touchdesigner(websocket: WebSocket):
    touchdesigner_clients.discard(websocket)
    print(f"[ws] touchdesigner disconnected: {len(touchdesigner_clients)}")


async def broadcast_touchdesigner(payload):
    stale_clients = []

    for websocket in list(touchdesigner_clients):
        try:
            await websocket.send_json(payload)
        except Exception as error:
            print("[ws] touchdesigner send failed", error)
            stale_clients.append(websocket)

    for websocket in stale_clients:
        disconnect_touchdesigner(websocket)


async def emit_touchdesigner_event(event_name: str, payload):
    await sio.emit(event_name, payload)
    await broadcast_touchdesigner(payload)


@sio.event
async def connect(sid, _environ):
    print(f"[socket] connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[socket] disconnected: {sid}")


@sio.on("tablet:color-select")
async def tablet_color_select(_sid, payload):
    print("[socket] tablet:color-select", payload)
    await emit_touchdesigner_event("touchdesigner:apply-color", payload)


@sio.on("tablet:testing-finish")
async def tablet_testing_finish(_sid, payload):
    print("[socket] tablet:testing-finish", payload)
    await emit_touchdesigner_event("touchdesigner:testing-finished", payload)
