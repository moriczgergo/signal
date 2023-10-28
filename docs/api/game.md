[< back to APIs](../api.md)

# Game API

To use the Game API, you will need to get a token from the [Login API](login.md).

The Game API endpoint is `/game`. Clients should connect to endpoint via Websocket. [Example auth flow available.](#examples)

## Message Types

### hello

Hello message from server.

### acct.auth

Authentication message.

### acct.data

Account data message.

## Examples

Here's an example authentication flow between the server and client.

```sequence
Server->Client: Hello
Client->Server: Auth, my token\nis "example"
Note right of Server: Checks token\nToken is valid
Server->Client: Here's some data about your account
Note right of Server: Another client authenticates
Server->Client: Another client logged in\nGoodbye!
Note right of Server: Disconnects
```