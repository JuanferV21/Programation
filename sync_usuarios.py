#!/usr/bin/env python3
import os
import cx_Oracle
import mysql.connector
from datetime import datetime

# ----- PARÁMETROS DE CONEXIÓN -----
# Las credenciales se obtienen de variables de entorno
ora_conn = cx_Oracle.connect(
    user=os.getenv("ORACLE_USER"),
    password=os.getenv("ORACLE_PASSWORD"),
    dsn=os.getenv("ORACLE_DSN"),
)

my_conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    port=int(os.getenv("MYSQL_PORT", "3306")),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DB"),  # <- cambia esto por tu réplica
)

def get_last_sync(cursor):
    cursor.execute("""
      SELECT valor
        FROM sync_control
       WHERE clave='usuarios_last_sync'
    """)
    row = cursor.fetchone()
    return datetime.fromisoformat(row[0]) if row and row[0] else datetime.min

def set_last_sync(cursor, ts):
    iso = ts.strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute("""
      INSERT INTO sync_control(clave, valor)
      VALUES('usuarios_last_sync', %s)
      ON DUPLICATE KEY UPDATE valor = VALUES(valor)
    """, (iso,))

def sync_usuarios():
    ora_cur = ora_conn.cursor()
    my_cur  = my_conn.cursor()

    last_sync = get_last_sync(my_cur)

    # 1) Traer cambios de Oracle
    qry = """
      SELECT id, username, password_hash, salt, email,
             TO_CHAR(created_at,'YYYY-MM-DD HH24:MI:SS'),
             TO_CHAR(last_updated,'YYYY-MM-DD HH24:MI:SS')
        FROM usuarios
       WHERE last_updated > TO_DATE(:ls, 'YYYY-MM-DD HH24:MI:SS')
    """
    ora_cur.execute(qry, ls=last_sync.strftime('%Y-%m-%d %H:%M:%S'))
    rows = ora_cur.fetchall()

    # 2) Upsert en MySQL
    for uid, user, pwh, salt, email, created, updated in rows:
        my_cur.execute("""
          INSERT INTO usuarios
            (id, username, password_hash, salt, email, created_at, last_updated)
          VALUES (%s,%s,%s,%s,%s,%s,%s)
          ON DUPLICATE KEY UPDATE
            username      = VALUES(username),
            password_hash = VALUES(password_hash),
            salt          = VALUES(salt),
            email         = VALUES(email),
            last_updated  = VALUES(last_updated)
        """, (uid, user, pwh, salt, email, created, updated))

    # 3) Actualizar sello de tiempo
    if rows:
        newest = max(datetime.fromisoformat(r[6]) for r in rows)
        set_last_sync(my_cur, newest)

    my_conn.commit()
    ora_cur.close()
    my_cur.close()

if __name__ == '__main__':
    try:
        sync_usuarios()
    finally:
        ora_conn.close()
        my_conn.close()
