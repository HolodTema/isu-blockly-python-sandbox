import sys
import micropip
sys.stdout = _worker_stdout

await micropip.install('pyodide-http')
import pyodide_http
pyodide_http.patch_all()
