package com.bakeconnect.notification.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.notification.entity.StaffNotification;
import com.bakeconnect.notification.service.StaffNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager/notifications")
@PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
@Tag(name = "Staff Notifications", description = "Real-time notification inbox and alerts for bakery staff")
@SecurityRequirement(name = "BearerAuth")
public class StaffNotificationController {

    private final StaffNotificationService notificationService;

    public StaffNotificationController(StaffNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @Operation(summary = "Get paginated staff notifications")
    public ResponseEntity<ApiResponse<Page<StaffNotification>>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        Page<StaffNotification> notifications = notificationService.getNotifications(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    @GetMapping("/recent")
    @Operation(summary = "Get recent 50 staff notifications for workspace drawer/inbox")
    public ResponseEntity<ApiResponse<List<StaffNotification>>> getRecentNotifications() {
        List<StaffNotification> recent = notificationService.getRecentNotifications();
        return ResponseEntity.ok(ApiResponse.success(recent));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get count of unread notifications")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Marked as read"));
    }

    @PostMapping("/mark-all-read")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllAsRead() {
        int count = notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success(Map.of("markedCount", count), "All notifications marked as read"));
    }
}
