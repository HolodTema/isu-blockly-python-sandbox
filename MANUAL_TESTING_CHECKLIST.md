# Manual Testing Checklist

This document describes manual test cases for the CodeChef application. Test cases are grouped by feature area and ranked by priority.

Priority levels:
- P0: Critical. Must pass before any release. Covers core functionality and regressions from major refactoring.
- P1: Important. Must pass before a minor release. Covers most user-facing features.
- P2: Secondary. Should pass. Covers edge cases and rare scenarios.

---

## 1. Code Execution

### RUN-01 (P0) Run empty program
Steps:
1. Open the application.
2. Do not add any blocks.
3. Click "Run".

Expected: Output tab shows `# Пустая программа`.

### RUN-02 (P0) Run simple print
Steps:
1. Add `начало программы` block.
2. Attach `вывести ("Hello")` block.
3. Click "Run".

Expected: Output shows `Hello`.

### RUN-03 (P0) Run with input()
Steps:
1. Add `x = int(ввести("Число"))`.
2. Add `вывести (x * 2)`.
3. Click "Run". Enter `5` in the prompt.

Expected: Output shows `10`.

### RUN-04 (P1) Run HTTP request
Steps:
1. Add `подключить библиотеку requests`.
2. Add `HTTP GET` request to a valid URL.
3. Add `вывести (тело ответа)`.
4. Click "Run".

Expected: Output shows response body. No errors in console.

### RUN-05 (P1) Run pandas read_csv with local file
Steps:
1. Load `data_comma.csv` via "Входные файлы".
2. Add `подключить библиотеку pandas as pd`.
3. Add `прочитать CSV-таблицу из "data_comma.csv"` into `df`.
4. Add `показать информацию о таблице df`.
5. Click "Run".

Expected: Output shows DataFrame info. No CORS errors.

### RUN-06 (P1) Run pandas read_html with remote URL
Steps:
1. Add `подключить библиотеку pandas as pd`.
2. Add `прочитать HTML-таблицу из <URL>` into `df`.
3. Click "Run".

Expected: Output shows DataFrame info. Request goes through proxy.

### RUN-07 (P2) Run code with runtime error
Steps:
1. Add `вывести (1 / 0)`.
2. Click "Run".

Expected: Output shows `Error: division by zero`. Progress bar hides. UI is responsive.

### RUN-08 (P0) Stop infinite loop via stop button
Steps:
1. Add block equivalent to `while True: pass`.
2. Click "Run".
3. Wait 1 second.
4. Click the "×" icon next to the progress bar.

Expected: Execution stops within a few seconds. Output shows cancellation message. Progress bar hides.

### RUN-09 (P2) Stop long HTTP request
Steps:
1. Add a loop with a `requests.get(...)` call with `timeout=10`.
2. Click "Run".
3. Click "×" while the request is in flight.

Expected: Execution stops after the current request completes (delay up to the request timeout). No Pyodide fatal errors.

### RUN-10 (P0) Run after stopping
Steps:
1. Run a program with an infinite loop.
2. Stop it via the "×" button.
3. Modify the program (e.g. change output text).
4. Click "Run" again.

Expected: New program runs without stale state. No "Pyodide already fatally failed" error.

---

## 2. Project Save / Load

### PROJ-01 (P0) Save project
Steps:
1. Build a program with at least 3 blocks.
2. Click "Сохранить проект".

Expected: File `project.chef` is downloaded. File is valid JSON with `python` and `blocklyState` keys.

### PROJ-02 (P0) Load project
Steps:
1. Click "Открыть проект".
2. Select a valid `.chef` file.

Expected: Blockly workspace restores all blocks. Code preview matches the saved version. No console errors.

### PROJ-03 (P1) Save then load roundtrip
Steps:
1. Build a program.
2. Save it.
3. Reload the page.
4. Load the saved file.

Expected: State is identical to the pre-reload state.

### PROJ-04 (P2) Load invalid file
Steps:
1. Click "Открыть проект".
2. Select a `.txt` file or a corrupted `.chef` file.

Expected: Error message in console. Application does not crash. Workspace remains unchanged.

---

## 3. Input Files

### IN-01 (P0) Load input file
Steps:
1. Click "Входные файлы".
2. Select `data_comma.csv`.

Expected: File name appears in the toolbar.

### IN-02 (P0) Use input file in code
Steps:
1. Load `data_comma.csv`.
2. Run a script that reads `data_comma.csv`.

Expected: Script reads the file successfully.

### IN-03 (P1) Remove input file
Steps:
1. Load an input file.
2. Click the "×" icon on the file chip.

Expected: File removed from toolbar. Subsequent code that reads the file fails with `FileNotFoundError`.

### IN-04 (P2) Duplicate input file name
Steps:
1. Load `data_comma.csv`.
2. Load `data_comma.csv` again.

Expected: Error message in console. Second file is not added. Toolbar shows only one chip.

### IN-05 (P1) Load multiple input files
Steps:
1. Load `data_comma.csv`.
2. Load `config.json`.

Expected: Both files appear in the toolbar. Both can be used in code.

---

## 4. Output Files

### OUT-01 (P1) Preview output file
Steps:
1. Run a script that saves `out.csv` via `df.to_csv("out.csv")`.
2. Open the "Итоговые файлы" tab.
3. Click on `out.csv` in the list.

Expected: Right pane shows file contents.

### OUT-02 (P1) Download all output files as ZIP
Steps:
1. Run a script that creates two or more output files.
2. Open the "Итоговые файлы" tab.
3. Click "Скачать все файлы".

Expected: ZIP file downloads. Archive contains all output files. Input files are not included.

### OUT-03 (P2) Output files list is empty
Steps:
1. Run a script that creates no files.
2. Open the "Итоговые файлы" tab.

Expected: Message "Программа еще не создавала файлы" is shown.

### OUT-04 (P2) Input files excluded from output list
Steps:
1. Load `data_comma.csv` as input file.
2. Run a script that does not create any output files.
3. Open the "Итоговые файлы" tab.

Expected: `data_comma.csv` is not shown in the list.

---

## 5. Debugging

### DBG-01 (P0) Stop at breakpoint
Steps:
1. Set a breakpoint on a line with `print`.
2. Click "Отладка".

Expected: Execution stops. Debug tab is active. Variables table is populated.

### DBG-02 (P0) View variables at breakpoint
Steps:
1. Set a breakpoint after `x = 5` and `y = "abc"`.
2. Click "Отладка".

Expected: Table contains `x = 5`, `y = 'abc'`.

### DBG-03 (P0) Continue to next breakpoint
Steps:
1. Set two breakpoints in different parts of the program.
2. Start debugging. Stop at first breakpoint.
3. Click "Продолжить".

Expected: Execution stops at the second breakpoint.

### DBG-04 (P0) Step forward
Steps:
1. Set a single breakpoint.
2. Start debugging.
3. Click "Шаг вперед" three times.

Expected: Each click moves execution to the next line. Variables table updates. Current line highlight moves.

### DBG-05 (P0) Finish debugging via UI button
Steps:
1. Start debugging. Stop at a breakpoint.
2. Click "Завершить".

Expected: Debugging ends. Debug tab is cleared. Debug buttons are disabled.

### DBG-06 (P0) Finish debugging via stop button on progress bar
Steps:
1. Start debugging. Stop at a breakpoint.
2. Click the "×" icon next to the progress bar.

Expected: Debugging ends. Debug tab is cleared. Progress bar hides.

### DBG-07 (P1) Debug without breakpoints
Steps:
1. Do not set any breakpoints.
2. Click "Отладка".

Expected: Toast "Поставьте хотя бы одну точку останова". Debugging does not start.

### DBG-08 (P1) Debug with long variable values
Steps:
1. Set a breakpoint after loading a large DataFrame.
2. Start debugging.

Expected: Variables table stays within the debug tab width. Long values wrap or truncate without breaking layout.

### DBG-09 (P1) Debug HTTP request
Steps:
1. Set a breakpoint after `requests.get(...)`.
2. Start debugging.

Expected: Variables `response` and `status_code` are visible.

### DBG-10 (P2) Debug program with an error
Steps:
1. Set a breakpoint before a line that raises an exception.
2. Start debugging.
3. Click "Продолжить".

Expected: Exception message appears in the Output tab. Debugging ends gracefully.

### DBG-11 (P2) Stop debugging while paused at breakpoint
Steps:
1. Start debugging. Stop at a breakpoint.
2. Click "×" on the progress bar.

Expected: Debugging terminates without leaving the worker in a broken state. Subsequent runs work.

---

## 6. UI / General Behavior

### UI-01 (P1) Toggle code panel
Steps:
1. Click the expand/collapse icon in the header.

Expected: Blockly workspace resizes to fill the freed area. Code panel hides or shows. No layout glitches.

### UI-02 (P2) Switch output tabs
Steps:
1. Switch between "Вывод", "Отладка", "Итоговые файлы".

Expected: Content changes accordingly. Active tab is highlighted.

### UI-03 (P2) Resize window to half width
Steps:
1. Resize the browser window to roughly 50% of screen width.

Expected: Header items do not overflow. Progress bar and stop button remain visible. No horizontal scroll.

### UI-04 (P2) Stop button visibility
Steps:
1. Observe the progress bar area when idle.
2. Run a program.

Expected: Stop button is hidden when idle. Stop button becomes visible when a program is running or debugging.

### UI-05 (P2) Toast on missing breakpoints
Steps:
1. Click "Отладка" without setting breakpoints.

Expected: Toast message appears and disappears after ~3 seconds.

---

## 7. Regression Scenarios (After Refactoring)

These cases are designed to catch regressions introduced by large structural changes (for example, migration to a new framework).

### REG-01 (P0) Run, stop, run again
Steps:
1. Run a simple program.
2. Run an infinite loop and stop it.
3. Run a simple program again.

Expected: All three runs behave correctly. No leftover state between runs.

### REG-02 (P0) Save, reload, load, run
Steps:
1. Build a program.
2. Save it.
3. Reload the page.
4. Load the saved file.
5. Run the program.

Expected: Output matches a direct run without save/load.

### REG-03 (P0) Debug, exit, run
Steps:
1. Start debugging a program with a breakpoint.
2. Exit debugging via "×".
3. Run the same program without debugging.

Expected: Program runs to completion. No debugger-related errors.

### REG-04 (P1) Load input file, run, remove, run again
Steps:
1. Load `data_comma.csv`.
2. Run a program that reads it.
3. Remove the file.
4. Run the same program again.

Expected: Second run fails with a clear `FileNotFoundError` in the output.

### REG-05 (P1) HTTP request after pandas usage
Steps:
1. Run a program that uses pandas.
2. Run a program that makes an HTTP request.

Expected: Both work. Proxy patching does not break `requests`.

### REG-06 (P2) Multiple sequential debug sessions
Steps:
1. Start debugging, stop at breakpoint, exit.
2. Start debugging again immediately.
3. Repeat three times.

Expected: Every session starts and ends cleanly. No worker failures.

---

## Execution Notes

- Run all P0 cases before every release.
- Run all P0 and P1 cases before merging into main.
- Run P2 cases before major releases or after significant refactoring.
- Record results in a separate file or issue tracker, not in this document.
- If a case fails, file an issue and link it to the case ID.

