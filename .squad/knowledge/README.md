# Knowledge Library

**Cold storage for substantial team documents with zero spawn impact.**

This directory contains deep institutional knowledge that agents can read on-demand. Files here are NEVER loaded at spawn time — agents discover and read them only when needed.

## Purpose

- Archive substantial technical documentation (2KB+)
- Preserve architectural context and historical decisions
- Provide deep expertise without bloating spawn templates

## Usage

**Writing:** Create files as `{author}-{topic-slug}.md` with frontmatter (see SKILL.md)

**Reading:** Agents list this directory and read specific files when they need deep context

**Metrics:** Run `bash scripts/knowledge-library-metrics.sh` to verify zero spawn impact
