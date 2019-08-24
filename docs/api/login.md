[< back to APIs](../api.md)

# Login API

The Login API base address is `server-address/auth/`. Clients should make HTTP requests to the [endpoints](#endpoints).

## Tokens
Tokens are 32 characters long, and will always match `/^[A-Za-z0-9-_]+$/`. They are securely random-generated by [nanoid](https://github.com/ai/nanoid).

Every time a client succesfully logs into an account, a new Token is generated, and any old tokens for the account are discarded. This means that every client using an old token will be disconnected. Because of this, if an attacker gains access to an account, a user will have to change their password, log in again, and the attacker will have no access.

## Endpoints

Every existing endpoint of the Login API will return a valid JSON value.

When sending a POST request to an endpoint, the POST data should always be JSON data.

### register.json
The `register.json` endpoint should be called via a POST request. The `register.json` endpoint is used to create a new account on the server. The `register.json` endpoint may need a reCAPTCHA v2 button widget response, but this depends on the server configuration ([see recaptcha.json](#recaptchajson)).

**Parameters**:
|Key|Description|Example|Flags
|-|-|-|-
|`username`|The desired username to register as. (must match `/^[a-zA-Z0-9_-]+$/`, be at least 1 character long, but max. 32 characters long. if doesn't match requirements, call will produce [error 5](#error-codes)|`"alice"`|required, string
|`password`|The desired password to use. (must be longer than eight characters, but must be max. 128 characters. if doesn't match requirements, call will produce [error 4](#error-codes))|`"dontusethispasswordplease"`|required, string
|`g-recaptcha-response`|reCAPTCHA v2 response from reCAPTCHA v2 button widget. For obtaining SITE_KEY, [see the recaptcha.json endpoint](#recaptchajson)|`"general"`|required/not needed ([see recaptcha.json](#recaptchajson)), string

**Example request**:
```json
{
    "username": "alice",
    "password": "dontusethispasswordplease",
    "g-recaptcha-response": "<google recaptcha response>"
}
```

**OK response** (status 200):
```json
{}
```

**Error response** (status 400 or 500):
```json
{
    "error": <error code>
}
```

#### Error Codes

|Code|Reason|Status code
|-|-|-
|0|Internal server error. (uncaught exception)|500
|1|Incorrect reCAPTCHA (only occurs if server has reCAPTCHA enabled)|400
|2|Bad body (invalid JSON or missing properites)|400
|3|Username already taken|400
|4|Password doesn't fit requirements|400
|5|Username doesn't fit requirements|400

### login.json
The `login.json` endpoint should be called via a POST request. The `login.json` endpoint is used to create an authentication token on the server.

**Parameters**:
|Key|Description|Example|Flags
|-|-|-|-
|`username`|The desired username to register as. (if the username doesn't exist in the database, the call will produce [error 3](#error-codes-1))|`"alice"`|required, string
|`password`|The desired password to use. (if the password is incorrect, the call will produce [error 4](#error-codes-1))|`"dontusethispasswordplease"`|required, string

**Response body**:
|Key|Description|Example|Flags
|-|-|-|-
|`token`|A 32 characters long, `/^[A-Za-z0-9-_]+$/` matching authentication token.|`"iRHZ7-9HSGYaxVMB2I5yUCCXRA_7SWWX"`|string

**Example request**:
```json
{
    "username": "alice",
    "password": "dontusethispasswordplease"
}
```

**OK response** (status 200):
```json
{
    "token": "iRHZ7-9HSGYaxVMB2I5yUCCXRA_7SWWX"
}
```

**Error response** (status 400 or 500):
```json
{
    "error": <error code>
}
```

#### Error Codes

|Code|Reason|Status code
|-|-|-
|0|Internal server error. (uncaught exception)|500
|1|**Reserved for future use**|400
|2|Bad body (invalid JSON or missing properites)|400
|3|User doesn't exist|400
|4|Password incorrect|400

### recaptcha.json
The `recaptcha.json` endpoint should be called via a GET request. The `recaptcha.json` endpoint is used to retreive the SITE_KEY reCAPTCHA variable, used for rendering a reCAPTCHA v2 button. The `recaptcha.json` endpoint can respond in 2 different ways, based on server configuration. This endpoint should not produce any errors.

**reCAPTCHA enabled response** (status code 200):
```json
{
    site_key: "<SITE_KEY>"
}
```

**reCAPTCHA disabled response** (status code 404):
```json
{}
```

## Examples

Here are example authentication flows between the server and client.

### reCAPTCHA enabled

```sequence
Client->Server: captcha.json, are you\nenabled?
Server->Client: yes, SITE_KEY is x
Note right of Client: Shows reCAPTCHA\nto player, player\ncompletes it
Client->Server: register.json, username is\nalice, my password is password1,\ncaptcha solution is y
Note left of Server: Checks validity\nCreates account
Server->Client: ok
Client->Server: login.json, username is\nalice, my password is password1
Note left of Server: Checks password\nCreates token\nDiscards old token
Server->Client: ok, your token is\n"iRHZ7-9HSGYaxVMB2I5yUCCXRA_7SWWX"
Note right of Client: Saves token\nUses token in other APIs
```

### reCAPTCHA disabled

```sequence
Client->Server: captcha.json, are you\nenabled?
Server->Client: nope
Client->Server: register.json, username is\nalice, my password is password1
Note left of Server: Checks validity\nCreates account
Server->Client: ok
Client->Server: login.json, username is\nalice, my password is password1
Note left of Server: Checks password\nCreates token\nDiscards old token
Server->Client: ok, your token is\n"iRHZ7-9HSGYaxVMB2I5yUCCXRA_7SWWX"
Note right of Client: Saves token\nUses token in other APIs
```

## Notes

 * An option to require reCAPTCHA for logins might be added in the future.