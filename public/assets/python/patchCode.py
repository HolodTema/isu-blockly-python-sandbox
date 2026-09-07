import pandas as pd
import requests
from io import StringIO

_PROXY_PREFIX = "http://130.49.175.150:8080/"

if not hasattr(pd, '_PATCH_APPLIED'):
    _original_read_html = pd.read_html
    _original_read_json = pd.read_json
    _original_read_csv = pd.read_csv
    _original_request = requests.request

    def _ensure_proxy(url):
        if isinstance(url, str) and not url.startswith(_PROXY_PREFIX):
            if url.startswith(('http://', 'https://')):
                return _PROXY_PREFIX + url.lstrip('/')
        return url

    def _fetch_url_content(url, *args, **kwargs):
        proxied_url = _ensure_proxy(url)
        response = _original_request('GET', proxied_url, *args, **kwargs)
        response.raise_for_status()
        return response.text

    def _patched_read_html(io, *args, **kwargs):
        if isinstance(io, str) and io.startswith(('http://', 'https://')):
            html = _fetch_url_content(io)
            return _original_read_html(html, *args, **kwargs)
        else:
            return _original_read_html(io, *args, **kwargs)

    def _patched_read_json(io, *args, **kwargs):
        if isinstance(io, str) and io.startswith(('http://', 'https://')):
            json_str = _fetch_url_content(io)
            return _original_read_json(json_str, *args, **kwargs)
        else:
            return _original_read_json(io, *args, **kwargs)

    def _patched_read_csv(io, *args, **kwargs):
        if isinstance(io, str) and io.startswith(('http://', 'https://')):
            csv_str = _fetch_url_content(io)
            return _original_read_csv(StringIO(csv_str), *args, **kwargs)
        else:
            return _original_read_csv(io, *args, **kwargs)

    def _patched_request(method, url, *args, **kwargs):
        url = _ensure_proxy(url)
        return _original_request(method, url, *args, **kwargs)

    pd.read_html = _patched_read_html
    pd.read_json = _patched_read_json
    pd.read_csv = _patched_read_csv
    requests.request = _patched_request

    pd._PATCH_APPLIED = True
