package com.bakeconnect.issue.service;

import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.issue.dto.CreateIssueRequest;
import com.bakeconnect.issue.dto.CustomerIssueDto;
import com.bakeconnect.issue.dto.IssueMessageRequest;
import com.bakeconnect.issue.entity.CustomerIssue;
import com.bakeconnect.issue.entity.IssueMessage;
import com.bakeconnect.issue.entity.IssueStatus;
import com.bakeconnect.issue.repository.CustomerIssueRepository;
import com.bakeconnect.issue.repository.IssueMessageRepository;
import com.bakeconnect.notification.service.StaffNotificationService;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class CustomerIssueService {

    private final CustomerIssueRepository issueRepository;
    private final IssueMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final StaffNotificationService staffNotificationService;

    public CustomerIssueService(
            CustomerIssueRepository issueRepository,
            IssueMessageRepository messageRepository,
            UserRepository userRepository,
            OrderRepository orderRepository,
            StaffNotificationService staffNotificationService) {
        this.issueRepository = issueRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.staffNotificationService = staffNotificationService;
    }

    @Transactional
    public CustomerIssueDto createIssue(UUID userId, CreateIssueRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        String orderNumber = null;
        if (request.orderId() != null) {
            Order order = orderRepository.findById(request.orderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.orderId()));
            if (!order.getUser().getId().equals(userId)) {
                throw new BusinessRuleException("Order does not belong to the authenticated user");
            }
            orderNumber = order.getOrderNumber();
        }

        CustomerIssue issue = new CustomerIssue(user, request.orderId(), request.category(), request.shortDescription());
        IssueMessage initialMessage = new IssueMessage(issue, user, request.message(), false);
        issue.addMessage(initialMessage);

        CustomerIssue saved = issueRepository.save(issue);

        // Notify staff workspace
        String title = "Customer Issue: " + request.shortDescription();
        String body = String.format("From %s (%s). %s",
                user.getFullName(),
                orderNumber != null ? "Order " + orderNumber : "General",
                request.message().length() > 80 ? request.message().substring(0, 77) + "..." : request.message());
        staffNotificationService.createNotification(
                request.orderId(),
                orderNumber != null ? orderNumber : "ISSUE",
                user.getRole() == UserRole.RETAILER ? "B2B" : "B2C",
                title,
                body
        );

        return CustomerIssueDto.fromEntity(saved, false);
    }

    @Transactional(readOnly = true)
    public Page<CustomerIssueDto> getMyIssues(UUID userId, Pageable pageable) {
        return issueRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(issue -> CustomerIssueDto.fromEntity(issue, false));
    }

    @Transactional(readOnly = true)
    public CustomerIssueDto getMyIssueDetails(UUID issueId, UUID userId) {
        CustomerIssue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerIssue", "id", issueId));

        if (!issue.getUser().getId().equals(userId)) {
            throw new BusinessRuleException("Unauthorized to access this support issue");
        }

        return CustomerIssueDto.fromEntity(issue, false);
    }

    @Transactional(readOnly = true)
    public Page<CustomerIssueDto> getAllIssuesForStaff(IssueStatus status, Pageable pageable) {
        if (status != null) {
            return issueRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                    .map(issue -> CustomerIssueDto.fromEntity(issue, true));
        }
        return issueRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(issue -> CustomerIssueDto.fromEntity(issue, true));
    }

    @Transactional(readOnly = true)
    public CustomerIssueDto getIssueDetailsForStaff(UUID issueId) {
        CustomerIssue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerIssue", "id", issueId));
        return CustomerIssueDto.fromEntity(issue, true);
    }

    @Transactional
    public CustomerIssueDto addMessage(UUID issueId, UUID senderId, boolean isStaff, IssueMessageRequest request) {
        CustomerIssue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerIssue", "id", issueId));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", senderId));

        if (!isStaff && !issue.getUser().getId().equals(senderId)) {
            throw new BusinessRuleException("Unauthorized to post messages to this support issue");
        }

        boolean internalNote = isStaff && request.isInternalNote();
        IssueMessage message = new IssueMessage(issue, sender, request.message(), internalNote);
        messageRepository.save(message);

        // Update issue timestamp
        issue.setUpdatedAt(Instant.now());
        if (!isStaff && issue.getStatus() == IssueStatus.RESOLVED) {
            issue.setStatus(IssueStatus.OPEN); // Customer replied to a resolved issue, reopen
        }
        issueRepository.save(issue);

        return CustomerIssueDto.fromEntity(issue, isStaff);
    }

    @Transactional
    public CustomerIssueDto updateStatus(UUID issueId, IssueStatus newStatus, String resolutionNotes, UUID staffId) {
        CustomerIssue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerIssue", "id", issueId));

        issue.setStatus(newStatus);
        if (resolutionNotes != null && !resolutionNotes.isBlank()) {
            issue.setResolutionNotes(resolutionNotes);
        }
        issue.setUpdatedAt(Instant.now());

        CustomerIssue saved = issueRepository.save(issue);
        return CustomerIssueDto.fromEntity(saved, true);
    }

    @Transactional
    public CustomerIssueDto assignIssue(UUID issueId, UUID staffId) {
        CustomerIssue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerIssue", "id", issueId));

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", staffId));

        issue.setAssignedTo(staff);
        issue.setUpdatedAt(Instant.now());

        CustomerIssue saved = issueRepository.save(issue);
        return CustomerIssueDto.fromEntity(saved, true);
    }
}
