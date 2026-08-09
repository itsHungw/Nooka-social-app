package com.vinhung.nookaapi.auth.service;

import com.vinhung.nookaapi.auth.config.AuthProperties;
import com.vinhung.nookaapi.shared.error.AuthException;
import com.vinhung.nookaapi.auth.model.dto.AuthResponse;
import com.vinhung.nookaapi.auth.model.dto.CompleteRegistrationRequest;
import com.vinhung.nookaapi.auth.model.dto.ForgotPasswordRequest;
import com.vinhung.nookaapi.auth.model.dto.LoginRequest;
import com.vinhung.nookaapi.auth.model.dto.RefreshTokenRequest;
import com.vinhung.nookaapi.auth.model.dto.RegistrationVerificationResponse;
import com.vinhung.nookaapi.auth.model.dto.RegisterRequest;
import com.vinhung.nookaapi.auth.model.dto.ResetPasswordRequest;
import com.vinhung.nookaapi.auth.model.dto.UserResponse;
import com.vinhung.nookaapi.auth.model.dto.VerificationRequiredResponse;
import com.vinhung.nookaapi.auth.model.entity.AuthSession;
import com.vinhung.nookaapi.auth.model.entity.EmailVerificationCode;
import com.vinhung.nookaapi.auth.model.entity.PasswordResetToken;
import com.vinhung.nookaapi.auth.model.entity.OAuthAccount;
import com.vinhung.nookaapi.auth.model.entity.PendingRegistration;
import com.vinhung.nookaapi.auth.model.enums.OAuthProvider;
import com.vinhung.nookaapi.auth.repository.AuthSessionRepository;
import com.vinhung.nookaapi.auth.repository.EmailVerificationCodeRepository;
import com.vinhung.nookaapi.auth.repository.PasswordResetTokenRepository;
import com.vinhung.nookaapi.auth.repository.OAuthAccountRepository;
import com.vinhung.nookaapi.auth.repository.PendingRegistrationRepository;
import com.vinhung.nookaapi.auth.spi.EmailSender;
import com.vinhung.nookaapi.auth.integration.OAuthIdentity;
import com.vinhung.nookaapi.auth.integration.OAuthIdentityVerifier;
import com.vinhung.nookaapi.user.entity.User;
import com.vinhung.nookaapi.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password";

    private final UserRepository users;
    private final AuthSessionRepository sessions;
    private final EmailVerificationCodeRepository verificationCodes;
    private final PasswordResetTokenRepository resetTokens;
    private final PendingRegistrationRepository pendingRegistrations;
    private final OAuthAccountRepository oauthAccounts;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenSupport tokenSupport;
    private final AuthProperties properties;
    private final EmailSender emailSender;
    private final Clock clock;
    private final List<OAuthIdentityVerifier> oauthVerifiers;

    @Transactional
    public VerificationRequiredResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new AuthException(HttpStatus.CONFLICT, "An account already exists for this email");
        }

        PendingRegistration pending = pendingRegistrations.findByEmailIgnoreCase(email)
                .orElseGet(() -> PendingRegistration.builder()
                        .email(email)
                        .passwordHash("")
                        .codeHash("")
                        .codeExpiresAt(Instant.now(clock))
                        .build());
        pending.updatePasswordHash(passwordEncoder.encode(request.password()));
        sendVerificationCode(pending);
        return new VerificationRequiredResponse("Verification code sent", email);
    }

    @Transactional
    public RegistrationVerificationResponse verifyEmail(String email, String code) {
        PendingRegistration pending = pendingRegistrations.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> invalidCode("Verification code is invalid or expired"));
        Instant now = Instant.now(clock);
        if (!pending.isCodeUsableAt(now, properties.maxCodeAttempts())) {
            throw invalidCode("Verification code is invalid or expired");
        }
        if (!tokenSupport.hash(code).equals(pending.getCodeHash())) {
            pending.incrementAttempts();
            throw invalidCode("Verification code is invalid or expired");
        }

        String registrationToken = tokenSupport.newToken();
        pending.markVerified(
                now,
                tokenSupport.hash(registrationToken),
                now.plus(properties.registrationCompletionTtl()));
        return new RegistrationVerificationResponse(registrationToken, pending.getEmail());
    }

    @Transactional
    public AuthResponse completeRegistration(CompleteRegistrationRequest request) {
        Instant now = Instant.now(clock);
        PendingRegistration pending = pendingRegistrations.findByCompletionTokenHash(
                        tokenSupport.hash(request.registrationToken()))
                .orElseThrow(() -> invalidCode("Registration session is invalid or expired"));
        if (!pending.isCompletableAt(now)) {
            throw invalidCode("Registration session is invalid or expired");
        }

        String username = request.username().trim();
        String displayName = request.displayName().trim();
        if (users.existsByEmailIgnoreCase(pending.getEmail())) {
            throw new AuthException(HttpStatus.CONFLICT, "An account already exists for this email");
        }
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new AuthException(HttpStatus.CONFLICT, "That username is already taken");
        }

        User user = users.save(User.builder()
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .emailVerifiedAt(pending.getVerifiedAt())
                .username(username)
                .displayName(displayName)
                .build());
        pending.markCompleted(now);
        return createSession(user);
    }

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username) {
        if (username == null) {
            return false;
        }
        String normalizedUsername = username.trim();
        return normalizedUsername.length() >= 3
                && normalizedUsername.length() <= 30
                && !users.existsByUsernameIgnoreCase(normalizedUsername);
    }

    @Transactional
    public void resendVerification(String email) {
        String normalizedEmail = normalizeEmail(email);
        pendingRegistrations.findByEmailIgnoreCase(normalizedEmail).ifPresentOrElse(
                this::sendVerificationCode,
                () -> users.findByEmailIgnoreCase(normalizedEmail).ifPresent(user -> {
                    if (!user.isEmailVerified()) {
                        sendVerificationCode(user);
                    }
                }));
    }

    @Transactional
    public AuthResponse oauthLogin(OAuthProvider provider, String token) {
        OAuthIdentity identity = oauthVerifiers.stream()
                .filter(verifier -> verifier.provider() == provider)
                .findFirst()
                .orElseThrow(() -> new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "OAuth provider is not configured"))
                .verify(token);
        User user = oauthAccounts.findByProviderAndSubject(provider, identity.subject())
                .map(OAuthAccount::getUser)
                .orElseGet(() -> linkOrCreateOAuthUser(provider, identity));
        return createSession(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        if (!user.isEmailVerified()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Email verification is required");
        }
        return createSession(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        Instant now = Instant.now(clock);
        AuthSession session = sessions.findByRefreshTokenHash(tokenSupport.hash(refreshToken))
                .filter(value -> value.isRefreshableAt(now))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "Refresh session is invalid or expired"));
        return rotateSession(session, now);
    }

    @Transactional
    public void logout(String refreshToken) {
        sessions.findByRefreshTokenHash(tokenSupport.hash(refreshToken))
                .ifPresent(session -> session.revoke(Instant.now(clock)));
    }

    @Transactional
    public String requestPasswordReset(String email) {
        User user = users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "Account not found"));
        String code = tokenSupport.newCode();
        resetTokens.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(tokenSupport.hash(code))
                .expiresAt(Instant.now(clock).plus(properties.resetCodeTtl()))
                .build());
        emailSender.sendPasswordResetCode(user.getEmail(), code);
        return "Reset code sent";
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = findUser(request.email());
        PasswordResetToken resetToken = resetTokens.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .filter(token -> token.isUsableAt(Instant.now(clock)))
                .filter(token -> tokenSupport.hash(request.code()).equals(token.getTokenHash()))
                .orElseThrow(() -> invalidCode("Reset code is invalid or expired"));
        resetToken.consume(Instant.now(clock));
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        sessions.findAllByUserIdAndRevokedAtIsNull(user.getId()).forEach(session -> session.revoke(Instant.now(clock)));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return UserResponse.from(users.findById(userId)
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "User account is unavailable")));
    }

    private User linkOrCreateOAuthUser(OAuthProvider provider, OAuthIdentity identity) {
        if (identity.email() == null || identity.email().isBlank() || !identity.emailVerified()) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "This provider did not return a verified email");
        }
        User user = users.findByEmailIgnoreCase(normalizeEmail(identity.email())).orElseGet(() -> users.save(User.builder()
                .email(normalizeEmail(identity.email()))
                .passwordHash(passwordEncoder.encode(tokenSupport.newToken()))
                .username(nextSocialUsername(identity.email()))
                .displayName(identity.displayName() == null || identity.displayName().isBlank()
                        ? identity.email() : identity.displayName())
                .build()));
        if (!user.isEmailVerified()) {
            user.verifyEmail(Instant.now(clock));
        }
        oauthAccounts.save(OAuthAccount.builder()
                .user(user)
                .provider(provider)
                .subject(identity.subject())
                .build());
        return user;
    }

    private String nextSocialUsername(String email) {
        String localPart = email.substring(0, email.indexOf('@')).toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "");
        String base = localPart.length() >= 3 ? localPart : "nookauser";
        if (base.length() > 24) {
            base = base.substring(0, 24);
        }
        String candidate = base;
        int suffix = 1;
        while (users.existsByUsernameIgnoreCase(candidate)) {
            String suffixText = String.valueOf(suffix++);
            int maxBaseLength = Math.max(3, 30 - suffixText.length());
            candidate = base.substring(0, Math.min(base.length(), maxBaseLength)) + suffixText;
        }
        return candidate;
    }

    private void sendVerificationCode(User user) {
        String code = tokenSupport.newCode();
        verificationCodes.save(EmailVerificationCode.builder()
                .user(user)
                .codeHash(tokenSupport.hash(code))
                .expiresAt(Instant.now(clock).plus(properties.verificationCodeTtl()))
                .build());
        emailSender.sendVerificationCode(user.getEmail(), code);
    }

    private void sendVerificationCode(PendingRegistration pending) {
        String code = tokenSupport.newCode();
        pending.issueCode(
                tokenSupport.hash(code),
                Instant.now(clock).plus(properties.verificationCodeTtl()));
        pendingRegistrations.save(pending);
        emailSender.sendVerificationCode(pending.getEmail(), code);
    }

    private AuthResponse createSession(User user) {
        Instant now = Instant.now(clock);
        String accessToken = tokenSupport.newToken();
        String refreshToken = tokenSupport.newToken();
        Instant accessExpiry = now.plus(properties.accessTokenTtl());
        Instant refreshExpiry = now.plus(properties.refreshTokenTtl());
        sessions.save(AuthSession.builder()
                .user(user)
                .accessTokenHash(tokenSupport.hash(accessToken))
                .refreshTokenHash(tokenSupport.hash(refreshToken))
                .accessExpiresAt(accessExpiry)
                .refreshExpiresAt(refreshExpiry)
                .lastUsedAt(now)
                .build());
        return new AuthResponse(accessToken, refreshToken, accessExpiry, refreshExpiry, UserResponse.from(user));
    }

    private AuthResponse rotateSession(AuthSession session, Instant now) {
        String accessToken = tokenSupport.newToken();
        String refreshToken = tokenSupport.newToken();
        Instant accessExpiry = now.plus(properties.accessTokenTtl());
        Instant refreshExpiry = now.plus(properties.refreshTokenTtl());
        session.rotate(tokenSupport.hash(accessToken), tokenSupport.hash(refreshToken), accessExpiry, refreshExpiry, now);
        return new AuthResponse(accessToken, refreshToken, accessExpiry, refreshExpiry, UserResponse.from(session.getUser()));
    }

    private User findUser(String email) {
        return users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> invalidCode("Account or code is invalid"));
    }

    private AuthException invalidCode(String message) {
        return new AuthException(HttpStatus.BAD_REQUEST, message);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
