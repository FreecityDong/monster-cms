# users/validators.py
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class ComplexityValidator:
    """
    规则：
    - 至少 1 个大写字母
    - 至少 1 个小写字母
    - 至少 1 个数字
    - 至少 1 个特殊字符（!@#$%^&*()_+-=[]{};':",.<>/?）
    - 不得包含用户名或邮箱名（@ 前部分）
    """
    upper_re = re.compile(r"[A-Z]")
    lower_re = re.compile(r"[a-z]")
    digit_re = re.compile(r"\d")
    special_re = re.compile(r"[!@#$%^&*()_\-+=\[\]{};':\",.<>/?\\|]")

    def validate(self, password, user=None):
        errors = []
        if not self.upper_re.search(password):
            errors.append(_("必须包含至少 1 个大写字母。"))
        if not self.lower_re.search(password):
            errors.append(_("必须包含至少 1 个小写字母。"))
        if not self.digit_re.search(password):
            errors.append(_("必须包含至少 1 个数字。"))
        if not self.special_re.search(password):
            errors.append(_("必须包含至少 1 个特殊字符。"))

        if user is not None:
            uname = (getattr(user, "username", "") or "").lower()
            email = (getattr(user, "email", "") or "").lower()
            email_name = email.split("@", 1)[0] if email else ""

            pw_lower = password.lower()
            if uname and uname in pw_lower:
                errors.append(_("密码不得包含用户名。"))
            if email_name and email_name in pw_lower:
                errors.append(_("密码不得包含邮箱名（@ 前部分）。"))

        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "至少 10 位，包含大小写字母、数字、特殊字符；不得包含用户名/邮箱名；不得为纯数字。"
        )