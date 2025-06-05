-- 1. Tabla de usuarios
CREATE TABLE usuarios (
  id             INT(10) UNSIGNED      PRIMARY KEY,
  username       VARCHAR(50)           NOT NULL UNIQUE,
  password_hash  CHAR(64)              NOT NULL,
  salt           CHAR(32)              NOT NULL,
  email          VARCHAR(100),
  created_at     DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated   DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  intentos       TINYINT UNSIGNED      NOT NULL DEFAULT 0,
  bloqueado      TINYINT(1)            NOT NULL DEFAULT 0
);

-- 2. Tabla de auditoría
CREATE TABLE registroactividad (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  tabla         VARCHAR(50),
  operacion     VARCHAR(10),
  id_registro   INT(10) UNSIGNED,
  fecha         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_origen     VARCHAR(45)
);

-- 3. Tabla de control de sincronización
CREATE TABLE sync_control (
  clave VARCHAR(50)   PRIMARY KEY,
  valor VARCHAR(30)
);

-- Insert inicial para forzar sincronización completa la primera vez
INSERT INTO sync_control(clave, valor) VALUES('usuarios_last_sync','1970-01-01 00:00:00')
  ON DUPLICATE KEY UPDATE valor=valor;
