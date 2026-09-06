import asyncio
import js
import sys
import json

async def _check_breakpoint(lineno):
    js.console.log(f'check_breakpoint called with lineno={lineno}')

    if lineno in _debugger_state['breakpoints'] or _debugger_state['step_mode']:
        _debugger_state['step_mode'] = False

        js.console.log(f'Breakpoint matched! lineno={lineno}, breakpoints={_debugger_state["breakpoints"]}')
        frame = sys._getframe(1)
        _debugger_state['frame'] = frame
        _debugger_state['current_line'] = lineno

        # Собираем переменные
        locals_ = frame.f_locals
        import builtins
        builtin_names = dir(builtins)
        safe_vars = {}
        for k, v in locals_.items():
            if k.startswith('_') or k in builtin_names:
                continue
            try:
                s = repr(v)
                if len(s) > 1000:
                    s = s[:1000] + '... (обрезано)'
                safe_vars[str(k)] = s
            except Exception:
                safe_vars[str(k)] = '<непредставимо>'

        # Записываем в файл
        data = {'line': lineno, 'variables': safe_vars}
        with open('/home/pyodide/__debug_data.json', 'w') as f:
            json.dump(data, f)

        # Отправляем сигнал
        try:
            js.postMessage('break')
            js.console.log('Signal "break" sent')
        except Exception as e:
            js.console.error(f'postMessage error: {e}')

        loop = asyncio.get_running_loop()
        future = loop.create_future()
        _debugger_state['future'] = future
        await future
    else:
        js.console.log(f'lineno {lineno} not in breakpoints {_debugger_state["breakpoints"]}')
    return None
