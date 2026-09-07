def _transform_code_to_run_ready(code):
    lines = code.split('\n')
    new_lines = []
    func_stack = []
    block_keywords = ('if ', 'elif ', 'else:', 'for ', 'while ', 'try:', 'except', 'finally:', 'with ', 'class ', 'import ', 'from ')

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped == '' or stripped.startswith('#'):
            new_lines.append(line)
            continue

        indent = line[:len(line) - len(line.lstrip())]
        indent_len = len(indent)

        while func_stack and indent_len <= func_stack[-1]:
            func_stack.pop()

        if stripped.startswith('def ') or stripped.startswith('async def '):
            func_stack.append(indent_len)
            new_lines.append(line)
            continue

        if func_stack:
            new_lines.append(line)
            continue

        if any(stripped.startswith(kw) for kw in block_keywords):
            new_lines.append(line)
            continue

        new_lines.append(f"{indent}await _check_stop_run_code()")
        new_lines.append(line)

    return '\n'.join(new_lines)
