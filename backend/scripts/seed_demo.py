# ruff: noqa: E501  (long Russian demo strings)
"""Bulk demo data for every module, on top of scripts.seed. Development/demo only, fictional people.

Runs once: if the marker teacher already exists, it exits without touching anything.
Run: python -m scripts.seed_demo  (with ENVIRONMENT=development and SEED_PASSWORD set)
"""

import asyncio
import random
from datetime import UTC, date, datetime, time, timedelta
from types import SimpleNamespace

from sqlalchemy import select

from app.common import repository as repo
from app.common.scheduling import overlaps
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory, engine
from app.models import (
    Attendance,
    ChatMessage,
    ChatThread,
    Course,
    CourseMaterial,
    CourseSection,
    DirectMessage,
    MessageThread,
    News,
    Registration,
    Room,
    SectionMeeting,
    Semester,
    Student,
    User,
)
from app.modules.materials import service as materials_service
from app.modules.news import service as news_service
from app.modules.students import repository as student_repo
from scripts.seed import seed

MARKER = "teacher4@demo.example.edu"
rnd = random.Random(2026)  # Same data on every fresh database.

TEACHERS = [
    ("Айгерим Сапарова", "Professor", "Computer Science", "B-210"),
    ("Ержан Нурланов", "Associate Professor", "Information Systems", "B-305"),
    ("Мария Ковалёва", "Senior Lecturer", "Mathematics", "A-120"),
    ("Тимур Ахметов", "Assistant Professor", "Computer Science", "B-214"),
    ("Динара Касымова", "Senior Lecturer", "Economics", "C-102"),
    ("Андрей Ли", "Lecturer", "Physics", "A-221"),
    ("Гульнара Есенова", "Associate Professor", "Languages", "C-210"),
    ("Сергей Петров", "Professor", "Software Engineering", "B-401"),
    ("Асель Жумабекова", "Lecturer", "Information Systems", "B-307"),
]
MALE = "Нурлан Арман Данияр Ерлан Алихан Бекзат Тимур Дмитрий Иван Руслан Санжар Ильяс Максим Азамат Олжас".split()
FEMALE = "Айгерим Алия Дана Камила Мадина Жанна Анна Софья Аружан Томирис Сабина Дарья Асем Лейла Арина".split()
LAST = "Абенов Ахметов Бекова Жаксылыков Иманов Ким Касымов Нуртаев Омаров Пак Сейтказин Тулегенов Утепов Шайхин Есимов Байжанов Смагулов Мусин".split()
PATRONYMIC_M = "Ерланович Нурланович Маратович Серикович Асетович".split()
PATRONYMIC_F = "Ерлановна Нурлановна Маратовна Сериковна Асетовна".split()
PROGRAMS = [
    "Information Systems",
    "Computer Science",
    "Software Engineering",
    "Data Science",
    "Finance",
]

COURSES = [
    ("CS102", "Object-Oriented Programming", 5),
    ("CS201", "Data Structures and Algorithms", 6),
    ("CS202", "Operating Systems", 5),
    ("CS303", "Web Development", 5),
    ("CS304", "Machine Learning", 6),
    ("CS305", "Computer Security", 5),
    ("CS401", "Distributed Systems", 6),
    ("IS202", "Business Process Modeling", 4),
    ("IS301", "Enterprise Systems", 5),
    ("IS302", "Project Management", 4),
    ("MA102", "Linear Algebra", 5),
    ("MA201", "Probability and Statistics", 5),
    ("MA202", "Discrete Mathematics", 5),
    ("EC101", "Microeconomics", 4),
    ("EC102", "Macroeconomics", 4),
    ("FN201", "Corporate Finance", 5),
    ("LG101", "Academic English", 3),
    ("LG102", "Kazakh Language", 3),
    ("HS101", "History of Kazakhstan", 3),
    ("PH102", "Physics II", 5),
]
ROOMS = [
    (f"{b}-{n}", f"Building {b}", cap)
    for b, n, cap in [
        ("A", 101, 40),
        ("A", 102, 30),
        ("A", 201, 60),
        ("A", 202, 30),
        ("B", 101, 25),
        ("B", 102, 25),
        ("B", 201, 35),
        ("B", 202, 35),
        ("C", 101, 80),
        ("C", 201, 30),
        ("Lab", 1, 20),
        ("Lab", 2, 20),
    ]
]
SLOTS = [time(9), time(10, 30), time(12), time(13, 30), time(15), time(16, 30)]

NEWS = [
    (
        "Начало осеннего семестра 2026",
        "Дорогие студенты! Осенний семестр начинается 1 сентября. Расписание доступно в разделе «Расписание». Желаем успешной учёбы!",
        False,
    ),
    (
        "Регистрация на весенний семестр открыта",
        "Регистрация на курсы весеннего семестра 2027 открыта до 20 декабря. Заявки рассматриваются эдвайзерами в течение трёх рабочих дней.",
        True,
    ),
    (
        "График первой аттестации",
        "Первая аттестация проходит с 6 по 11 октября. Баллы выставляются преподавателями в системе до 15 октября.",
        True,
    ),
    (
        "Открыт приём заявок в общежитие",
        "Студенты, нуждающиеся в общежитии, могут отметить это в профиле до 1 декабря.",
        False,
    ),
    (
        "Хакатон BIS Hack 2026",
        "14–15 ноября в корпусе B пройдёт студенческий хакатон. Команды до 4 человек, призовой фонд — 1 000 000 ₸. Регистрация у кураторов.",
        True,
    ),
    (
        "День открытых дверей",
        "Приглашаем абитуриентов и родителей на день открытых дверей 30 ноября в 11:00, актовый зал корпуса A.",
        False,
    ),
    (
        "Технические работы на портале",
        "В субботу с 02:00 до 04:00 портал может быть недоступен из-за плановых работ.",
        False,
    ),
    (
        "Вторая аттестация",
        "Вторая аттестация пройдёт с 24 по 29 ноября. Допуск к экзамену — не менее 30 баллов за две аттестации.",
        True,
    ),
    (
        "Неделя карьеры",
        "С 1 по 5 декабря компании-партнёры проведут презентации и собеседования на стажировки. Расписание — во вложении.",
        True,
    ),
    (
        "Новая библиотечная система",
        "Электронный каталог библиотеки теперь доступен круглосуточно. Вход — по студенческому номеру.",
        False,
    ),
    (
        "Расписание зимней сессии",
        "Экзамены пройдут с 8 по 20 декабря. Проверьте расписание экзаменов во вложении.",
        True,
    ),
    (
        "Спортивный турнир факультетов",
        "Приглашаем на турнир по волейболу и мини-футболу. Заявки от команд принимаются до 5 декабря.",
        False,
    ),
]
SUPPORT = [
    (
        "Здравствуйте! Не могу зарегистрироваться на курс CS201, пишет «нет мест».",
        "Добрый день! Мы увеличили вместимость секции, попробуйте ещё раз.",
    ),
    (
        "Как поменять номер телефона в профиле?",
        "Откройте «Профиль» → «Редактировать», поле «Телефон».",
    ),
    (
        "У меня не отображается оценка за первую аттестацию.",
        "Преподаватель выставит баллы до 15 октября. Если не появится — напишите нам.",
    ),
    (
        "Можно ли перенести экзамен по уважительной причине?",
        "Да, принесите справку в деканат, мы назначим новую дату.",
    ),
    (
        "Аудитория A-202 закрыта, пара не состоялась.",
        "Спасибо, передали в хозчасть. Пропуск не будет засчитан.",
    ),
    (
        "Где скачать справку с места учёбы?",
        "Справку выдаёт деканат, заявку можно оставить здесь — подготовим за 2 дня.",
    ),
]
DMS = [
    (
        "Здравствуйте! Можно сдать домашнее задание до понедельника?",
        "Да, до понедельника 23:59.",
        "Спасибо!",
    ),
    (
        "Не понял задачу 3 из практики, можно консультацию?",
        "Приходите в четверг в 15:00 в мой кабинет.",
    ),
    (
        "Добрый день, я пропустил занятие по болезни. Что нужно сделать?",
        "Посмотрите материалы в разделе курса и решите задачи 1–5.",
        "Хорошо, сделаю.",
    ),
    ("Будет ли в аттестации тема про индексы?", "Да, индексы и нормализация войдут."),
    (
        "Пожалуйста, проверьте мою работу, загрузила в материалы.",
        "Проверил, хорошая работа. 9/10.",
        "Спасибо большое!",
    ),
]
MATERIALS = [
    ("syllabus", "Syllabus", "Course outline, grading policy and weekly topics."),
    ("homework", "Homework 1", "Problems 1-10. Due in two weeks."),
    ("practice", "Practice: lab 1", "Hands-on exercises for the first lab session."),
    ("homework", "Homework 2", "Problems on the second module."),
    ("other", "Lecture slides, week 1-4", "Slides from the first month."),
]


def pdf(lines: list[str]) -> bytes:
    """Minimal one-page PDF with ASCII text, enough for demo attachments to open in a browser."""
    text = " ".join(
        f"BT /F1 14 Tf 72 {760 - 22 * i} Td ({line.replace('(', '[').replace(')', ']')}) Tj ET"
        for i, line in enumerate(lines)
    ).encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
        b" /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(text) + text + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = bytearray(b"%PDF-1.4\n"), []
    for n, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % n + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        xref,
    )
    return bytes(out)


def at(day: date, hour: int = 10) -> datetime:
    return datetime.combine(day, time(hour, rnd.randint(0, 59)), UTC)


def class_dates(semester: Semester, day: int, until: date):
    current = semester.start_date + timedelta((day - semester.start_date.weekday()) % 7)
    while current <= min(semester.end_date, until):
        yield current
        current += timedelta(7)


async def seed_demo() -> None:
    await (
        seed()
    )  # Base accounts, semesters, courses; also enforces the development/password checks.
    password_hash = hash_password(get_settings().seed_password)
    today = date.today()
    files: list[tuple] = []  # Written after commit so a failed run leaves no orphan files.
    async with SessionFactory() as db, db.begin():
        await repo.academic_lock(db, exclusive=True)
        if await db.scalar(select(User.id).where(User.email == MARKER)):
            print("Demo data already present, nothing to do.")
            return
        admin = await db.scalar(select(User).where(User.role == "ADMIN").order_by(User.id))

        rooms = list((await db.scalars(select(Room))).all())
        for code, building, capacity in ROOMS:
            if code not in {r.code for r in rooms}:
                room = Room(code=code, building=building, capacity=capacity)
                db.add(room)
                rooms.append(room)

        teachers = list((await db.scalars(select(User).where(User.role == "TEACHER"))).all())
        for i, (name, title, department, office) in enumerate(TEACHERS, 4):
            teacher = User(
                email=f"teacher{i}@demo.example.edu",
                role="TEACHER",
                password_hash=password_hash,
                full_name=name,
                title=title,
                department=department,
                office=office,
                phone=f"+7 701 {rnd.randint(100, 999)} {rnd.randint(1000, 9999)}",
            )
            db.add(teacher)
            teachers.append(teacher)

        for i in range(5, 85):
            female = i % 2 == 0
            first = rnd.choice(FEMALE if female else MALE)
            last = rnd.choice(LAST)
            if female and last[-2:] in ("ов", "ев", "ин"):
                last += "а"
            year_level = rnd.randint(1, 4)
            enrolled = today.year - year_level + (1 if today.month >= 9 else 0)
            user = User(
                email=f"student{i}@demo.example.edu", role="STUDENT", password_hash=password_hash
            )
            db.add(user)
            await db.flush()
            db.add(
                Student(
                    user_id=user.id,
                    last_name=last,
                    first_name=first,
                    patronymic=rnd.choice(PATRONYMIC_F if female else PATRONYMIC_M)
                    if rnd.random() < 0.7
                    else None,
                    program=rnd.choice(PROGRAMS),
                    year_level=year_level,
                    student_number=await student_repo.new_student_number(db, enrolled),
                    phone_number=f"+7 70{rnd.randint(0, 8)} {rnd.randint(100, 999)} {rnd.randint(1000, 9999)}",
                    birth_date=date(enrolled - 18, rnd.randint(1, 12), rnd.randint(1, 28)),
                    gender="FEMALE" if female else "MALE",
                    marital_status="SINGLE",
                    nationality=rnd.choice(["Kazakh", "Kazakh", "Russian", "Korean", "Uzbek"]),
                    citizenship="Kazakhstan",
                    is_resident=True,
                    personal_email=f"demo.student{i}@example.com",
                    needs_dormitory=rnd.random() < 0.3,
                    admission_year=f"{enrolled}-{enrolled + 1}",
                    advisor=rnd.choice(TEACHERS)[0],
                    study_form="Full-time",
                    winter_admission=False,
                )
            )

        courses = list((await db.scalars(select(Course))).all())
        for code, title, ects in COURSES:
            if code not in {c.course_code for c in courses}:
                course = Course(
                    course_code=code,
                    course_title=title,
                    credits=3 if ects < 5 else 4,
                    ects=ects,
                    description=f"{title}: lectures, labs and a final project.",
                )
                db.add(course)
                courses.append(course)
        await db.flush()

        semesters = {s.name: s for s in (await db.scalars(select(Semester))).all()}
        for name, start, end in [
            ("Fall 2025", date(2025, 9, 1), date(2025, 12, 20)),
            ("Spring 2026", date(2026, 1, 15), date(2026, 5, 25)),
        ]:
            if name not in semesters:
                semesters[name] = Semester(
                    name=name, start_date=start, end_date=end, is_active=False
                )
                db.add(semesters[name])
        await db.flush()

        # Sections: two 90-minute meetings a week, no room or teacher double-booking.
        for semester in semesters.values():
            existing = (
                await db.scalars(
                    select(CourseSection).where(CourseSection.semester_id == semester.semester_id)
                )
            ).all()
            booked = [(s.teacher_id, m) for s in existing for m in s.meetings]
            taken = {s.course_id for s in existing}
            for course in courses:
                if course.course_id in taken or rnd.random() < 0.15:
                    continue
                for number in ("A", "B") if rnd.random() < 0.3 else ("A",):
                    teacher = rnd.choice(teachers)
                    for _ in range(200):
                        day, slot, room = rnd.randint(0, 2), rnd.choice(SLOTS), rnd.choice(rooms)
                        end = (datetime.combine(today, slot) + timedelta(minutes=90)).time()
                        meetings = [
                            SimpleNamespace(
                                meeting_day=d, start_time=slot, end_time=end, room_id=room.room_id
                            )
                            for d in (day, day + 2)
                        ]
                        if not any(
                            overlaps(m, b) and (t == teacher.id or b.room_id == room.room_id)
                            for m in meetings
                            for t, b in booked
                        ):
                            break
                    else:
                        continue
                    section = CourseSection(
                        course_id=course.course_id,
                        semester_id=semester.semester_id,
                        section_number=number,
                        capacity=rnd.choice([20, 25, 30, 35]),
                        teacher_id=teacher.id,
                        meetings=[SectionMeeting(**vars(m)) for m in meetings],
                    )
                    db.add(section)
                    booked += [(teacher.id, m) for m in meetings]
        await db.flush()

        # Registrations, grades, attendance.
        students = (await db.scalars(select(Student))).all()
        sections = (await db.scalars(select(CourseSection))).all()
        for semester in semesters.values():
            past = semester.end_date < today
            current = semester.start_date <= today <= semester.end_date
            pool = [s for s in sections if s.semester_id == semester.semester_id]
            regs = {
                (r.student_id, r.section_id): r
                for r in (
                    await db.scalars(
                        select(Registration).where(Registration.semester_id == semester.semester_id)
                    )
                ).all()
            }
            seats = {s.section_id: sum(1 for k in regs if k[1] == s.section_id) for s in pool}
            for student in students:
                mine = [s for s in pool if (student.student_id, s.section_id) in regs]
                busy = [m for s in mine for m in s.meetings]
                taken = {s.course_id for s in mine}
                target = rnd.randint(4, 6)
                for section in rnd.sample(pool, len(pool)):
                    if len(mine) >= target:
                        break
                    if (
                        section.course_id in taken
                        or seats[section.section_id] >= section.capacity
                        or any(overlaps(a, b) for a in busy for b in section.meetings)
                    ):
                        continue
                    status = "Enrolled" if past or current or rnd.random() < 0.6 else "Pending"
                    reg = Registration(
                        student_id=student.student_id,
                        section_id=section.section_id,
                        semester_id=semester.semester_id,
                        status=status,
                        registered_at=at(
                            min(today, semester.start_date) - timedelta(rnd.randint(5, 30))
                        ),
                    )
                    db.add(reg)
                    regs[(student.student_id, section.section_id)] = reg
                    mine.append(section)
                    busy += section.meetings
                    taken.add(section.course_id)
                    seats[section.section_id] += 1
            await db.flush()

            by_id = {s.section_id: s for s in pool}
            for (_, section_id), reg in regs.items():
                if reg.status != "Enrolled" or not (past or current):
                    continue
                section = by_id[section_id]
                skill = rnd.uniform(0.45, 1.0)

                def score(top, skill=skill):
                    return round(min(top, max(0, rnd.gauss(skill * top, top * 0.1))), 1)

                if reg.attestation_1 is None:
                    reg.attestation_1 = score(30)
                    if past or today > semester.start_date + timedelta(70):
                        reg.attestation_2 = score(30)
                    if past:
                        reg.final_exam = score(40)
                    reg.graded_by = section.teacher_id
                    reg.graded_at = at(min(today, semester.end_date) - timedelta(rnd.randint(1, 5)))
                absent_rate = (1 - skill) * 0.3
                for meeting in section.meetings:
                    for day in class_dates(semester, meeting.meeting_day, today - timedelta(1)):
                        r = rnd.random()
                        db.add(
                            Attendance(
                                registration_id=reg.registration_id,
                                class_date=day,
                                start_time=meeting.start_time,
                                end_time=meeting.end_time,
                                status="ABSENT"
                                if r < absent_rate
                                else "LATE"
                                if r < absent_rate + 0.07
                                else "PRESENT",
                                marked_by=section.teacher_id,
                                marked_at=at(day, meeting.start_time.hour + 1),
                            )
                        )
        await db.flush()

        # Materials for current and upcoming sections.
        fall = semesters["Fall 2026"]
        course_by_id = {c.course_id: c for c in courses}
        for section in sections:
            if section.semester_id != fall.semester_id or section.teacher_id is None:
                continue
            course = course_by_id[section.course_id]
            for n, (category, title, description) in enumerate(MATERIALS[: rnd.randint(2, 5)]):
                material = CourseMaterial(
                    section_id=section.section_id,
                    uploaded_by_id=section.teacher_id,
                    category=category,
                    title=title,
                    description=description,
                    created_at=at(fall.start_date + timedelta(14 * n + rnd.randint(0, 3))),
                )
                db.add(material)
                await db.flush()
                files.append(
                    (
                        materials_service,
                        material,
                        f"{course.course_code} - {title}",
                        course.course_title,
                    )
                )

        # News.
        for n, (title, body, attach) in enumerate(NEWS):
            news = News(
                title=title,
                body=body,
                author_id=admin.id,
                created_at=at(fall.start_date + timedelta(days=round(n * 85 / len(NEWS)))),
            )
            db.add(news)
            await db.flush()
            if attach:
                files.append((news_service, news, title, "BIS University announcement"))

        # Support chat with the administration.
        users = (await db.scalars(select(User).where(User.role != "ADMIN").order_by(User.id))).all()
        threaded = set((await db.scalars(select(ChatThread.user_id))).all())
        for n, user in enumerate(u for u in users if u.id not in threaded):
            if n >= 2 * len(SUPPORT):
                break
            question, answer = SUPPORT[n % len(SUPPORT)]
            asked = at(today - timedelta(rnd.randint(1, 40)), 11)
            answered = asked + timedelta(minutes=rnd.randint(5, 120))
            unanswered = n % 4 == 3
            thread = ChatThread(
                user_id=user.id,
                created_at=asked,
                last_message_at=asked if unanswered else answered,
                user_last_read_at=None if n % 3 == 0 else answered,
                admin_last_read_at=None if unanswered else answered,
            )
            db.add(thread)
            await db.flush()
            db.add(
                ChatMessage(thread_id=thread.id, sender_id=user.id, body=question, created_at=asked)
            )
            if not unanswered:
                db.add(
                    ChatMessage(
                        thread_id=thread.id, sender_id=admin.id, body=answer, created_at=answered
                    )
                )

        # Teacher–student direct messages, only between people who share a Fall section.
        teacher_of = {s.section_id: s.teacher_id for s in sections}
        fall_regs = await db.execute(
            select(Registration.student_id, Registration.section_id).where(
                Registration.semester_id == fall.semester_id, Registration.status == "Enrolled"
            )
        )
        pairs = dict.fromkeys((teacher_of[sec], st) for st, sec in fall_regs if teacher_of[sec])
        student_user = {s.student_id: s.user_id for s in students}
        existing_pairs = set(
            (await db.execute(select(MessageThread.teacher_id, MessageThread.student_id))).all()
        )
        chosen = [p for p in pairs if (p[0], student_user[p[1]]) not in existing_pairs]
        # Every demo login with a Fall enrollment gets at least one conversation.
        first_students = {student_user[s.student_id] for s in students[:5]}
        chosen = sorted(
            chosen, key=lambda p: (student_user[p[1]] not in first_students, rnd.random())
        )[:40]
        for n, (teacher_id, student_id) in enumerate(chosen):
            lines = DMS[n % len(DMS)]
            sent = at(today - timedelta(rnd.randint(1, 30)), 9)
            stamps = [sent + timedelta(hours=3 * k) for k in range(len(lines))]
            thread = MessageThread(
                teacher_id=teacher_id,
                student_id=student_user[student_id],
                created_at=sent,
                last_message_at=stamps[-1],
                teacher_last_read_at=stamps[-1] if n % 3 else None,
                student_last_read_at=stamps[-1] if n % 2 else stamps[0],
            )
            db.add(thread)
            await db.flush()
            for k, (body, stamp) in enumerate(zip(lines, stamps, strict=True)):
                sender = student_user[student_id] if k % 2 == 0 else teacher_id
                db.add(
                    DirectMessage(
                        thread_id=thread.id, sender_id=sender, body=body, created_at=stamp
                    )
                )

        for _, entity, name, _ in files:
            # Same naming as uploads through the API; the bytes land on disk below, after commit.
            entity.attachment_path = f"{entity.id}.pdf"
            entity.attachment_name = f"{name}.pdf"
            entity.attachment_content_type = "application/pdf"
    for service, entity, name, subtitle in files:
        service.ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
        (service.ATTACHMENTS_DIR / entity.attachment_path).write_bytes(
            pdf(
                [line for line in (name, subtitle) if line.isascii()]
                + ["Demo document - fictional data."]
            )
        )
    print(f"Demo data ready: {len(files)} attachments written.")


async def main():
    try:
        await seed_demo()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
