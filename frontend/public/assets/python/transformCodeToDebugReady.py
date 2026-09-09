def _transformCodeToDebugReady(code):
    lines = code.split('\n')
    new_lines = []
    func_stack = []  # стек отступов всех функций (def и async def)
    block_keywords = ('if ', 'elif ', 'else:', 'for ', 'while ', 'try:', 'except', 'finally:', 'with ', 'class ', 'import ', 'from ')

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped == '' or stripped.startswith('#'):
            new_lines.append(line)
            continue

        indent = line[:len(line) - len(line.lstrip())]
        indent_len = len(indent)

        # Проверяем выход из функций: если текущий отступ <= отступа вершины стека, выходим
        while func_stack and indent_len <= func_stack[-1]:
            func_stack.pop()

        # Проверяем, не начинается ли строка с определения функции (def или async def)
        if stripped.startswith('def ') or stripped.startswith('async def '):
            func_stack.append(indent_len)
            new_lines.append(line)
            continue

        # Если мы внутри любой функции (стек не пуст), просто копируем строку
        if func_stack:
            new_lines.append(line)
            continue

        # Если мы не внутри функции
        # Пропускаем строки, начинающиеся с ключевых слов блоков
        if any(stripped.startswith(kw) for kw in block_keywords):
            new_lines.append(line)
            continue
        # Все остальные строки – исполняемые на глобальном уровне, вставляем await
        new_lines.append(f"{indent}await _check_breakpoint({i})")
        new_lines.append(line)

    return '\n'.join(new_lines)
