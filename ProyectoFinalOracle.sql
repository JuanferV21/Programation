-- Crear la secuencia para auditoría
CREATE SEQUENCE seq_registroactividad
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;
/



-- Crear la tabla de auditoría
CREATE TABLE registroactividad (
  id            NUMBER        PRIMARY KEY,
  tabla         VARCHAR2(50),
  operacion     VARCHAR2(10),
  id_registro   NUMBER,
  fecha         TIMESTAMP     DEFAULT SYSTIMESTAMP,
  ip_origen     VARCHAR2(45)
);
/



-- Crear la tabla de usuarios
CREATE TABLE usuarios (
  id             NUMBER(10)     PRIMARY KEY,
  username       VARCHAR2(50)   UNIQUE NOT NULL,
  password_hash  VARCHAR2(64)   NOT NULL,
  salt           VARCHAR2(32)   NOT NULL,
  email          VARCHAR2(100),
  created_at     DATE           DEFAULT SYSDATE,
  last_updated   DATE           DEFAULT SYSDATE,
  intentos       NUMBER(3)      DEFAULT 0 NOT NULL,
  bloqueado      CHAR(1)        DEFAULT 'N' CHECK (bloqueado IN ('Y','N'))
);
/

SELECT * FROM usuarios;

INSERT INTO usuarios (id, username, password_hash, salt, email, last_updated)
VALUES (999, 'oracle_test', 'hash_dummy', 'salt_dummy', 'o@ej.com', SYSTIMESTAMP);
COMMIT;


SELECT * FROM registroactividad
 WHERE tabla='USUARIOS' AND id_registro=999
 ORDER BY fecha DESC;


-- trigger de auditoría sobre USUARIOS
CREATE OR REPLACE TRIGGER trg_usuarios_audit
AFTER INSERT OR UPDATE OR DELETE
ON usuarios
FOR EACH ROW
DECLARE
  v_ip VARCHAR2(45);
BEGIN
  -- Obtener IP del cliente (si la sesión la provee)
  v_ip := SYS_CONTEXT('USERENV','IP_ADDRESS');

  IF INSERTING THEN
    INSERT INTO registroactividad
      (id, tabla, operacion, id_registro, fecha, ip_origen)
    VALUES
      (seq_registroactividad.NEXTVAL, 'USUARIOS', 'INSERT',
       :NEW.id, SYSTIMESTAMP, v_ip);
  ELSIF UPDATING THEN
    INSERT INTO registroactividad
      (id, tabla, operacion, id_registro, fecha, ip_origen)
    VALUES
      (seq_registroactividad.NEXTVAL, 'USUARIOS', 'UPDATE',
       :NEW.id, SYSTIMESTAMP, v_ip);
  ELSIF DELETING THEN
    INSERT INTO registroactividad
      (id, tabla, operacion, id_registro, fecha, ip_origen)
    VALUES
      (seq_registroactividad.NEXTVAL, 'USUARIOS', 'DELETE',
       :OLD.id, SYSTIMESTAMP, v_ip);
  END IF;
END;
/


INSERT INTO usuarios (id, username, password_hash, salt, email, created_at, last_updated)
VALUES (998, 'sync_test', 'abc', '123', 'a@b.com', SYSTIMESTAMP, SYSTIMESTAMP);
COMMIT;


