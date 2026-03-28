---
title: "Notification routing"
description: "Route agent notifications across channels by severity, agent, or topic."
---

## Problem: Alert fatigue

When you run 8+ Ralph instances funneling alerts into one Slack channel, the noise becomes overwhelming. You need a way to route notifications to the right people, channels, or systems based on severity, agent, or topic.

## Pub-sub routing

Squad's notification system decouples agents (producers) from notification consumers. Routes are defined as **routing rules** that match against notification metadata and forward messages to configured channels.

**Key benefits:**
- **Decouple agents from channels** — Agents don't know where alerts go
- **Filter by severity, agent, or topic** — Route critical alerts to PagerDuty, info logs to Discord
- **Provider-agnostic** — Route to Slack, Teams, Discord, webhooks, or custom endpoints
- **Reuse rules across squads** — DRY routing configurations

## Supported providers

| Provider | Use case |
|----------|----------|
| Slack | Team chat, channel notifications |
| Microsoft Teams | Enterprise messaging |
| Discord | Community, dev team channels |
| Webhooks | Generic HTTP endpoints, custom logic |
| Custom endpoints | Your infrastructure (Datadog, PagerDuty, etc.) |

## Configuration

Squad does **not** currently ship a built-in routing engine or a `.squad/notification-routes.yaml` file.
Instead, Squad agents emit structured notification events (via MCP) to your own notification/alerting stack
(for example, a Slack bot, PagerDuty bridge, or custom MCP notification server), and **that external system**
is responsible for routing messages to the right channels.

Below is an example of how a **custom notification server** that consumes Squad events might model routing
rules. This configuration lives in your notification infrastructure, not in Squad itself:

```yaml
# squad-notifications.yaml (example for your notification server)
routes:
  - name: critical-alerts
    match:
      severity: critical
    destinations:
      - type: slack
        channel: "#emergency"
        mention: "@incident-commander"

  - name: ralph-verbose
    match:
      agent: ralph
      severity: debug
    destinations:
      - type: discord
        channel: "dev-logs"

  - name: pagerduty-integration
    match:
      severity: [critical, warning]
    destinations:
      - type: webhook
        url: https://events.pagerduty.com/v2/enqueue
        auth: token
```

## Real-world example

**Scenario:** You have 3 Ralph agents running load tests in production. You want:
- **Critical errors** → PagerDuty + Slack #incident-response
- **Warnings** → Slack #alerts
- **Info/debug** → Discord #dev-logs (for post-analysis)

```yaml
routes:
  - name: ralph-critical
    match:
      agent: ralph
      severity: critical
    destinations:
      - type: webhook
        url: https://pagerduty.api.example.com/v2/events
      - type: slack
        channel: "#incident-response"
        mention: "@on-call"

  - name: ralph-warnings
    match:
      agent: ralph
      severity: warning
    destinations:
      - type: slack
        channel: "#alerts"

  - name: ralph-debug
    match:
      agent: ralph
      severity: [info, debug]
    destinations:
      - type: discord
        channel: "load-test-logs"
```

## Rule matching

Routes are evaluated top-to-bottom. The first rule that matches handles routing. If no rule matches, the notification is logged but not routed.

**Match operators (conceptual):**
- **Exact match:** `severity: critical`
- **List match (OR):** `severity: [critical, warning]`
- **Wildcard (conceptual):** pattern-based matches, for example treating `"ralph*"` as matching `ralph-1`, `ralph-staging`, etc.
- **Negation (conceptual):** rules that match when a field does **not** have a given value, for example severity is anything except `debug`.

## Destination configuration

Each destination supports provider-specific options:

```yaml
- type: slack
  channel: "#alerts"          # Required
  mention: "@team"            # Optional: mention users/groups
  emoji: ":warning:"          # Optional: message emoji
  thread: true                # Optional: reply in thread

- type: teams
  channel: "Notifications"    # Required
  importance: high            # Optional: message priority

- type: webhook
  url: https://example.com/alerts
  auth: token                 # Optional: bearer or api-key
  timeout: 10                 # Optional: timeout in seconds
```

## Testing routes

After defining your routing rules and destinations, test them by triggering sample notifications from your agents (or MCP servers) and verifying where they land.

- Start a staging or test environment.
- Trigger notifications with different severities, agents, and topics (for example, from Ralph or another agent).
- Confirm that each notification is delivered to the expected channels (Slack, Teams, webhooks, etc.) based on your routing rules.

## See also

- [Notifications](notifications.md) — Message templates and formatting
- [Ralph](ralph.md) — Load testing agent
- [Source PR: bradygaster/squad#625](https://github.com/bradygaster/squad/pull/625)
