from django.contrib.auth.models import AbstractUser
from django.db import models
class User(AbstractUser):
    department = models.CharField(max_length=128, blank=True)
    role = models.CharField(max_length=16, choices=[
        ('manager','manager'),('registrar','registrar'),
        ('teacher','teacher'),('student','student')
    ], default='student')