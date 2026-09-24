"""RFC privacy guard (api/pii.py) + strict registry matching (api/sanctions.py). No DB needed."""
from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.testclient import TestClient

from api.pii import RfcRedactionMiddleware, public_rfc, redact_person_rfcs
from api.sanctions import _match, _RegistryIndex, normalize_name

PERSON = "PEGJ800101AB1"   # 13 chars, synthetic
COMPANY = "ABC010101AB1"   # 12 chars, synthetic


def test_public_rfc_whitelists_company_only():
    assert public_rfc(COMPANY) == COMPANY
    assert public_rfc(f" {COMPANY.lower()} ") == COMPANY
    for bad in (PERSON, "10861.0", "sin_RFC", "", None):
        assert public_rfc(bad) is None


def test_redact_text_keeps_company_and_codes():
    txt = f"RFC: {PERSON} | empresa {COMPANY} | proc LA-012M7B997-E-1-2024"
    out = redact_person_rfcs(txt)
    assert PERSON not in out and COMPANY in out and "LA-012M7B997-E-1-2024" in out
    assert redact_person_rfcs("PEGJ801301AB1") == "PEGJ801301AB1"  # month 13: not an RFC


def test_middleware_redacts_json_and_skips_other_types():
    app = FastAPI()
    app.add_middleware(RfcRedactionMiddleware)
    app.get("/j")(lambda: JSONResponse({"memo": f"RFC {PERSON}", "rfc": COMPANY, "n": "Ñ"}))
    app.get("/t")(lambda: PlainTextResponse(PERSON))
    c = TestClient(app)
    body = c.get("/j").json()
    assert PERSON not in body["memo"] and body["rfc"] == COMPANY and body["n"] == "Ñ"
    assert c.get("/t").text == PERSON  # non-JSON untouched; call sites must use public_rfc


def test_sanction_match_is_strict():
    assert normalize_name("Constructora Pérez, S.A. de C.V.") == "CONSTRUCTORA PEREZ"
    idx = _RegistryIndex(
        [{"id": 1, "rfc": None, "company_name": "GRUPO CONSTRUCTOR DEL NORTE SA DE CV"}],
        "rfc", "company_name", {"GRUPO CONSTRUCTOR DEL NORTE": 1},
    )
    assert _match(idx, "GRUPO CONSTRUCTOR DE LA COSTA", None, 20) == []  # old 20-char prefix bug
    assert _match(idx, "Grupo Constructor del Norte S.A. de C.V.", None, 20)[0]["match_basis"] == "name"
