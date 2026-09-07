import asyncio

_is_stop_run_code = False

class StopExecution(Exception):
    pass

async def _check_stop_run_code():
    if _is_stop_run_code:
        raise StopExecution("Code executions was stopped by user")
    await asyncio.sleep(0)
