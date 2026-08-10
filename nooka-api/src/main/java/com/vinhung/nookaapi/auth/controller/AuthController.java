package com.vinhung.nookaapi.auth.controller;

import com.vinhung.nookaapi.auth.model.dto.AuthResponse;
import com.vinhung.nookaapi.auth.model.dto.CompleteRegistrationRequest;
import com.vinhung.nookaapi.auth.model.dto.ForgotPasswordRequest;
import com.vinhung.nookaapi.auth.model.dto.LoginRequest;
import com.vinhung.nookaapi.auth.model.dto.OAuthLoginRequest;
import com.vinhung.nookaapi.auth.model.dto.LogoutRequest;
import com.vinhung.nookaapi.auth.model.dto.MessageResponse;
import com.vinhung.nookaapi.auth.model.dto.RefreshTokenRequest;
import com.vinhung.nookaapi.auth.model.dto.RegistrationVerificationResponse;
import com.vinhung.nookaapi.auth.model.dto.RegisterRequest;
import com.vinhung.nookaapi.auth.model.dto.ResendVerificationRequest;
import com.vinhung.nookaapi.auth.model.dto.ResetPasswordRequest;
import com.vinhung.nookaapi.auth.model.dto.UserResponse;
import com.vinhung.nookaapi.auth.model.dto.UsernameAvailabilityResponse;
import com.vinhung.nookaapi.auth.model.dto.VerificationRequiredResponse;
import com.vinhung.nookaapi.auth.model.dto.VerifyEmailRequest;
import com.vinhung.nookaapi.auth.service.AuthService;
import com.vinhung.nookaapi.auth.model.enums.OAuthProvider;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    VerificationRequiredResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @GetMapping("/username-availability")
    UsernameAvailabilityResponse usernameAvailability(@RequestParam("username") String username) {
        return new UsernameAvailabilityResponse(authService.isUsernameAvailable(username));
    }

    @PostMapping("/verify-email")
    RegistrationVerificationResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return authService.verifyEmail(request.email(), request.code());
    }

    @PostMapping("/register/complete")
    AuthResponse completeRegistration(@Valid @RequestBody CompleteRegistrationRequest request) {
        return authService.completeRegistration(request);
    }

    @PostMapping("/resend-verification")
    MessageResponse resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.email());
        return new MessageResponse("Verification code sent");
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/oauth/google")
    AuthResponse google(@Valid @RequestBody OAuthLoginRequest request) {
        return authService.oauthLogin(OAuthProvider.GOOGLE, request.token());
    }

    @PostMapping("/oauth/apple")
    AuthResponse apple(@Valid @RequestBody OAuthLoginRequest request) {
        return authService.oauthLogin(OAuthProvider.APPLE, request.token());
    }

    @PostMapping("/oauth/facebook")
    AuthResponse facebook(@Valid @RequestBody OAuthLoginRequest request) {
        return authService.oauthLogin(OAuthProvider.FACEBOOK, request.token());
    }

    @PostMapping("/refresh")
    AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    MessageResponse logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
        return new MessageResponse("Logged out");
    }

    @PostMapping("/forgot-password")
    MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return new MessageResponse(authService.requestPasswordReset(request.email()));
    }

    @PostMapping("/reset-password")
    MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return new MessageResponse("Password reset");
    }

    @GetMapping("/me")
    UserResponse me(@AuthenticationPrincipal UUID userId) {
        return authService.getCurrentUser(userId);
    }
}
