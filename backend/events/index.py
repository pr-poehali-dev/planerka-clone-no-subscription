"""
События: получить, добавить, удалить.
GET    / — список событий пользователя
POST   / — добавить событие
DELETE / — удалить событие (id в body)
"""

import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_user_id(cur, session_id: str):
    cur.execute(
        "SELECT user_id FROM sessions WHERE id = %s AND expires_at > NOW()",
        (session_id,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    session_id = event.get("headers", {}).get("x-session-id", "")
    if not session_id:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

    method = event.get("httpMethod", "GET")
    conn = get_conn()
    cur = conn.cursor()

    user_id = get_user_id(cur, session_id)
    if not user_id:
        conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "invalid session"})}

    # GET — список событий
    if method == "GET":
        cur.execute(
            "SELECT id, title, event_time, event_day, event_month, event_year, type "
            "FROM events WHERE user_id = %s ORDER BY event_year, event_month, event_day, event_time",
            (user_id,)
        )
        rows = cur.fetchall()
        conn.close()
        result = [
            {"id": r[0], "title": r[1], "time": r[2], "day": r[3], "month": r[4], "year": r[5], "type": r[6]}
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result)}

    body = json.loads(event.get("body") or "{}")

    # POST — создать
    if method == "POST":
        title = (body.get("title") or "").strip()
        time = body.get("time") or "10:00"
        day = int(body.get("day") or 1)
        month = int(body.get("month") or 4)
        year = int(body.get("year") or 2026)
        etype = body.get("type") or "task"
        if not title:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "title required"})}
        cur.execute(
            "INSERT INTO events (user_id, title, event_time, event_day, event_month, event_year, type) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (user_id, title, time, day, month, year, etype)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": new_id, "title": title, "time": time, "day": day, "month": month, "year": year, "type": etype})}

    # DELETE — удалить
    if method == "DELETE":
        event_id = body.get("id")
        if not event_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
        cur.execute("UPDATE events SET title = title WHERE id = %s AND user_id = %s RETURNING id", (event_id, user_id))
        if not cur.fetchone():
            conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
        cur.execute("DELETE FROM events WHERE id = %s AND user_id = %s", (event_id, user_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
