from rest_framework import serializers
from .models import Announcement, Delivery

class AnnouncementSerializer(serializers.ModelSerializer):
    publisher_username = serializers.CharField(source="publisher.username", read_only=True)

    class Meta:
        model = Announcement
        fields = ["id","title","body","audience","publisher","publisher_username","status","publish_at","created_at","updated_at"]
        read_only_fields = ["publisher","status","created_at","updated_at"]

    def create(self, validated):
        validated["publisher"] = self.context["request"].user
        # MVP：创建即发布
        validated["status"] = "published"
        return super().create(validated)


class DeliverySerializer(serializers.ModelSerializer):
    announcement_title = serializers.CharField(source="announcement.title", read_only=True)
    announcement_body = serializers.CharField(source="announcement.body", read_only=True)
    publish_at = serializers.DateTimeField(source="announcement.publish_at", read_only=True)
    publisher = serializers.CharField(source="announcement.publisher.username", read_only=True)

    class Meta:
        model = Delivery
        fields = ["id","announcement","announcement_title","announcement_body","publisher","publish_at",
                  "state","delivered_at","ack_at","created_at"]


class AnnouncementStatsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    total = serializers.IntegerField()
    ack_count = serializers.IntegerField()
    ack_rate = serializers.FloatField()