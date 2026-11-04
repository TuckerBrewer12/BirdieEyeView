"""Every reply the API sends takes its text from a message catalog.

Client errors, rate limits and success replies come from ``api/messages.py``. Every 5xx reply uses a
generic message from ``api/error_responses.py``, so exception text can never reach the client.
"""

import ast
from pathlib import Path

import api.error_responses as error_responses

API_DIR = Path(__file__).resolve().parents[1] / "api"
CATALOGS = {"messages.py", "error_responses.py"}
GENERIC = {name for name in vars(error_responses) if name.isupper()}


def _status(call: ast.Call):
    """The literal HTTP status of an HTTPException/ScanExtractionError/JSONResponse call, if any."""
    candidates = list(call.args[:1]) + [k.value for k in call.keywords if k.arg == "status_code"]
    for node in candidates:
        if isinstance(node, ast.Constant) and isinstance(node.value, int):
            return node.value
    return None


def _replies():
    """Yield (location, status, text node) for every reply text in the API layer."""
    for path in sorted(API_DIR.rglob("*.py")):
        if path.name in CATALOGS:
            continue
        for node in ast.walk(ast.parse(path.read_text())):
            if not isinstance(node, ast.Call):
                continue
            name = ast.unparse(node.func).rsplit(".", 1)[-1]
            where = f"{path.relative_to(API_DIR.parent)}:{node.lineno}"
            if name in ("HTTPException", "ScanExtractionError"):
                texts = node.args[1:2] + [k.value for k in node.keywords if k.arg == "detail"]
            elif name == "JSONResponse":
                texts = [v for k in node.keywords if k.arg == "content" and isinstance(k.value, ast.Dict)
                         for key, v in zip(k.value.keys, k.value.values)
                         if isinstance(key, ast.Constant) and key.value == "detail"]
            else:
                texts = [k.value for k in node.keywords
                         if k.arg in ("detail", "missing_detail") or (k.arg == "message" and name.endswith("Response"))]
            for text in texts:
                yield where, _status(node) if name in ("HTTPException", "ScanExtractionError", "JSONResponse") else None, text


def test_no_reply_text_is_written_inline():
    inline = [where for where, _, text in _replies() if isinstance(text, (ast.Constant, ast.JoinedStr))]
    assert inline == [], "Move these messages to api/messages.py or api/error_responses.py"


def test_every_5xx_reply_uses_a_generic_message():
    server_errors = [(where, text) for where, status, text in _replies() if status is not None and status >= 500]
    assert server_errors  # the walk finds the 5xx replies at all
    leaking = [where for where, text in server_errors if not (isinstance(text, ast.Name) and text.id in GENERIC)]
    assert leaking == [], "5xx replies must use a constant from api/error_responses.py"

