---
title: "Building resilient agents"
description: "Use the circuit breaker pattern to handle transient failures gracefully."
---

Long-running agents face inevitable transient failures: rate limits, network timeouts, upstream service degradation. The circuit breaker pattern protects your agents from cascading failures by stopping requests before they fail, and automatically recovering when the system stabilizes.

> **The circuit breaker works out of the box.** Squad includes sensible defaults for your agents. You only need to configure it if you want to customize thresholds or backoff timing. See [Configuration](#configuration) for details.

---

## The circuit breaker state machine

The circuit breaker operates in three states:

| State | Behavior | Transition |
|-------|----------|------------|
| **CLOSED** | Requests pass through normally | Open on threshold exceeded |
| **OPEN** | Requests fail fast without attempting | Half-open after backoff timeout |
| **HALF-OPEN** | Allow a single probe request to test recovery | Closed if probe succeeds; open if fails |

When failures exceed the configured threshold within a time window, the breaker **opens** to prevent further failing requests. After the backoff timeout, it enters **half-open** to test if the system has recovered. A successful probe closes the circuit; a failure re-opens it.

---

## Exponential backoff strategy

Instead of hammering a recovering service, the circuit breaker uses exponential backoff:

- **Initial:** 2 minutes
- **Second attempt:** 4 minutes
- **Third attempt:** 8 minutes
- **Cap:** 30 minutes

Each failed probe attempt resets the backoff. This gives flaky services time to recover without overwhelming them.

---

## Configuration

Squad includes sensible defaults — most agents won't need to change these. Configure the circuit breaker in your agent's `squad.config.ts` or initialization code only if you want to customize:

```json
{
  "resilience": {
    "circuitBreaker": {
      "failureThreshold": 5,
      "successThreshold": 2,
      "timeWindow": 60000,
      "initialBackoff": 120000,
      "maxBackoff": 1800000
    }
  }
}
```

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `failureThreshold` | 5 | Open circuit after this many failures |
| `successThreshold` | 2 | Number of consecutive successes during half-open state before closing circuit |
| `timeWindow` | 60s | Count failures within this window |
| `initialBackoff` | 2m | Start backoff at this duration |
| `maxBackoff` | 30m | Cap backoff at this duration |

---

## Persistent state across restarts

The circuit breaker persists its state to disk. If an agent restarts while the circuit is open, it resumes from the same state — it won't immediately resume hammering a still-recovering service. This ensures resilience survives process restarts.

---

## How to apply to custom agents

When building a custom agent, wrap your external calls with circuit breaker protection. This example shows the conceptual pattern (note: a `@squad/resilience` module is planned but not yet available):

```typescript
// Pseudocode: Circuit breaker pattern for external calls
async function callDownstreamAPI(breaker) {
  try {
    // Check circuit state before making the call
    if (breaker.state === 'OPEN') {
      throw new Error('Circuit is open; retrying later');
    }

    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      breaker.recordFailure();
      throw new Error(`API error: ${response.status}`);
    }

    breaker.recordSuccess();
    return response.json();
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}

// Circuit breaker automatically handles state transitions
// and exponential backoff.
try {
  const data = await callDownstreamAPI(circuitBreaker);
} catch (err) {
  if (err.message.includes('Circuit is open')) {
    console.log('Circuit is open; retrying later');
  } else {
    console.error('Request failed:', err);
  }
}
```

The circuit breaker automatically transitions between states and applies exponential backoff. Failures increment a counter within the time window; successes during half-open close the circuit.

---

## Monitoring and observability

Emit metrics on circuit breaker state changes:

- **Circuit opened:** Alert on repeated failures
- **Circuit half-open:** Monitor probe requests
- **Circuit closed:** No action needed

Log state transitions and include the circuit state in agent status or dashboards. This helps you correlate agent degradation with downstream service issues.

---

## See also

- [PR #552](https://github.com/bradygaster/squad/pull/552) — Circuit breaker implementation
- [Failure handling](../reference/tools-and-hooks) — Error boundaries and fallbacks
