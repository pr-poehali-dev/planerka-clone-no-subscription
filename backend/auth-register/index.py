"""
Регистрация нового пользователя по номеру телефона и ФИО.
POST / — {phone, fio} → {session_id, fio}
"""
import json
import os
import secrets
import re
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    return digits


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    phone = normalize_phone(body.get("phone") or "")
    fio = (body.get("fio") or "").strip()

    if len(phone) < 10:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите корректный номер телефона"})}
    if len(fio) < 2:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите ФИО"})}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("SELECT id, fio FROM users WHERE phone = %s", (phone,))
    existing = cur.fetchone()

    if existing:
        user_id, saved_fio = existing
        session_id = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"session_id": session_id, "fio": saved_fio, "existing": True})}

    cur.execute(
        "INSERT INTO users (phone, fio, email, password_hash, name) VALUES (%s, %s, %s, '', %s) RETURNING id",
        (phone, fio, phone + "@phone.local", fio.split()[0] if fio else "")
    )
    user_id = cur.fetchone()[0]
    session_id = secrets.token_hex(32)
    cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user_id))
    conn.commit()
    conn.close()

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"session_id": session_id, "fio": fio, "existing": False})}