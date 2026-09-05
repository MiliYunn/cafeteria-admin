# Graph Report - apcafeteria-frontend  (2026-08-27)

## Corpus Check
- 33 files · ~12,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 323 nodes · 464 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- resource-page.ts
- ResourcePage
- development
- dependencies
- compilerOptions
- devDependencies
- resources.ts
- scripts
- Shell
- AuthService
- APCafeteria Admin
- tsconfig.app.json
- Uploads
- tsconfig.spec.json
- app.config.ts
- fixture-server.mjs
- Overview
- .prettierrc.json

## God Nodes (most connected - your core abstractions)
1. `ResourcePage` - 28 edges
2. `errorMessage()` - 22 edges
3. `AuthService` - 18 edges
4. `compilerOptions` - 14 edges
5. `ApiService` - 12 edges
6. `Shell` - 12 edges
7. `ActivityService` - 11 edges
8. `Uploads` - 10 edges
9. `Dialog` - 10 edges
10. `Icon` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AuthService` --references--> `ApiResponse`  [EXTRACTED]
  src/app/core/auth.service.ts → src/app/core/api.service.ts
- `Tokens` --references--> `Entity`  [EXTRACTED]
  src/app/core/auth.service.ts → src/app/core/api.service.ts

## Import Cycles
- None detected.

## Communities (19 total, 2 thin omitted)

### Community 0 - "resource-page.ts"
Cohesion: 0.08
Nodes (24): Activity, ActivityService, Injectable, ADMIN_BASE, API_BASE, ApiService, Entity, Option (+16 more)

### Community 1 - "ResourcePage"
Cohesion: 0.08
Nodes (9): errorMessage(), Field, fieldValidators(), Login, Component, Profile, Component, ResourcePage (+1 more)

### Community 2 - "development"
Cohesion: 0.05
Nodes (39): architect, projectType, root, sourceRoot, build, serve, test, builder (+31 more)

### Community 3 - "dependencies"
Cohesion: 0.07
Nodes (27): @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/router, @fontsource-variable/dm-sans (+19 more)

### Community 4 - "compilerOptions"
Cohesion: 0.09
Nodes (21): dom, ES2022, angularCompilerOptions, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, compileOnSave, compilerOptions (+13 more)

### Community 5 - "devDependencies"
Cohesion: 0.10
Nodes (21): @angular/build, @angular/compiler-cli, jsdom, devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, jsdom (+13 more)

### Community 6 - "resources.ts"
Cohesion: 0.13
Nodes (12): active, basicColumns, Column, description, email, password, Resource, resourcePayload() (+4 more)

### Community 7 - "scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, build, format, format:check, start, test (+4 more)

### Community 8 - "Shell"
Cohesion: 0.20
Nodes (3): Shell, Component, HostListener

### Community 9 - "AuthService"
Cohesion: 0.24
Nodes (3): ApiResponse, AuthService, Injectable

### Community 10 - "APCafeteria Admin"
Cohesion: 0.20
Nodes (9): APCafeteria Admin, Authentication, Checks, Deploying the CSR build, Existing backend limitations surfaced in the UI, List filters, Pages and API coverage, Project structure (+1 more)

### Community 11 - "tsconfig.app.json"
Cohesion: 0.20
Nodes (9): src/**/*.spec.ts, compilerOptions, outDir, types, exclude, extends, include, src/**/*.ts (+1 more)

### Community 13 - "tsconfig.spec.json"
Cohesion: 0.22
Nodes (8): vitest/globals, compilerOptions, outDir, types, extends, include, src/**/*.ts, ./tsconfig.json

### Community 14 - "app.config.ts"
Cohesion: 0.38
Nodes (4): App, appConfig, routes, Component

### Community 15 - "fixture-server.mjs"
Cohesion: 0.38
Nodes (6): now, optionKeys, row(), server, stores, tokens()

### Community 17 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): overrides, printWidth, singleQuote

## Knowledge Gaps
- **112 isolated node(s):** `singleQuote`, `printWidth`, `overrides`, `$schema`, `version` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `errorMessage()` connect `ResourcePage` to `resource-page.ts`, `Shell`, `Uploads`, `Overview`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `ResourcePage` connect `ResourcePage` to `resource-page.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `Shell` connect `Shell` to `resource-page.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `singleQuote`, `printWidth`, `overrides` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `resource-page.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07946127946127945 - nodes in this community are weakly interconnected._
- **Should `ResourcePage` be split into smaller, more focused modules?**
  _Cohesion score 0.08048780487804878 - nodes in this community are weakly interconnected._
- **Should `development` be split into smaller, more focused modules?**
  _Cohesion score 0.05384615384615385 - nodes in this community are weakly interconnected._