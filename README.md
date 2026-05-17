# Chatting Encryption — Multi-User Chat with Identity-Based Encryption

> **CS440V — Computer Networks | Spring 2026 | Tan Tao University**
>
> A secure, real-time multi-user chat application built with Python socket programming and Identity-Based Encryption (IBE) using the Boneh-Franklin scheme.

**Group Members:**

| Name | Student ID |
|---|---|
| Ho Nguyen Kim Long | 2102161 |
| Le Chi Tam | 2302220 |
| Trieu Minh Thuan | 2302059 |
| Le Nguyen Quoc Anh | 2302283 |

**Supervisors:** Truong Huu Tram, PhD & Le Quoc Huy, PhD

**GitHub:** [https://github.com/MrNhoiBong/Chatting_Encryption](https://github.com/MrNhoiBong/Chatting_Encryption)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Prerequisites](#4-prerequisites)
5. [Quick Start with Docker (Recommended)](#5-quick-start-with-docker-recommended)
6. [Running Multiple Clients](#6-running-multiple-clients)
7. [Using the Application](#7-using-the-application)
8. [API Reference](#8-api-reference)
9. [Testing with cURL](#9-testing-with-curl)
10. [Security Design](#10-security-design)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Project Overview

This application allows multiple users to connect to a central TCP socket server and communicate in real-time. All messages are end-to-end encrypted using a **hybrid IBE + AES-EAX** scheme — the server relays ciphertext only and never has access to plaintext.

**Key features:**

- **Private (one-to-one) messaging** — encrypted with the recipient's IBE identity as the public key
- **Group chat** — create named groups, invite users; all members share a group IBE secret key for decryption
- **Real-time group invitations** — pop-up notifications; accept or decline without leaving the chat
- **Browser-based GUI** — React + Tailwind CSS frontend, no installation needed for end-users
- **Zero plaintext on the server** — the server only routes encrypted payloads; it stores nothing
- **Docker-based deployment** — fully containerized; works on any OS that runs Docker

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT MACHINE                               │
│                                                                      │
│   ┌──────────────────┐   HTTP (localhost)   ┌──────────────────┐   │
│   │   Browser / UI   │ ◄──────────────────► │  Flask API Client │   │
│   │  React + Vite    │   REST endpoints      │  (client_api.py) │   │
│   │  Port: 6060      │                       │  Port: 5001      │   │
│   └──────────────────┘                       └────────┬─────────┘   │
│                                                       │              │
│                                             Persistent TCP Socket    │
│                                             IBE + AES Encryption     │
└───────────────────────────────────────────────────────┼─────────────┘
                                                        │
                                           ─────────────▼──────────────
                                           │      SERVER MACHINE       │
                                           │                           │
                                           │  ┌─────────────────────┐ │
                                           │  │  TCP Socket Server  │ │
                                           │  │   (server_api.py)   │ │
                                           │  │    Port: 5000       │ │
                                           │  │                     │ │
                                           │  │  Roles:             │ │
                                           │  │  • PKG (key gen)    │ │
                                           │  │  • Message relay    │ │
                                           │  │  • Group registry   │ │
                                           │  └─────────────────────┘ │
                                           └───────────────────────────┘
```

**Data flow for a private message:**

```
Sender Browser
   │
   │  POST /send  {target, plaintext}
   ▼
Flask Client API  (client_api.py)
   │  1. Generate random 256-bit AES session key
   │  2. AES-EAX encrypt plaintext  → (ciphertext, nonce, tag)
   │  3. IBE encrypt session key    → ibe_enc_key  (using target's identity)
   │  4. Send JSON payload via TCP socket
   ▼
TCP Server  (server_api.py)
   │  Forward encrypted JSON to recipient socket
   ▼
Flask Client API on recipient's machine
   │  1. IBE decrypt ibe_enc_key    → session key  (using recipient's SK)
   │  2. AES-EAX decrypt ciphertext → plaintext
   │  3. Store in local in-memory buffer
   ▼
Recipient Browser  (polling GET /messages every 2 s)
```

---

## 3. Repository Structure

```
Chatting_Encryption/
├── ServerContainer/                  # Docker container for the central server
│   ├── Dockerfile                    # Main server container build file
│   ├── README.md                     # Server-specific instructions
│   └── API_server/
│       ├── server_api.py             # ★ Core server: TCP socket + IBE PKG + message routing
│       ├── requirements.txt          # Python deps (charm-crypto installed from source in Dockerfile)
│       ├── Dockerfile                # Standalone server Dockerfile (for testing)
│       └── README_API.md             # Server API notes
│
├── ClientContainer/                  # Docker container for each client instance
│   ├── Dockerfile                    # Main client container build file (Python + Node.js)
│   ├── README.md                     # Client-specific instructions
│   ├── API_client/
│   │   ├── client_api.py             # ★ Flask middleware: socket + IBE/AES crypto + REST API
│   │   ├── requirements.txt          # Flask, flask-cors, pycryptodome, charm-crypto
│   │   ├── Dockerfile                # Standalone client backend Dockerfile
│   │   └── README_API.md             # Client REST API reference
│   └── frontend/
│       ├── src/
│       │   ├── App.jsx               # ★ Main React component (all UI logic)
│       │   ├── api.js                # HTTP helper wrappers for client REST API
│       │   ├── index.css             # Global styles
│       │   └── main.jsx              # React entry point
│       ├── index.html                # HTML shell
│       ├── vite.config.js            # Vite build configuration
│       ├── package.json              # Node.js dependencies
│       └── README.md                 # Frontend notes
│
└── Report/                           # Supporting documentation
    ├── api_testing_commands.md       # cURL test commands
    ├── chi_tiet_api.md               # Detailed API notes (Vietnamese)
    ├── chi_tiet_ky_thuat.md          # Technical detail notes (Vietnamese)
    └── thiet_ke_trien_khai.md        # Deployment design notes (Vietnamese)
```

---

## 4. Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Docker Desktop (or Docker Engine) | ≥ 24.x | Building and running containers |
| A modern web browser | Any | Accessing the chat UI |

> **Docker is the only hard requirement.** All Python dependencies (including `charm-crypto`, `pbc`, `Flask`, `pycryptodome`) and Node.js are installed automatically inside the containers. You do **not** need Python or Node.js installed on your host machine.

---

## 5. Quick Start with Docker (Recommended)

### Step 1 — Build and start the Server

Open a terminal in the **root of the repository** and navigate to `ServerContainer`:

```bash
cd ServerContainer
docker build -t ibe-chat-server .
docker run -d -p 5000:5000 --name ibe-server ibe-chat-server
```

> ⚠️ The server build takes **5–10 minutes** on the first run because it compiles `pbc` (Pairing-Based Cryptography library) and `charm-crypto` from source. Subsequent builds use Docker's layer cache and are much faster.

Verify the server is running:

```bash
docker logs -f ibe-server
```

Expected output:

```
[*] Đang khởi tạo hệ thống IBE (Boneh-Franklin)...
[+] Hệ thống PKG IBE Server đã sẵn sàng.
[*] Server API đang chạy ở chế độ TCP Socket tại 0.0.0.0:5000
```

### Step 2 — Build and start the first Client

Open a **new terminal** and navigate to `ClientContainer`:

```bash
cd ClientContainer
docker build -t ibe-chat-client .
docker run -d -p 6060:6060 -p 5001:5001 --name ibe-client-1 ibe-chat-client
```

### Step 3 — Open the chat UI

Open your browser and navigate to:

```
http://localhost:6060
```

You will see the login screen. Enter:

- **Username:** any unique string (e.g., `Alice`)
- **Server IP:** `host.docker.internal` *(on Linux, use your host machine's LAN IP instead, e.g., `172.17.0.1`)*
- **Server Port:** `5000`

Click **Connect**.

---

## 6. Running Multiple Clients

Each user needs their own ClientContainer instance with **different host ports**. The `5001` Flask port and `6060` Vite port must not collide between containers on the same machine.

**Second client (Bob):**

```bash
docker run -d -p 6061:6060 -p 5002:5001 --name ibe-client-2 ibe-chat-client
```

Open a second browser tab or window at `http://localhost:6061`, log in as `Bob`.

**Third client (Charlie):**

```bash
docker run -d -p 6062:6060 -p 5003:5001 --name ibe-client-3 ibe-chat-client
```

Open a third tab at `http://localhost:6062`, log in as `Charlie`.

**Port mapping summary:**

| Container name | Frontend URL | Flask (internal) port |
|---|---|---|
| `ibe-client-1` | `http://localhost:6060` | 5001 |
| `ibe-client-2` | `http://localhost:6061` | 5002 |
| `ibe-client-3` | `http://localhost:6062` | 5003 |

> **Linux note:** `host.docker.internal` may not resolve on Linux. Use `172.17.0.1` (Docker bridge gateway) or your machine's actual LAN IP when entering the Server IP in the login form.

---

## 7. Using the Application

### 7.1 Login / Connect

1. Open your browser to the client URL (e.g., `http://localhost:6060`).
2. Enter your **Username**, **Server IP** (`host.docker.internal`), and **Server Port** (`5000`).
3. Click **Connect**. The app will show the online user list in the left sidebar if the connection succeeds.

### 7.2 Private (One-to-One) Chat

1. In the **Users** section of the sidebar, click on any online user.
2. Type your message in the input box at the bottom and press **Send** or hit Enter.
3. Messages are encrypted with the recipient's IBE identity before leaving your machine. The server never sees plaintext.

### 7.3 Group Chat

**Creating a group:**

1. In the **Groups** section of the sidebar, click the **+** button.
2. Enter a group name (e.g., `TeamA`) and click **Create**.
3. The server generates an IBE secret key for `TeamA` and delivers it to you. You are automatically placed in the group.

**Inviting users:**

1. Click on the group name in the sidebar to open the group chat window.
2. Click the **person+ icon** in the chat header.
3. Enter the username of an online user and click **Invite**.
4. The invited user receives a real-time pop-up notification.

**Accepting an invitation:**

- A pop-up appears in the bottom-right corner. Click **Accept** to join the group or **Decline** to dismiss.

**Sending a group message:**

1. Select the group in the sidebar.
2. Type and send your message. It is encrypted using the group's IBE identity — any group member can decrypt it independently using the shared group secret key.

---

## 8. API Reference

The Flask client backend (`client_api.py`) exposes the following REST endpoints on port `5001`:

### Connection

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/connect` | Establish TCP connection with server, register user, receive IBE keys |
| `GET` | `/status` | Check current connection state (used by frontend on page reload) |

**`POST /connect` request body:**

```json
{
  "username": "Alice",
  "server_ip": "host.docker.internal",
  "server_port": 5000
}
```

**`POST /connect` response (success):**

```json
{
  "status": "connected",
  "users": ["Alice", "Bob"]
}
```

**`GET /status` response (when connected):**

```json
{
  "connected": true,
  "username": "Alice",
  "server_ip": "host.docker.internal",
  "server_port": 5000
}
```

---

### Messaging

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/send` | Encrypt and send a private message to a target user |
| `GET` | `/messages` | Retrieve and clear all buffered decrypted messages (one-shot poll) |
| `GET` | `/users` | Get the current online user list |

**`POST /send` request body:**

```json
{
  "target": "Bob",
  "message": "Hello Bob!"
}
```

**`GET /messages` response:**

```json
{
  "messages": [
    {
      "sender": "Bob",
      "receiver": "Alice",
      "is_group": false,
      "message": "Hello Alice!"
    },
    {
      "sender": "System",
      "receiver": "Alice",
      "is_group": false,
      "message": "Chuyển tiếp thất bại: Người dùng 'Charlie' không online.",
      "is_system": true
    }
  ]
}
```

> **Note:** `GET /messages` clears the in-memory buffer on each call. The frontend polls this endpoint every 2 seconds.

---

### Group Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/groups/create` | Create a new group; server generates a group IBE key |
| `POST` | `/groups/invite` | Invite an online user to a group you belong to |
| `POST` | `/groups/accept` | Accept a pending group invitation; receive the group IBE key |
| `GET` | `/groups/info` | Get joined groups and pending invitations |
| `POST` | `/groups/send` | Encrypt and broadcast a message to all group members |

**`POST /groups/create` request body:**

```json
{ "group_name": "TeamA" }
```

**`POST /groups/invite` request body:**

```json
{ "group_name": "TeamA", "target_user": "Bob" }
```

**`POST /groups/accept` request body:**

```json
{ "group_name": "TeamA" }
```

**`GET /groups/info` response:**

```json
{
  "joined_groups": ["TeamA", "CS440"],
  "pending_invitations": [
    { "group_name": "Research", "inviter": "Charlie" }
  ]
}
```

**`POST /groups/send` request body:**

```json
{ "group_name": "TeamA", "message": "Hello everyone!" }
```

---

### Internal TCP Server Message Types

The server (`server_api.py`) communicates with client backends over raw TCP using newline-delimited JSON. These types are handled internally and are **not** exposed to the end user.

| Type (client → server) | Purpose |
|---|---|
| `register` | Register username; receive MPK + personal SK |
| `message` | Forward an encrypted private message to a recipient |
| `create_group` | Create a named group; receive group SK |
| `invite_group` | Send a group invitation to an online user |
| `join_group` | Accept an invitation; receive group SK |
| `group_message` | Broadcast an encrypted message to all group members |
| `request_users` | Request the current online user list |

| Type (server → client) | Purpose |
|---|---|
| `user_list` | Broadcast updated list of connected users |
| `group_created` | Confirm group creation + deliver group SK |
| `group_invitation` | Push real-time invitation to the invited user |
| `group_joined` | Confirm join success + deliver group SK |
| `group_message` | Deliver an encrypted group message |
| `system` | Deliver an error or system notification |

---

## 9. Testing with cURL

You can test the backend API directly from the terminal without opening the browser, which is useful for verifying functionality when running multiple simulated users.

> Ensure the server is running on port 5000 and the target client backend is running on port 5001.

**1. Connect as Alice:**

```bash
curl -X POST http://localhost:5001/connect \
     -H "Content-Type: application/json" \
     -d '{"username": "Alice", "server_ip": "host.docker.internal", "server_port": 5000}'
```

**2. Check online users:**

```bash
curl http://localhost:5001/users
```

**3. Send a private message to Bob:**

```bash
curl -X POST http://localhost:5001/send \
     -H "Content-Type: application/json" \
     -d '{"target": "Bob", "message": "Hi Bob, this is an IBE-encrypted message!"}'
```

**4. Read and clear messages:**

```bash
curl http://localhost:5001/messages
```

**5. Create a group:**

```bash
curl -X POST http://localhost:5001/groups/create \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA"}'
```

**6. Invite Bob to the group:**

```bash
curl -X POST http://localhost:5001/groups/invite \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA", "target_user": "Bob"}'
```

**7. Bob checks and accepts the invitation** *(run on Bob's client backend, e.g., port 5002)*:

```bash
# Check pending invitations
curl http://localhost:5002/groups/info

# Accept the invitation
curl -X POST http://localhost:5002/groups/accept \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA"}'
```

**8. Send a group message:**

```bash
curl -X POST http://localhost:5001/groups/send \
     -H "Content-Type: application/json" \
     -d '{"group_name": "TeamA", "message": "Hello everyone in TeamA!"}'
```

---

## 10. Security Design

### 10.1 Identity-Based Encryption (IBE) — Boneh-Franklin Scheme

The system uses the **Boneh-Franklin IBE** scheme over the **SS512 pairing group**, implemented via the [JHUISI/charm-crypto](https://github.com/JHUISI/charm) library.

- The server runs `ibe.setup()` at startup, generating a **Master Public Key (MPK)** and **Master Secret Key (MSK)**.
- MPK is distributed to every connecting client.
- When a user registers, the server calls `ibe.extract(MSK, username)` to derive a **personal secret key (SK)** bound to the user's identity string. The MSK itself is never transmitted.
- For group chat, `ibe.extract(MSK, group_name)` derives a **group secret key** on demand. Because `extract` is deterministic, the same key is re-derived for every new member who joins — no out-of-band key distribution is required.

### 10.2 Hybrid Encryption per Message

Each message (private or group) uses the following scheme:

```
1. Generate random 256-bit AES session key K
2. Encrypt plaintext:   (ciphertext, nonce, tag) = AES-EAX.encrypt(K, plaintext)
3. Encrypt session key: ibe_ciphertext = IBE.encrypt(MPK, identity, K)
4. Transmit JSON:       { ibe_enc_key, aes_nonce, aes_ciphertext, aes_tag }
```

Decryption on the receiver side:

```
1. K = IBE.decrypt(MPK, SK_recipient, ibe_ciphertext)
2. plaintext = AES-EAX.decrypt(K, aes_ciphertext, nonce, tag)
```

AES-EAX mode provides both **confidentiality** and **integrity** (authentication tag).

### 10.3 What the Server Can and Cannot See

| Information | Server access |
|---|---|
| Sender identity | ✅ Yes (username is in plaintext for routing) |
| Recipient identity | ✅ Yes (needed to route the message) |
| Message content | ❌ No (AES-EAX encrypted) |
| AES session key | ❌ No (IBE encrypted, only the recipient's SK can decrypt) |
| Historical messages | ❌ No (server does not persist messages) |

### 10.4 Known Limitations

- **Centralized PKG:** The server holds the MSK and can derive any user's or group's secret key. A compromised server exposes all keys. This is an inherent property of standard (centralized) IBE.
- **In-memory state only:** All messages and group memberships are lost when the server restarts.
- **No forward secrecy:** There is no session renegotiation. The same SK is used for the lifetime of the connection.

---

## 11. Troubleshooting

**Build fails on `charm-crypto` or `pbc`**

The build downloads and compiles PBC and charm from source, which requires network access and build tools. Ensure Docker has internet access. If the build fails at the `wget` step, check your firewall or proxy settings.

**`host.docker.internal` does not resolve (Linux)**

On Linux, Docker does not automatically resolve `host.docker.internal`. Use the Docker bridge IP instead:

```bash
# Find the Docker bridge IP
ip route | grep docker
# Usually 172.17.0.1
```

Enter `172.17.0.1` (or your host's LAN IP) as the Server IP in the login form.

**"Tên đã có người dùng" (Username already taken)**

Another client is already connected with the same username. Choose a different username or stop the other client.

**Frontend shows no online users after login**

- Verify the server container is running: `docker ps`
- Check server logs: `docker logs ibe-server`
- Verify the Server IP and Port entered in the login form are correct.

**Port already in use**

If port 5000, 5001, or 6060 is occupied, change the host-side port in the `docker run` command:

```bash
# Example: map server to host port 5500
docker run -d -p 5500:5000 --name ibe-server ibe-chat-server
# Then enter port 5500 in the login form
```

**Stopping and removing all containers**

```bash
docker stop ibe-server ibe-client-1 ibe-client-2 ibe-client-3
docker rm   ibe-server ibe-client-1 ibe-client-2 ibe-client-3
```

**Viewing live logs**

```bash
docker logs -f ibe-server     # Server logs (connections, key generation)
docker logs -f ibe-client-1   # Client logs (encryption/decryption debug)
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Server | Python 3, `socket`, `threading` | TCP socket server, concurrency |
| Cryptography | charm-crypto (Boneh-Franklin IBE over SS512), PyCryptodome (AES-EAX) | End-to-end encryption |
| Client Backend | Python 3, Flask, Flask-CORS | REST API middleware, crypto operations |
| Client Frontend | React 18, Vite, Tailwind CSS | Browser-based chat UI |
| Containerization | Docker (Ubuntu 22.04 base) | Isolated, reproducible deployment |
| Data Format | JSON over TCP (newline-delimited), Base64 for binary fields | Message serialization |

---

*CS440V Socket Programming Project — Spring 2026 — Tan Tao University*
