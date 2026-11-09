---
name: ai-engineering-team
description: Multi-Agent AI Software Engineering System framework by willchen48. Enforces role-based development (Orchestrator, Planner, Architect, Backend, Frontend, QA, Debug, Security Auditing, DevOps, Reporter), standard communication protocols, coding standards, 5-level testing standards, configuration standards, and repository governance.
metadata:
  author: willchen48
  repository: https://github.com/willchen48/AI-Engineering-Team.git
  version: 1.0.0 Alpha
---

# AI Engineering Team

AI Engineering Team is an end-to-end multi-agent software engineering framework developed by [willchen48](https://github.com/willchen48/AI-Engineering-Team.git). It establishes single-responsibility AI agent roles coordinated through a central Orchestrator.

## Core Agents & Documentation

- **Orchestrator (`docs/03-orchestrator.md`)**: Central controller, workflow manager, job dispatcher, artifact collector.
- **Planner Agent (`docs/04-planner-agent.md`)**: Analyzes requirements, establishes scope, produces functional specification.
- **Architect Agent (`docs/05-architect-agent.md`)**: System architecture, module design, database schema, API design, tech stack.
- **Backend Agent (`docs/06-backend-agent.md`)**: API implementation, database layer, server business logic, authentication/authorization.
- **Frontend Agent (`docs/07-frontend-agent.md`)**: UI/UX development, client state, client validation, responsive design, routing.
- **QA Agent (`docs/08-qa-agent.md`)**: Functional testing, integration testing, verification against requirements, bug classification.
- **Debug Agent (`docs/09-debug-agent.md`)**: Root cause analysis, targeted bug fixing without architectural drift, regression prevention.
- **Security Auditing Agent (`docs/10-security-agent.md`)**: Code security audit, API security, authentication & authorization audit, zero-knowledge verification, dependency review.
- **DevOps Agent (`docs/11-devops-agent.md`)**: Build pipeline, containerization, environment configuration, deployment artifacts.
- **Reporter Agent (`docs/12-reporter-agent.md`)**: Comprehensive project summary, release notes, audit ledger, executive documentation.

## Standards & Governance

- **Project Rules (`docs/00-project-rules.md`)**: Master rules, single source of truth, architecture integrity.
- **Agent Communication (`docs/13-agent-communication.md`)**: Orchestrator-centric messaging protocol, artifact exchange, status lifecycle.
- **Repository Structure (`docs/16-repository-structure.md`)**: Strict separation of source, tests, configs, artifacts, logs.
- **Coding Standard (`docs/17-coding-standard.md`)**: Readability first, simplicity over complexity, single responsibility, explicit over implicit, no silent failures.
- **Testing Standard (`docs/18-testing-standard.md`)**: 5 testing levels (Unit, Module, Integration, Workflow, Regression), evidence collection, pass/fail criteria.
- **Configuration Standard (`docs/19-configuration-standard.md`)**: Environment variables, secret separation, security by default, validation rules.
