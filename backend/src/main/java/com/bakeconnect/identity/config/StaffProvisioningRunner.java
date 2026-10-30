package com.bakeconnect.identity.config;

import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class StaffProvisioningRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(StaffProvisioningRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("${bakeconnect.staff.portal-prefix:staff-mgmt-9a4c1f7b}")
    private String staffPrefix;

    public StaffProvisioningRunner(UserRepository userRepository,
                                   PasswordEncoder passwordEncoder,
                                   ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT);
    }

    @Override
    public void run(String... args) {
        try {
            ensureStaffUser("admin@bakeconnect.com", "Sunil Joshi (Admin)", "9820098200", UserRole.BAKERY_ADMIN);
            ensureStaffUser("manager@bakeconnect.com", "Anand Rao (Bakery Manager)", "9820598205", UserRole.BAKERY_MANAGER);

            writeCredentialsFile();
        } catch (Exception e) {
            log.warn("Failed to complete staff provisioning runner: {}", e.getMessage());
        }
    }

    private void ensureStaffUser(String email, String defaultName, String phone, UserRole role) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            User user = new User(
                    email,
                    passwordEncoder.encode("Password@123"),
                    defaultName,
                    phone,
                    role
            );
            user.setActive(true);
            user.setEmailVerified(true);
            userRepository.save(user);
            log.info("Provisioned default staff user: {} with role {}", email, role);
        } else {
            User user = existing.get();
            if (user.getRole() != role) {
                user.setRole(role);
                userRepository.save(user);
                log.info("Updated staff user {} to role {}", email, role);
            }
        }
    }

    private void writeCredentialsFile() {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("admin", Map.of(
                    "email", "admin@bakeconnect.com",
                    "password", "Password@123",
                    "role", "BAKERY_ADMIN"
            ));
            data.put("manager", Map.of(
                    "email", "manager@bakeconnect.com",
                    "password", "Password@123",
                    "role", "BAKERY_MANAGER"
            ));
            data.put("staffPortalPrefix", staffPrefix);
            data.put("staffLoginPath", "/" + staffPrefix + "/login");
            data.put("staffAdminPath", "/" + staffPrefix + "/admin");
            data.put("staffManagerPath", "/" + staffPrefix + "/bakery-manager");
            data.put("updatedAt", Instant.now().toString());

            // Write to project root and backend root
            Path rootCredentials = Path.of(".staff-credentials.local.json");
            Files.writeString(rootCredentials, objectMapper.writeValueAsString(data));
            log.info("Staff credentials idempotently recorded to {}", rootCredentials.toAbsolutePath());
        } catch (Exception e) {
            log.debug("Notice: Could not write local credentials file: {}", e.getMessage());
        }
    }
}
