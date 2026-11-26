from app.modules.attendance.models import Attendance
from app.modules.auth.models import AuthSession, LoginFailure, RefreshToken, Role, User
from app.modules.chat.models import ChatMessage, ChatThread
from app.modules.courses.models import Course
from app.modules.materials.models import CourseMaterial
from app.modules.messaging.models import DirectMessage, MessageThread
from app.modules.news.models import News
from app.modules.registrations.models import Registration
from app.modules.rooms.models import Room
from app.modules.sections.models import CourseSection, SectionMeeting
from app.modules.semesters.models import Semester
from app.modules.students.models import Student

__all__ = [
    "Role",
    "User",
    "AuthSession",
    "RefreshToken",
    "LoginFailure",
    "Student",
    "Course",
    "Semester",
    "Room",
    "CourseSection",
    "SectionMeeting",
    "Registration",
    "Attendance",
    "ChatThread",
    "ChatMessage",
    "MessageThread",
    "DirectMessage",
    "News",
    "CourseMaterial",
]
