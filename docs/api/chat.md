[< back to APIs](../api.md)

# Chat API

To use the Chat API, you will need to get a token from the [Login API](login.md).

The Chat API endpoint is `/chat`. Clients should connect to endpoint via Websocket. [Example communication flow available.](#examples)

## Authentication
To authenticate, see ["type": "hello"](#hello).

## Message types

Every message sent by/to the Chat API should be a valid JSON text message. If not, the server will automatically send an error message code 2, and will close the connection with [code 1003](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Properties), message `"Bad message"`.

Every message should include a `type` key with the desired message type as the value. See the available message types:

### hello
`hello` is a message type used both by the server and the client. A `hello` message is sent out by the server on connection. When a `hello` message is sent out by the server, the server expects a response type `hello` from the client.

#### hello from server
A `hello` message is sent by the server upon connecting, confirms that the server is alive, and that it is a Signal server.

Example `hello` message:
```json
{
    "type": "hello"
}
```

#### hello from client
A `hello` message should be sent by the client upon connecting, and confirms that the client understood the server message. If a `hello` message isn't sent by the server, an auth token should not be sent to the server, because the token may be leaked to other servers by the client this way.

**Parameters**:
|Key|Description|Example|Flags
|-|-|-|-
|`token`|A 32 characters long, `/^[A-Za-z0-9-_]+$/` matching authentication token received from the [Login API](login.md).|`"iRHZ7-9HSGYaxVMB2I5yUCCXRA_7SWWX"`|required, string

**Example `hello` message**:
```json
{
    "type": "hello",
    "token": "iRHZ7-9HSGYaxVMB2I5yUCCXRA_7SWWX"
}
```

### msg

An `msg` message is sent out by the server if another client sent a chat message that this client should be a recipient of. Only authenticated clients can receive `msg` messages. Clients should not send `msg` typed messages.

**Parameters**:
|Key|Description|Example|Flags
|-|-|-|-
|`author`|The *user* that is sending this message.|`"bob"`|string
|`private`|Wheter the message is a private message (for one user only) or a public message (for a channel).|`false`|boolean
|`channel`|If `private` is false, the channel that the message should be sent to. If `private` is true, the username that the message should be sent to.|`"general"`|string
|`content`|The content of the message.|`"Hello, world!"`|string
|`timestamp`|A JS Unix timestamp of when the message was sent.|`1566660330411`|number

### send

A `send` message is sent out by the client if the player wants to send a chat message. Only authenticated clients can send `send` messages, if an anonymous one tries to, the message will produce [error 3](#error-codes). Servers will not send `send` typed messages.

**Example `send` messages**:

Message from channel:
```json
{
    "author": "bob",
    "private": false,
    "channel": "general",
    "content": "Hello, world!",
    "timestamp": 1566660330411
}
```

Message from private:
```json
{
    "author": "bob",
    "private": true,
    "channel": "alice",
    "content": "Hello, world!",
    "timestamp": 1566660330411
}
```

**Parameters**:
|Key|Description|Example|Flags
|-|-|-|-
|`author`|The *user* that is sending this message. (If the specified user does not belong to the account belonging to the auth token, this message will produce [error 5](#error-codes))|`"alice"`|required, string
|`private`|Wheter the message is a private message (for one user only) or a public message (for a channel). (If `true`, the message might produce [error 6 or 7](#error-codes))|`false`|required, boolean
|`channel`|If `private` is false, the channel that the message should be sent to. If `private` is true, the username that the message should be sent to.|`"general"`|required, string
|`content`|The content of the message.|`"Hello, world!"`|required, string

**Example `send` messages**:

Send to channel:
```json
{
    "author": "alice",
    "private": false,
    "channel": "general",
    "content": "Hello, world!"
}
```

Send in private:
```json
{
    "author": "alice",
    "private": true,
    "channel": "bob",
    "content": "Hello, world!"
}
```

## Error Codes

|Code|Reason
|-|-
|0|Internal server error. (uncaught exception, will close the WS connection)
|1|Invalid token ([in `hello` message](#hello))
|2|Bad message (invalid JSON or missing properites, if the former, will close the WS connection)
|3|Unauthorized (sent auth-only message type without being authorized)
|4|Token is now invalid (will close the WS connection, [see more in Login API](login.md#tokens))
|5|User doesn't belong to you ([in `send` message](#send))
|6|User doesn't exist ([in `send` message](#send))
|7|User not online ([in `send` message](#send))

An error message looks like the following:
```json
{
    "type": "error",
    "code": <error code>
}
```

## Examples

Here's an example communication flow between the server and client.

```sequence
Server->Client: Hello
Client->Server: Hello, my token\nis "example"
Note left of Server: Checks token\nToken is valid
Note left of Server: Another client\nsends message
Server->Client: Message, from Bob,\nin general, saying "Hello!"
Note right of Client: Displays message
Note right of Client: Player types\n"Hi Bob!"
Client->Server: Send, as Alice,\nin general, saying "Hi Bob!"
```

## Notes

 * Message types for creating, and deleting channels is in progress. Currently, every channel is a valid channel.
 * This API might be integrated within the Game API in the future.