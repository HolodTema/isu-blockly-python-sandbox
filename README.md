# CodeChef

![](docs/images/full_logo.png)

Browser-based platform for visual programming. User builds a program from blocks,
application generates Python code from block graph, and then runs this code
directly in browser without any backend.

**Production:** https://codechef.ru

**Docs:** https://docs.codechef.ru

## What is it

CodeChef is an educational tool for teaching programming basics. Instead of
typing code, students drag and drop blocks — like in Scratch — but the result
is real Python code which they can read, modify and run.

Main target audience is school 10-14 y.o. students who are just starting with programming,
and their teachers. Interface is fully in Russian, code preview is real Python
which can be shown on lessons.

## Features

- **Visual block editor** — build programs from blocks, code is generated in
  real time and shown side by side.
- **Python in browser** — code runs through Pyodide (Python compiled to
  WebAssembly), no server needed.
- **Real Python syntax** — code preview uses standard Python, not some custom
  language. Students see `print("Hello")`, not `console.log` or pseudo-code.
- **Debugger** — set breakpoints, step through code, inspect variables at
  pause point.
- **Input and output files** — upload CSV/JSON/TXT files which program can
  read, download files which program created.
- **stdin support** — provide input for `input()` calls through special tab.
- **HTTP requests** — `requests` library works through CORS proxy, so students
  can make real HTTP calls from browser.
- **pandas support** — reading HTML/CSV/JSON tables, basic transformations,
  saving results.
- **Project save and load** — save work as `.chef` file and continue later.

## Technologies

Frontend:

- **React 19** — UI;
- **TypeScript 6** — type safety;
- **Vite 8** — bundler and dev server;
- **Blockly 13** — visual block editor;
- **CodeMirror 6** — read-only code preview with breakpoint gutter;
- **Pyodide** — Python runtime in browser.

Architecture:

- **Feature-Sliced Design** — layered project structure;
- **Web Worker** — Pyodide runs in separate thread to keep UI responsive.

Testing:

- **Vitest** — test runner;
- **React Testing Library** — component testing;
- **jsdom** — DOM environment for tests.

Documentation:

- **TypeDoc** — API docs generated from TSDoc comments;
- **VitePress** — documentation site.

## Getting started

Requirements:

- **Node.js 22** or newer;
- **npm 10** or newer.

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

## Available commands

Development:

```bash
npm run dev          # start dev server with hot reload
```

Build and preview production:

```bash
npm run build        # type check and build for production
npm run preview      # preview built version locally
```

Linting (not configured properly yet):

```bash
npm run lint         # run ESLint on whole project
```

Testing:

```bash
npm test              # run tests in watch mode (for development)
npm run test:run      # run tests once and exit (for CI)
npm run test:coverage # run tests with coverage report
```

Documentation:

```bash
npm run docs:gen     # generate API reference from TSDoc comments
npm run docs:dev     # start documentation site with hot reload
npm run docs:build   # build static documentation site
npm run docs:preview # preview built documentation locally
```

## Project structure

Project follows Feature-Sliced Design. Layers from bottom to top:

```
src/
├── shared/          # reusable utilities, UI components, types
├── entities/        # business entities — Python code generators for blocks
├── features/        # user scenarios — run, debug, files, projects
├── widgets/         # self-contained UI blocks — Header, SideConsoleBar
├── pages/           # composition for route — CodeRunnerPage
├── worker/          # Pyodide Web Worker
└── test/            # test setup
```

Public assets:

```
public/
└── assets/
    ├── blockly/     # block definitions and toolbox config (JSON)
    └── python/      # Python scripts loaded into Pyodide at runtime
```

Detailed architecture is described in the documentation — see
[`docs/guide/architecture.md`](docs/guide/architecture.md).

## Deployment

Production version is deployed to VDS at **https://codechef.ru**.

Deployment is automatic: pushing to `dev/main` branch triggers GitHub Actions
workflow which builds project, runs tests and syncs `dist/` folder to server
via rsync.

CORS proxy for HTTP requests runs separately and is available at
`https://proxy.codechef.ru`. It is not part of this repository.

## Documentation

You can read the docs at docs.codechef.com

Full documentation is generated from two sources:

- **API Reference** — from TSDoc comments in source code, using TypeDoc;
- **Guide** — hand-written Markdown files in `docs/guide/`.

To build documentation locally:

```bash
npm run docs:dev
```

## Testing

Unit tests cover:

- **`shared/lib/`** — pure utilities and generic hooks;
- **`entities/blocks/`** — Python code generators for all blocks;
- **`features/`** — hooks for code runner, debugger, files, projects;
- **`widgets/Header/`** — callbacks and visibility logic.

Run all tests:

```bash
npm run test:run
```

Manual testing checklist is in
[`MANUAL_TESTING_CHECKLIST.md`](MANUAL_TESTING_CHECKLIST.md). It covers critical
scenarios which are not automated yet: full run/stop cycles, save/load
roundtrips, debug sessions and file operations.

## Known bugs

- **Stop button does not interrupt code inside functions.** Stop signal is
  checked only between top-level statements. Infinite loop inside a function
  will run until browser tab is closed.
- **Duplicate input file names silently replace old file.** See IN-04 in
  manual testing checklist. Will be fixed later.

## Links

- **Production:** https://codechef.ru
- **CORS proxy:** https://proxy.codechef.ru
- **Docs:** https://docs.codechef.ru


