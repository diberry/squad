# Notification routing

> ⚠️ **Experimental** — Squad is alpha software. APIs, commands, and behavior may change between releases.

**Try this to route alerts by type:**
```
Route security alerts to the security channel and daily digests to the digest channel
```

**Try this to set up channel routing:**
```
Configure notification routing so each notification type goes to its own channel
```

When your squad grows, notifications flood a single channel. Failure alerts drown in daily briefings, tech news buries security findings, and everything gets ignored. The notification-routing skill fixes this with **topic-based routing** — agents tag notifications with a channel type, and a routing function sends them to the right destination.

---

## When you need this

You're hitting one or more of these symptoms:

- Important alerts get missed because they're buried in routine notifications
- Team members turn off notifications entirely (signal overwhelm)
- New team members ask "where do I look for X?"

If all your notifications land in one channel, you have a routing problem.

---

## How it works

Notification routing uses a pub-sub pattern with three components:

| Component | Purpose | Location |
|-----------|---------|----------|
| **Channel config** | Maps notification types to channel identifiers | `.squad/teams-channels.json` |
| **CHANNEL: tag** | Agents prefix output with the target channel type | Agent output |
| **Routing dispatcher** | Reads the tag, looks up the channel, and sends the message | `.squad/notify-adapter.sh` |

The routing config and `CHANNEL:` tags stay the same across deployments. Only the adapter changes per platform (Teams, Slack, Discord, webhook).

---

## Set up channel routing

### 1. Define your channel map

Create `.squad/teams-channels.json` to map notification types to channels:

```json
{
  "teamId": "your-team-id",
  "channels": {
    "notifications": "squad-alerts",
    "tech-news": "tech-news",
    "security": "security-findings",
    "releases": "release-announcements",
    "daily-digest": "daily-digest"
  }
}
```

This file lives in `.squad/` so it's git-tracked and shared across the team.

### 2. Use channel IDs for platforms that need them

For platforms like Teams or Slack that use opaque channel IDs, store the resolved ID alongside the display name:

```json
{
  "channels": {
    "notifications": { "name": "squad-alerts", "id": "channel-id-opaque-string" },
    "security": { "name": "security-findings", "id": "channel-id-opaque-string" }
  }
}
```

Resolve channel IDs once at setup. Use IDs at runtime — never match on display names.

### 3. Tag notifications with CHANNEL:

Agents prefix their output with `CHANNEL:<type>` to signal where the notification goes:

```
CHANNEL:security
Worf found 3 new CVEs in dependency scan: lodash@4.17.15, minimist@1.2.5
```

If no `CHANNEL:` tag is present, the dispatcher routes to the default `notifications` channel.

### 4. Wire the routing dispatcher

The dispatcher reads the `CHANNEL:` tag, looks up the target in your channel config, and sends the message through your platform adapter:

```bash
dispatch_notification() {
  local raw_output="$1"
  local channel="notifications"  # default

  if echo "$raw_output" | grep -qE '^CHANNEL:[a-z][a-z0-9-]*'; then
    channel=$(echo "$raw_output" | head -1 | cut -d: -f2)
    raw_output=$(echo "$raw_output" | tail -n +2)
  fi

  send_notification --channel "$channel" --message "$raw_output"
}
```

### 5. Swap the platform adapter

The routing layer is provider-agnostic. Point your adapter at whatever platform you use:

```
.squad/notify-adapter.sh   # Teams / Slack / Discord / webhook — swappable
```

---

## Anti-patterns

Avoid these common mistakes:

| Anti-pattern | Why it fails | Fix |
|--------------|-------------|-----|
| Send all types to one channel | Everything competes for attention — alerts get buried | Route each type to its own channel |
| Use display names as identifiers | Name collisions across teams or renames break routing | Resolve channel IDs at setup, use IDs at runtime |

---

## The distributed systems angle

This is **pub-sub with topic routing** — the same principle as Kafka topics, RabbitMQ routing keys, and AWS SNS topic filtering. Each notification type is a topic. Each channel subscribes to the topics it cares about. Route by type, not by volume.

---

## See also

- [Notifications](./notifications.md) — set up basic notification delivery
- [Skills](./skills.md) — how skills encode reusable team knowledge
- [Distributed mesh](./distributed-mesh.md) — pub-sub patterns at the infrastructure level
