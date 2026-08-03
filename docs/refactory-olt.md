# PROMPT: OLT Multi-Vendor Driver Architecture in Golang (ZTE CLI, VSOL API, HIOSO API)

## 1. CONTEXT & GOAL
We are refactoring our Network Management System (NMS) / NOC Dashboard backend written in **Golang**. The system needs to manage multiple brands and generations of OLTs (ZTE C300, ZTE C600, VSOL GPON, and HIOSO GPON) efficiently. 

To prevent resource-heavy, messy conditional code (`if-else` spam), you must design a **Driver-Based Architecture (Abstraction Layer)** using **Golang Interfaces**. 
* **ZTE (C300 & C600):** Managed via **CLI/SSH** using `golang.org/x/crypto/ssh`.
* **VSOL & HIOSO (GPON):** Managed via **REST API** using standard `net/http`. 

The core application should only interact with a unified interface and standard Go structs/data models. It must remain fully decoupled from device-specific connection types, protocols, and terminal outputs.

---

## 2. GO FOLDER & ARCHITECTURE ALIGNMENT
Our current project structure hosts the OLT package inside **`backend/pkg/olt`**. You must place the new driver implementations inside **`backend/pkg/olt/driver`**. 

Please organize and generate the code inside **`backend/pkg/olt/driver/`** with the following files:
```text
backend/pkg/olt/driver/
├── driver.go         # Defines the OLTDriver interface and shared Data Models/Structs
├── factory.go        # Factory function to instantiate the correct driver based on profile
├── zte_cli.go        # Implements ZTE C300 & C600 CLI logic (SSH + Regex Parsing)
├── vsol_api.go       # Implements VSOL GPON REST API logic (with Mock Endpoints)
└── hioso_api.go      # Implements HIOSO GPON REST API logic (with Mock Endpoints)
```

---

## 3. TECHNICAL SPECIFICATIONS & PROFILES

### A. Interface Formatting & Naming Rules (Crucial for ZTE)
The drivers must dynamically format the physical ports based on Slot, Card, and Port integers passed from the dashboard:
* **ZTE C300 Format:**
  * OLT Port: `gpon-olt_{f}/{s}/{p}` (e.g., `gpon-olt_1/1/1`)
  * ONU Port: `gpon-onu_{f}/{s}/{p}:{id}` (e.g., `gpon-onu_1/1/1:1`)
* **ZTE C600 Format:**
  * OLT Port: `gpon_olt-{f}/{s}/{p}` (e.g., `gpon_olt-1/1/1`)
  * ONU Port: `gpon_onu-{f}/{s}/{p}:{id}` (e.g., `gpon_onu-1/1/1:1`)

### B. Core Interface Definition (`driver.go`)
Your Go interface must support at least these exact operations, accepting `context.Context` for timeouts and returning clean data models or clear errors:
```go
type OLTDriver interface {
    GetUnconfiguredONU(ctx context.Context) ([]UnconfiguredONU, error)
    GetBoardStatus(ctx context.Context) (BoardStatus, error)
    GetONUStatus(ctx context.Context, oltPort string, id int) (ONUStatus, error)
    GetONUPower(ctx context.Context, onuPort string) (ONUPower, error)
    GetONUMac(ctx context.Context, onuPort string) ([]MacEntry, error)
    RegisterONUBridge(ctx context.Context, oltPort string, id int, onuType string, sn string, vlan int) error
    DeleteONU(ctx context.Context, oltPort string, id int) error
    RebootONU(ctx context.Context, onuPort string) error
    RestoreONU(ctx context.Context, onuPort string) error
}
```

---

## 4. DRIVER IMPLEMENTATION & EXECUTION RULES

### 1. ZTE Driver (`zte_cli.go`) - SSH & Command Sequence
Implement a single struct `ZTEDriver` that differentiates between `c300` and `c600` via a model field. It must use `golang.org/x/crypto/ssh` to open terminal sessions, send commands, read outputs, and use **Go Regular Expressions (`regexp`)** to parse the returned text.

Use this exact command catalog for ZTE:
* **get_uncfg_onu:** `show gpon onu uncfg`
* **get_board_status:** `show processor` (Parse CPU/RAM strings)
* **get_onu_status:**
  * C300: `show gpon onu state {olt_port} {id}`
  * C600: `show gpon onu detail-info {onu_port}`
* **get_onu_power:** `show pon power attenuation {onu_port}` (Extract Rx/Tx dBm values using regex)
* **get_onu_mac:** `show mac gpon onu {onu_port}`
* **register_onu_bridge (Sequence):**
  ```text
  conf t
  interface {olt_port}
  onu {id} type {type} sn {sn}
  exit
  interface {onu_port}
  name {sn}
  tcont 1 name T1 profile UP-1G
  gemport 1 name G1 tcont 1
  exit
  pon-onu-mng {onu_port}
  service 1 gemport 1 vlan {vlan}
  vlan port eth_0/1 mode tag vlan {vlan}
  exit
  ```
* **delete_onu:** `conf t` -> `interface {olt_port}` -> `no onu {id}` -> `exit`
* **reboot_onu:** `conf t` -> `pon-onu-mng {onu_port}` -> `reboot` -> `exit`
* **restore_onu:** `conf t` -> `pon-onu-mng {onu_port}` -> `restore factory` -> `exit`

### 2. VSOL GPON Driver (`vsol_api.go`) - REST API (GPON)
Implement `VSOLDriver` using `net/http`. Handle token/session authentication and map endpoints for VSOL GPON topology. 
* **Important:** Since exact VSOL API endpoints are vendor-proprietary, please create **mocking endpoints/placeholder URLs** (e.g., `/api/v1/gpon/onu/uncfg`) and mock responses first. We will inspect/sniff the real OLT Web Management traffic and swap the URLs later.
* Decode JSON responses directly into the unified Go data structs.

### 3. HIOSO GPON Driver (`hioso_api.go`) - REST API (GPON)
Implement `HiosoDriver` using `net/http` optimized for GPON topology.
* **Important:** Similar to VSOL, create **mocking endpoints/placeholder URLs** for HIOSO's Web/REST API management backend.
* Unify the data mapping so that the final returned struct matches the data structure of the ZTE and VSOL drivers.

### 4. Driver Factory (`factory.go`)
Create a simple factory function:
```go
func NewOLTDriver(profile string, ip string, username string, password string) (OLTDriver, error)
```
This function maps profiles like `"zte_c300"`, `"zte_c600"`, `"vsol_gpon"`, or `"hioso_gpon"` to their respective concrete driver structs.

---

## 5. CRITICAL DEVELOPMENT INSTRUCTIONS
1. **Mandatory Context Support:** Every single network operation, HTTP request, and SSH channel command **MUST** accept and respect `context.Context`. If the OLT experiences high load, freezes, or takes too long to reply, the context timeout must trigger properly to prevent the dashboard backend from freezing.
2. **Production-Grade Go Code:** Write clean, concurrent-safe Go code with rigorous error handling (`if err != nil`).
3. **Regex Parsing Examples:** In `zte_cli.go`, include highly robust regex patterns with inline comments explaining how it extracts values (e.g., capturing `-23.45` from a CLI string like `Rx Power: -23.45dBm`).

Please generate the complete file structures and implementation inside `backend/pkg/olt/driver` now.
