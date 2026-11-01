"""initial university schema

Revision ID: b3d6518e6c20
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b3d6518e6c20"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Reviewed: explicit checks, indexes and composite registration/section semester FK.
    op.create_table(
        "courses",
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("course_code", sa.String(length=30), nullable=False),
        sa.Column("course_title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("credits", sa.SmallInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("credits BETWEEN 1 AND 30", name=op.f("ck_courses_credits")),
        sa.PrimaryKeyConstraint("course_id", name=op.f("pk_courses")),
        sa.UniqueConstraint("course_code", name=op.f("uq_courses_course_code")),
    )
    op.create_table(
        "semesters",
        sa.Column("semester_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.CheckConstraint("start_date < end_date", name=op.f("ck_semesters_date_interval")),
        sa.PrimaryKeyConstraint("semester_id", name=op.f("pk_semesters")),
        sa.UniqueConstraint("name", name=op.f("uq_semesters_name")),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.CheckConstraint("role IN ('STUDENT','TEACHER','ADMIN')", name=op.f("ck_users_role")),
        sa.CheckConstraint("email = lower(email)", name=op.f("ck_users_email_lower")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_auth_sessions_user_id_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)
    op.create_table(
        "course_sections",
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("semester_id", sa.Integer(), nullable=False),
        sa.Column("section_number", sa.String(length=20), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("capacity > 0", name=op.f("ck_course_sections_capacity")),
        sa.ForeignKeyConstraint(
            ["course_id"], ["courses.course_id"], name=op.f("fk_course_sections_course_id_courses")
        ),
        sa.ForeignKeyConstraint(
            ["semester_id"],
            ["semesters.semester_id"],
            name=op.f("fk_course_sections_semester_id_semesters"),
        ),
        sa.ForeignKeyConstraint(
            ["teacher_id"], ["users.id"], name=op.f("fk_course_sections_teacher_id_users")
        ),
        sa.PrimaryKeyConstraint("section_id", name=op.f("pk_course_sections")),
        sa.UniqueConstraint(
            "course_id", "semester_id", "section_number", name=op.f("uq_course_sections_course_id")
        ),
        sa.UniqueConstraint("section_id", "semester_id", name="uq_section_semester"),
    )
    op.create_index(
        op.f("ix_course_sections_course_id"), "course_sections", ["course_id"], unique=False
    )
    op.create_index(
        op.f("ix_course_sections_semester_id"), "course_sections", ["semester_id"], unique=False
    )
    op.create_index(
        op.f("ix_course_sections_teacher_id"), "course_sections", ["teacher_id"], unique=False
    )
    op.create_table(
        "students",
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("program", sa.String(length=80), nullable=True),
        sa.Column("year_level", sa.SmallInteger(), nullable=False),
        sa.CheckConstraint("year_level BETWEEN 1 AND 8", name=op.f("ck_students_year_level")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_students_user_id_users")),
        sa.PrimaryKeyConstraint("student_id", name=op.f("pk_students")),
        sa.UniqueConstraint("user_id", name=op.f("uq_students_user_id")),
    )
    op.create_table(
        "refresh_tokens",
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("consumed", sa.Boolean(), server_default="false", nullable=False),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["auth_sessions.id"],
            name=op.f("fk_refresh_tokens_session_id_auth_sessions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("token_hash", name=op.f("pk_refresh_tokens")),
    )
    op.create_index(
        op.f("ix_refresh_tokens_session_id"), "refresh_tokens", ["session_id"], unique=False
    )
    op.create_table(
        "registrations",
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("semester_id", sa.Integer(), nullable=False),
        sa.Column(
            "registered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=10), server_default="Enrolled", nullable=False),
        sa.CheckConstraint(
            "status IN ('Pending','Enrolled','Rejected','Cancelled')",
            name=op.f("ck_registrations_status"),
        ),
        sa.ForeignKeyConstraint(
            ["section_id", "semester_id"],
            ["course_sections.section_id", "course_sections.semester_id"],
            name="fk_registration_section_semester",
        ),
        sa.ForeignKeyConstraint(
            ["semester_id"],
            ["semesters.semester_id"],
            name=op.f("fk_registrations_semester_id_semesters"),
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.student_id"],
            name=op.f("fk_registrations_student_id_students"),
        ),
        sa.PrimaryKeyConstraint("registration_id", name=op.f("pk_registrations")),
        sa.UniqueConstraint(
            "student_id", "section_id", "semester_id", name=op.f("uq_registrations_student_id")
        ),
    )
    op.create_index(
        "ix_registration_schedule",
        "registrations",
        ["student_id", "semester_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_registration_seats", "registrations", ["section_id", "status"], unique=False
    )
    op.create_index(
        op.f("ix_registrations_semester_id"), "registrations", ["semester_id"], unique=False
    )
    op.create_index(
        op.f("ix_registrations_student_id"), "registrations", ["student_id"], unique=False
    )
    op.create_table(
        "section_meetings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("meeting_day", sa.SmallInteger(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.CheckConstraint("meeting_day BETWEEN 0 AND 6", name=op.f("ck_section_meetings_weekday")),
        sa.CheckConstraint("start_time < end_time", name=op.f("ck_section_meetings_time_interval")),
        sa.ForeignKeyConstraint(
            ["section_id"],
            ["course_sections.section_id"],
            name=op.f("fk_section_meetings_section_id_course_sections"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_section_meetings")),
        sa.UniqueConstraint(
            "section_id",
            "meeting_day",
            "start_time",
            "end_time",
            name=op.f("uq_section_meetings_section_id"),
        ),
    )
    op.create_index(
        op.f("ix_section_meetings_section_id"), "section_meetings", ["section_id"], unique=False
    )


def downgrade() -> None:
    # Reverse dependency order: dependents must be removed before referenced tables.
    op.drop_index(op.f("ix_section_meetings_section_id"), table_name="section_meetings")
    op.drop_table("section_meetings")
    op.drop_index(op.f("ix_registrations_student_id"), table_name="registrations")
    op.drop_index(op.f("ix_registrations_semester_id"), table_name="registrations")
    op.drop_index("ix_registration_seats", table_name="registrations")
    op.drop_index("ix_registration_schedule", table_name="registrations")
    op.drop_table("registrations")
    op.drop_index(op.f("ix_refresh_tokens_session_id"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("students")
    op.drop_index(op.f("ix_course_sections_teacher_id"), table_name="course_sections")
    op.drop_index(op.f("ix_course_sections_semester_id"), table_name="course_sections")
    op.drop_index(op.f("ix_course_sections_course_id"), table_name="course_sections")
    op.drop_table("course_sections")
    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("users")
    op.drop_table("semesters")
    op.drop_table("courses")
