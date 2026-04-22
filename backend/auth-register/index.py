"""
Регистрация нового пользователя.
POST / — {email, password, name} → {session_id, name}
"""
import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip()

    if not email or not password:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "email and password required"})}
    if len(password) < 6:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "password too short"})}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        conn.close()
        return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "email already registered"})}

    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    display_name = name or email.split("@")[0]
    cur.execute(
        "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id",
        (email, pw_hash, display_name)
    )
    user_id = cur.fetchone()[0]
    session_id = secrets.token_hex(32)
    cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (session_id, user_id))
    conn.commit()
    conn.close()

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"session_id": session_id, "name": display_name})}
