"""Bundle the static Awareness Map page into the vote service Worker."""
import json
from pathlib import Path

root = Path(__file__).parent
site = root / "site"
assets = {
    "/": ((site / "index.html").read_text(), "text/html; charset=utf-8"),
    "/index.html": ((site / "index.html").read_text(), "text/html; charset=utf-8"),
    "/styles.css": ((site / "styles.css").read_text(), "text/css; charset=utf-8"),
    "/app.js": ((site / "app.js").read_text(), "application/javascript; charset=utf-8"),
    "/config.js": ("window.AWARENESS_API_URL = location.origin;\n", "application/javascript; charset=utf-8"),
}
(root / "dist/server/static.js").write_text("export const ASSETS = " + json.dumps(assets) + ";\n")
