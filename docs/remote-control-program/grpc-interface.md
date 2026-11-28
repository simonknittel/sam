# The gRPC interface of the game client

The Star Citizen game client can start a local gRPC server. The [gRPC connector](./README.md#the-grpc-connector) of the Remote Control Program uses it. Cloud Imperium Games (CIG) has not documented the interface. This document collects all that we learn about it.

> [!IMPORTANT]
> The gRPC server is new in Star Citizen 5.0. In 2026-11, version 5.0 is only in the PTU (the test environment), and CIG has not spoken openly about the interface. Thus each finding in this document describes the status quo of the PTU at the date of its test. CIG can change or remove the interface with each build.

Rules for this document:

- Give the date and the game build of each finding (see [Test log](#test-log)).
- Mark each statement that comes only from a community source, and that we did not test.
- Describe what the tests show. Do not guess the plans of CIG.

## Summary

| Topic | Finding |
| - | - |
| Endpoint | `127.0.0.1:2942`, only on the loopback address |
| Transport | gRPC over HTTP/2 without TLS (prior knowledge), no authentication |
| Discovery | No server reflection, no health service, no metadata |
| Service | `sc.game.telemetry.v1.GameTelemetryService` |
| Calls | `TelemetryStream` (server-streaming, approximately 19 frames each second), `ListTriggerableActions` (112 actions), `TriggerGameAction` |
| Actions | They work. `emote_wave` gave the status `OK`, and the character waved in the game. |
| Game version | Not in the interface. The desktop companion finds the build of the running game itself (see [Game version](#game-version)). |
| Browser | No access. A native program on the machine is necessary. |

## Enable the server

Tested: these lines in `USER.cfg` in the folder of the game environment (for example `StarCitizen/PTU/USER.cfg`):

```ini
grpc.client.server.enabled=true
grpc.client.server.port=2942
server.game.telemetry.enabled=true
```

`Game.log` then shows the server and its endpoint:

```text
[Notice] <Register Service> Service 'sc.game.telemetry.v1.GameTelemetryService' registered [Team_OnlineTech][gRPC]
   Endpoint '127.0.0.1:2942' Secured: False
[Notice] <GameTelemetry> Using the local services server started at launch [Team_GameServices][Services]
```

The game also writes a line when a client connects or disconnects. These lines appeared for the stream calls of the test:

```text
[Notice] <GameTelemetry> Client connected (id=1 total=1) [Team_GameServices][Services]
[Notice] <GameTelemetry> Client disconnected (id=1 remaining=0) [Team_GameServices][Services]
```

Not tested (community sources):

- The environment variable `GRPC_CLIENT_SERVER_ENABLED=true` in the environment of the game ([ShipBit/wingman-ai#521](https://github.com/ShipBit/wingman-ai/pull/521), LIVE 4.10.2).
- The console variable `grpc.client.server.external 0` ([zolij/sc-telemetry-gateway](https://github.com/zolij/sc-telemetry-gateway)).
- The console variable `server.game.telemetry.trigger.actions.enabled = 1` as an opt-in for actions ([zoomphoto/Star-Citizen-Telemetry](https://github.com/zoomphoto/Star-Citizen-Telemetry)). The test build applied actions without it.
- Other console variables: `server.game.telemetry.stream.interval.ms`, `server.game.telemetry.trigger.debounce.ms`, `server.game.telemetry.test.data` (zoomphoto).

## Transport

- The server listens only on `127.0.0.1`. `Game.log` says `Secured: False`: no TLS.
- There is no authentication. Each local program can connect.
- The server accepts only HTTP/2 with prior knowledge (cleartext HTTP/2). A request with HTTP/1.1 gets HTTP/2 frames back.
- The server has no server reflection (`grpc.reflection.v1` and `grpc.reflection.v1alpha` give `UNIMPLEMENTED`) and no health service (`grpc.health.v1.Health` gives `UNIMPLEMENTED`). Thus a client must contain the message definitions.
- The responses have no initial metadata and no trailing metadata.
- From WSL2 with mirrored networking, `127.0.0.1:2942` reaches the server on Windows.

## Browser access

No browser can use the interface. The test of 2026-11-21 confirmed these reasons:

1. **Cleartext HTTP/2.** A browser uses HTTP/2 only with TLS. For a URL with `http://`, it sends HTTP/1.1. The server does not accept HTTP/1.1.
2. **No gRPC-Web.** A request with the content type `application/grpc-web+proto` gets `grpc-status: 2` with `Missing :te header`. The server accepts only native gRPC. Native gRPC needs the header `te: trailers` and HTTP trailers. The Fetch API of a browser cannot send this header and cannot read trailers.
3. **No CORS.** The server does not answer a preflight request.

Thus the gRPC connector needs a native program on the machine: the [desktop companion](./README.md#desktop-companion).

## Service and calls

The message definitions come from community extractions of the game files. The test matched them for the `actor` frame, the list of actions and the result of a trigger.

- [zoomphoto/Star-Citizen-Telemetry](https://github.com/zoomphoto/Star-Citizen-Telemetry): the stream and the action calls. The script `extract_sc_protos.py` extracts the definitions from the game files.
- [zolij/sc-telemetry-gateway](https://github.com/zolij/sc-telemetry-gateway): only the stream, extracted from PTU `5.0.202.205`.

```proto
service GameTelemetryService {
  rpc TelemetryStream (TelemetryStreamRequest) returns (stream TelemetryStreamResponse);
  rpc TriggerGameAction (TriggerGameActionRequest) returns (TriggerGameActionResponse);
  rpc ListTriggerableActions (ListTriggerableActionsRequest) returns (ListTriggerableActionsResponse);
}
```

### TelemetryStream

- The request is empty.
- The server sends approximately 19 frames each second (58 frames and 59 frames in two tests of 3 seconds).
- `TelemetryStreamResponse` has the fields 3 to 8. A frame contains only the parts that apply at that time. On foot, a frame contains only `actor` and has 97 bytes. The fields 1 and 2 did not occur.

| Field | Content (from the definitions) | Seen in the test |
| - | - | - |
| `actor` (6) | `vitals`: health, oxygen, hunger, thirst and body temperature (each with a current value and a maximum), heart rate, gravity, pressure, intoxication level. `state`: locomotion (on foot, EVA, seated), crew role, seat name, wallet balance (`uec_balance`). `environment`: external temperature, ambient radiation, breathable atmosphere. | Yes, on foot |
| `vehicle` (3) | Name, class name, manufacturer, type, lights, doors (open state and lock state), warning lights (`annunciators`), flight (landed, landing gear, VTOL, flight settings, instruments such as speed, hydrogen fuel, quantum fuel, g-meter, boost, altitude and heading), power, shields, health, master mode. | No |
| `weapons` (4) | Weapon settings, the preset, the weapons (name, powered, ready to fire), the countermeasures. | No |
| `events` (5) | Spawn, death, downed, respawn, "enter seat", "leave seat". Community source: in the tests of Wingman AI, only "enter seat" and "leave seat" occurred. | No |
| `force_feedback` (7) | Values for force feedback devices. | No |
| `turret` (8) | Light amplification. | No |

The definitions contain no state of the in-game party.

Values of the test, on foot: health 100 of 100, oxygen 1 of 1, hunger 100 of 100, thirst 100 of 100, body temperature 36.5 (maximum 100), heart rate approximately 60 and increasing, gravity 1.0, pressure 1.0, external temperature 21.0, breathable atmosphere, locomotion "on foot". The wallet balance was in the frame. Its value is not in this document.

### ListTriggerableActions

The request is empty. The response gives the actions of the action map of the game. Each action has a name, a category and the flag `holdable`. The test build gave 112 actions in 11 categories:

| Category | Count | Actions |
| - | - | - |
| `lights_controller` | 3 | `v_lights`, `v_lights_off`, `v_lights_on` |
| `player` | 4 | `mobiglas`, `toggle_flashlight`, `v_starmap`, `visor_wipe` |
| `player_emotes` | 34 | `emote_agree`, `emote_angry`, `emote_atease`, `emote_attention`, `emote_blah`, `emote_bored`, `emote_bow`, `emote_burp`, `emote_cheer`, `emote_chicken`, `emote_clap`, `emote_come`, `emote_cry`, `emote_dance`, `emote_disagree`, `emote_failure`, `emote_flex`, `emote_flirt`, `emote_gasp`, `emote_gloat`, `emote_greet`, `emote_laugh`, `emote_launch`, `emote_point`, `emote_rude`, `emote_salute`, `emote_sit`, `emote_sleep`, `emote_smell`, `emote_taunt`, `emote_threaten`, `emote_wait`, `emote_wave`, `emote_whistle` |
| `seat_general` | 17 | `v_eject`, `v_emergency_exit`, `v_enter_remote_turret_1`, `v_enter_remote_turret_2`, `v_enter_remote_turret_3`, `v_light_amplification_off`, `v_light_amplification_on`, `v_light_amplification_toggle`, `v_operator_mode_cycle_back`, `v_operator_mode_cycle_forward`, `v_set_flight_mode`, `v_set_guns_mode`, `v_set_mining_mode`, `v_set_quantum_mode`, `v_set_refuel_mode`, `v_set_salvage_mode`, `v_set_scan_mode` |
| `spaceship_docking` | 1 | `v_toggle_docking_request` |
| `spaceship_general` | 11 | `v_close_all_doors`, `v_flightready`, `v_lock_all_doors`, `v_lock_all_ports`, `v_open_all_doors`, `v_self_destruct`, `v_toggle_all_doorlocks`, `v_toggle_all_doors`, `v_toggle_all_portlocks`, `v_unlock_all_doors`, `v_unlock_all_ports` |
| `spaceship_movement` | 27 | `v_atc_request`, `v_toggle_landing_system`, `v_deploy_landing_system`, `v_retract_landing_system`, `v_flight_advanced_hud_off`, `v_flight_advanced_hud_on`, `v_flight_advanced_hud_toggle`, `v_ifcs_toggle_gforce_safety`, `v_ifcs_gsafe_on`, `v_ifcs_gsafe_off`, `v_ifcs_proximity_assist_off`, `v_ifcs_proximity_assist_on`, `v_ifcs_proximity_assist_toggle`, `v_ifcs_reset_gmeter_max`, `v_ifcs_toggle_esp`, `v_ifcs_vector_decoupling_off`, `v_ifcs_vector_decoupling_on`, `v_ifcs_vector_decoupling_toggle`, `v_master_mode_cycle`, `v_master_mode_set_nav`, `v_master_mode_set_scm`, `v_transform_cycle`, `v_transform_deploy`, `v_transform_retract`, `v_vtol_off`, `v_vtol_on`, `v_vtol_toggle` |
| `spaceship_power` | 12 | `v_power_set_off`, `v_power_set_on`, `v_power_set_shields_off`, `v_power_set_shields_on`, `v_power_set_thrusters_off`, `v_power_set_thrusters_on`, `v_power_set_weapons_off`, `v_power_set_weapons_on`, `v_power_toggle`, `v_power_toggle_shields`, `v_power_toggle_thrusters`, `v_power_toggle_weapons` |
| `spaceship_quantum` | 1 | `v_toggle_qdrive_engagement` |
| `spaceship_radar` | 1 | `v_invoke_ping` (holdable) |
| `spaceship_target_hailing` | 1 | `v_target_hail` |

### TriggerGameAction

- The request has the name of the action (`action_name`) and an optional hold time in milliseconds (`hold_ms`).
- The response has a status and a message.

| Status | Meaning (from the name, not tested except `OK`) |
| - | - |
| `TRIGGER_GAME_ACTION_STATUS_OK` | The game applied the action. |
| `TRIGGER_GAME_ACTION_STATUS_UNKNOWN_ACTION` | The game does not know the name. |
| `TRIGGER_GAME_ACTION_STATUS_MAP_INACTIVE` | The action map of the action is not active (for example a ship action on foot). |
| `TRIGGER_GAME_ACTION_STATUS_RATE_LIMITED` | Too many triggers in a short time. |
| `TRIGGER_GAME_ACTION_STATUS_FAILED` | The game could not apply the action. |
| `TRIGGER_GAME_ACTION_STATUS_HOLD_NOT_ALLOWED` | A hold time for an action that cannot be held. |
| `TRIGGER_GAME_ACTION_STATUS_FILTERED` | The game filtered the action. |

Test of 2026-11-21: `emote_wave` without a hold time gave `OK` with an empty message, and the character waved in the game. `Game.log` showed no line for the trigger.

`USER.cfg` did not contain `server.game.telemetry.trigger.actions.enabled`. Thus, in the test build, each local program can trigger each listed action as soon as the server is on, also `v_self_destruct`.

## Game version

The interface gives no game version: the messages have no field for it, the responses have no metadata, and there is no reflection.

The first lines of `Game.log` give the build number, the folder of the game environment and a file version:

```text
BackupNameAttachment=" Build(13248297) 21 Nov 26 (09 42 13)"  -- used by backup system
Executable: C:\Program Files\Roberts Space Industries\StarCitizen\PTU\Bin64\StarCitizen.exe
FileVersion: 5.0.202.10025
ProductVersion: 5.0.202.10025
```

The RSI Launcher calls LIVE, PTU and the others "Game Environment", and shows a version such as `5.0.0-ptu.13284307`. It gets this version from a web service of RSI: only its last part, the build number, is in the files of the game. `FileVersion` is not the version of the launcher. Other lines give a different environment value (`[Trace] Environment:   PTU`, but `PUB` on LIVE) and the shard (`New Shard Id: ptu_use1b_13248297_010`).

Each installation also has the file `build_manifest.id` (for example `StarCitizen/PTU/build_manifest.id`) with the fields `Branch`, `Version` and `RequestedP4ChangeNum`. `Version` has the value of `FileVersion`. Test of 2026-11-21: LIVE had `4.10.201.48085`, and PTU had `5.0.202.10025` with the build `13248297`. Both installations can use the same port, and the test could not read the path of the game process.

The log file connector reads the game environment and the build number from the header of each log file (see decision 17 in [Decisions](./README.md#decisions)). The gRPC connector does not use them, because it does not depend on the log file connector (principle 14). For the gRPC connector, the desktop companion finds the build of the running game itself. Step 4 of the [migration](./migration.md#order-of-the-steps) plans the details.

## Requirements for the gRPC connector

- It runs in the desktop companion (see [Browser access](#browser-access)). It is written in Rust and supports Windows and Linux (see [Decisions](./README.md#decisions)).
- It connects to `127.0.0.1` on the port that the owner sets in the desktop companion. The default port is 2942. It does not read the port from `Game.log` (see principle 14 in [Principles](./README.md#principles)).
- It contains the message definitions as `.proto` files and generates the Rust code from them, because the server has no reflection. The interface gives no game build, thus the connector cannot select definitions for each build. It uses only the fields of its definitions and ignores unknown fields. When a call fails or a message does not match the definitions, it stops and shows a note in the desktop companion.
- It reduces the 19 frames each second to the rate of the channel.
- It removes each field that no permitted capability needs before the data leaves the machine (for example the wallet balance).
- It triggers only the game actions of the catalog. It maps the status of the game to the result of the Remote Control Program: `OK` is `applied`, each other status is `failed` with the status as the reason.
- It connects again when the game client restarts.

## Open questions

Each answer can change with the next build of the PTU.

Tests can answer these questions:

- Which events occur in `events`?
- How do the `vehicle` and `weapons` frames look in a ship?
- Does the list of actions change with the situation (on foot, in a seat, in a ship)?
- Can more than one client connect at the same time? The log line `total=1` counts the clients.
- When does the game answer `RATE_LIMITED` or `FILTERED`?
- Does the opt-in variable for actions exist, and can it turn the actions off?

Only CIG can answer these questions:

- When does the interface come to LIVE, and with which calls?
- Will the interface supply the build number and the game environment (LIVE or PTU)?
- Do the terms of service permit the use of the interface by a third-party program?

## Test log

| Date | Game build | Test | Result |
| - | - | - | - |
| 2026-11-21 | PTU 5.0.202.10025, build 13248297 | TCP connection from WSL2 and from Windows | Connected |
| 2026-11-21 | PTU 5.0.202.10025, build 13248297 | Server reflection v1 and v1alpha, health service | `UNIMPLEMENTED` |
| 2026-11-21 | PTU 5.0.202.10025, build 13248297 | `TelemetryStream` for 3 seconds, on foot | 58 frames of 97 bytes, only `actor` |
| 2026-11-21 | PTU 5.0.202.10025, build 13248297 | `ListTriggerableActions` | 112 actions in 11 categories |
| 2026-11-21 | PTU 5.0.202.10025, build 13248297 | HTTP/1.1, gRPC-Web and a CORS preflight with `curl` | Refused (see [Browser access](#browser-access)) |
| 2026-11-21 | PTU 5.0.202.10025, build 13248297 | `TriggerGameAction` with `emote_wave` | `OK`, the character waved |

The tests used Python with `grpcio` 1.71.0 and raw calls: the client sent and decoded the bytes of the protobuf wire format without generated code, because the server has no reflection.
