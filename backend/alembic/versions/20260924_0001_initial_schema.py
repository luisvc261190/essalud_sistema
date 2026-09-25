"""initial schema

Revision ID: 20260924_0001
Revises:
Create Date: 2026-09-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260924_0001"
down_revision = None
branch_labels = None
depends_on = None


def _check(name, column, *values):
    valid = ", ".join(f"'{v}'" for v in values)
    return sa.CheckConstraint(f"{column} IN ({valid})", name=name)


def upgrade() -> None:
    # ------------- SEGURIDAD / ADMINISTRACION -------------
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(50), nullable=False, unique=True),
        sa.Column("descripcion", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("codigo", sa.String(100), nullable=False, unique=True),
        sa.Column("descripcion", sa.String(255), nullable=True),
    )

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "role_id",
            sa.Integer(),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "permission_id",
            sa.Integer(),
            sa.ForeignKey("permissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("role_id", "permission_id"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario", sa.String(50), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("nombres", sa.String(100), nullable=True),
        sa.Column("apellidos", sa.String(100), nullable=True),
        sa.Column("email", sa.String(150), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role_id",
            sa.Integer(),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "role_id"),
    )

    # ------------- NUCLEO DEL ACTO ADMINISTRATIVO -------------
    op.create_table(
        "solicitudes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nit", sa.String(50), nullable=False),
        sa.Column("exp_sgd", sa.String(16), nullable=False),
        sa.Column("fecha_recepcion", sa.Date(), nullable=False),
        sa.Column("ruc", sa.String(11), nullable=False),
        sa.Column("entidad_empleadora", sa.String(50), nullable=False),
        sa.Column("dni_ce", sa.String(10), nullable=False),
        sa.Column("asegurado_titular", sa.String(50), nullable=False),
        sa.Column("tipo_tramite", sa.String(10), nullable=False),
        sa.Column(
            "origen",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'REGISTRO'"),
        ),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("exp_sgd"),
        _check(
            "ck_solicitudes_tipo_tramite",
            "tipo_tramite",
            "SEGURO",
            "SUBSIDIO",
        ),
        _check(
            "ck_solicitudes_origen",
            "origen",
            "REGISTRO",
            "MIGRACION",
        ),
    )
    op.create_index("ix_solicitudes_nit", "solicitudes", ["nit"])
    op.create_index("ix_solicitudes_exp_sgd", "solicitudes", ["exp_sgd"], unique=True)
    op.create_index("ix_solicitudes_fecha_recepcion", "solicitudes", ["fecha_recepcion"])
    op.create_index("ix_solicitudes_dni_ce", "solicitudes", ["dni_ce"])
    op.create_index("ix_solicitudes_asegurado_titular", "solicitudes", ["asegurado_titular"])

    op.create_table(
        "datos_seguro",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("riesgo", sa.String(40), nullable=False),
        sa.Column("decision_resolucion", sa.String(30), nullable=False),
        sa.Column("motivo", sa.String(100), nullable=True),
        sa.UniqueConstraint("solicitud_id"),
        _check(
            "ck_datos_seguro_riesgo",
            "riesgo",
            "ALTA TITULAR",
            "ALTA DERECHOHABIENTE",
            "CONDICION DEL ASEGURADO",
            "AUDITORIA",
            "FISCALIZACION POSTERIOR",
            "BAJA TITULAR",
            "BAJA DERECHOHABIENTE",
            "LACTANCIA",
            "ENFERMEDAD",
        ),
        _check(
            "ck_datos_seguro_decision",
            "decision_resolucion",
            "BAJA DE OFICIO",
            "RESOLUCION DE MULTA",
        ),
    )

    op.create_table(
        "datos_subsidio",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("motivo", sa.String(100), nullable=False),
        sa.Column("riesgo", sa.String(40), nullable=False),
        sa.Column("decision_resolucion", sa.String(30), nullable=False),
        sa.UniqueConstraint("solicitud_id"),
        _check(
            "ck_datos_subsidio_riesgo",
            "riesgo",
            "LACTANCIA",
            "ENFERMEDAD",
            "MATERNIDAD",
            "SEPELIO",
            "REINTEGRO",
            "FISCALIZACION POSTERIOR",
        ),
        _check(
            "ck_datos_subsidio_decision",
            "decision_resolucion",
            "BAJA DE OFICIO",
            "DENEGATORIA",
            "IMPROCEDENTE",
            "EN PARTE",
        ),
    )

    op.create_table(
        "resoluciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("numero_resolucion", sa.String(4), nullable=False),
        sa.Column("anio", sa.SmallInteger(), nullable=False),
        sa.Column("fecha_emision", sa.Date(), nullable=False),
        sa.Column("fecha_notificacion", sa.Date(), nullable=False),
        sa.Column("medio_comunicacion", sa.String(15), nullable=False),
        sa.Column("dni_recepciona", sa.String(10), nullable=False),
        sa.Column("apellidos_nombres", sa.String(50), nullable=False),
        sa.UniqueConstraint("solicitud_id"),
        _check(
            "ck_resoluciones_medio",
            "medio_comunicacion",
            "CORREO",
            "PRESENCIAL",
            "VIRTUAL",
        ),
    )

    op.create_table(
        "recursos_reconsideracion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("fecha_recepcion", sa.Date(), nullable=False),
        sa.Column("numero_resolucion", sa.String(4), nullable=False),
        sa.Column("anio", sa.SmallInteger(), nullable=False),
        sa.Column("fecha_emision", sa.Date(), nullable=False),
        sa.Column("decision_resolucion", sa.String(15), nullable=False),
        sa.Column("fecha_notificacion", sa.Date(), nullable=False),
        sa.Column("medio_comunicacion", sa.String(15), nullable=False),
        sa.Column("dni_recepciona", sa.String(10), nullable=False),
        sa.Column("apellidos_nombres", sa.String(50), nullable=False),
        sa.UniqueConstraint("solicitud_id"),
        _check(
            "ck_reconsideracion_decision",
            "decision_resolucion",
            "FUNDADO",
            "INFUNDADO",
            "EN PARTE",
        ),
        _check(
            "ck_reconsideracion_medio",
            "medio_comunicacion",
            "CORREO",
            "PRESENCIAL",
            "VIRTUAL",
        ),
    )

    op.create_table(
        "recursos_apelacion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("fecha_recepcion", sa.Date(), nullable=False),
        sa.Column("numero_nota_derivacion", sa.String(6), nullable=False),
        sa.Column("fecha_nota", sa.Date(), nullable=False),
        sa.UniqueConstraint("solicitud_id"),
    )

    # ------------- HISTORICO / MIGRACION -------------
    op.create_table(
        "importaciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre_archivo", sa.String(255), nullable=False),
        sa.Column("modo", sa.String(10), nullable=False),
        sa.Column(
            "estado",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'ANALIZADO'"),
        ),
        sa.Column("registros_leidos", sa.Integer(), server_default=sa.text("0")),
        sa.Column("registros_validos", sa.Integer(), server_default=sa.text("0")),
        sa.Column("registros_con_errores", sa.Integer(), server_default=sa.text("0")),
        sa.Column("hash_archivo", sa.String(64), nullable=True),
        sa.Column("creada_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "importacion_registros",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "importacion_id",
            sa.Integer(),
            sa.ForeignKey("importaciones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("fila_excel", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("mensajes", postgresql.JSONB(), nullable=True),
        sa.Column("datos_fila", postgresql.JSONB(), nullable=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id"),
            nullable=True,
        ),
    )

    op.create_table(
        "datos_historicos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "solicitud_id",
            sa.Integer(),
            sa.ForeignKey("solicitudes.id"),
            nullable=True,
        ),
        sa.Column(
            "importacion_registro_id",
            sa.Integer(),
            sa.ForeignKey("importacion_registros.id"),
            nullable=True,
        ),
        sa.Column("fila_excel", sa.Integer(), nullable=False),
        sa.Column("nit_original", sa.String(50), nullable=True),
        sa.Column("exp_sgd_original", sa.String(50), nullable=True),
        sa.Column("fecha_recepcion_original", sa.Date(), nullable=True),
        sa.Column("ruc_original", sa.String(30), nullable=True),
        sa.Column("dni_ce_original", sa.String(30), nullable=True),
        sa.Column("numero_resolucion_original", sa.String(20), nullable=True),
        sa.Column("correo", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("comunicado_whatsapp", sa.String(255), nullable=True),
        sa.Column("autorizacion_expresa", sa.String(255), nullable=True),
        sa.Column("direccion_formulario", sa.String(255), nullable=True),
        sa.Column("distrito", sa.String(100), nullable=True),
        sa.Column("provincia", sa.String(100), nullable=True),
        sa.Column("departamento", sa.String(100), nullable=True),
        sa.Column("nro_sobre", sa.String(50), nullable=True),
        sa.Column("fecha_sobre", sa.Date(), nullable=True),
        sa.Column("fecha_notificacion_historica", sa.Date(), nullable=True),
        sa.Column("estado_notificacion", sa.String(255), nullable=True),
        sa.Column("nota_cargo", sa.String(500), nullable=True),
        sa.Column("rotulo_file", sa.String(255), nullable=True),
        sa.Column("decision_resolucion_extra", sa.String(255), nullable=True),
        sa.Column("tipo_subsidio", sa.String(150), nullable=True),
        sa.Column("ruc_dni_beneficiario", sa.String(30), nullable=True),
        sa.Column("monto", sa.Numeric(12, 2), nullable=True),
        sa.Column("motivo_resolucion", sa.String(150), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("plazo_espera_dias", sa.String(100), nullable=True),
        sa.Column("fecha_derivarse_calificador", sa.Date(), nullable=True),
        sa.Column("fecha_entregado_calificador", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("solicitud_id"),
    )

    # ------------- AUDITORIA / RESPALDOS -------------
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("accion", sa.String(50), nullable=False),
        sa.Column("entidad", sa.String(50), nullable=False),
        sa.Column("registro_id", sa.BigInteger(), nullable=True),
        sa.Column("informacion_anterior", postgresql.JSONB(), nullable=True),
        sa.Column("informacion_nueva", postgresql.JSONB(), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_audit_logs_created_at", "audit_logs", ["created_at"]
    )

    op.create_table(
        "backup_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("archivo_nombre", sa.String(255), nullable=True),
        sa.Column("archivo_url", sa.String(255), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("tamano_bytes", sa.BigInteger(), nullable=True),
        sa.Column("fecha_inicio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_fin", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("backup_logs")
    op.drop_table("audit_logs")
    op.drop_table("datos_historicos")
    op.drop_table("importacion_registros")
    op.drop_table("importaciones")
    op.drop_table("recursos_apelacion")
    op.drop_table("recursos_reconsideracion")
    op.drop_table("resoluciones")
    op.drop_table("datos_subsidio")
    op.drop_table("datos_seguro")
    op.drop_index("ix_solicitudes_asegurado_titular", table_name="solicitudes")
    op.drop_index("ix_solicitudes_dni_ce", table_name="solicitudes")
    op.drop_index("ix_solicitudes_fecha_recepcion", table_name="solicitudes")
    op.drop_index("ix_solicitudes_exp_sgd", table_name="solicitudes")
    op.drop_index("ix_solicitudes_nit", table_name="solicitudes")
    op.drop_table("solicitudes")
    op.drop_table("user_roles")
    op.drop_table("users")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")