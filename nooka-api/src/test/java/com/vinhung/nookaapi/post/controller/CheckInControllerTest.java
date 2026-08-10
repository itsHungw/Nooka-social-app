package com.vinhung.nookaapi.post.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vinhung.nookaapi.post.model.dto.CreateCheckInResponse;
import com.vinhung.nookaapi.post.service.CreateCheckInService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
        controllers = CheckInController.class,
        properties = "nooka.security.enabled=false")
class CheckInControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CreateCheckInService service;

    @Test
    void createsCheckInFromAuthenticatedMultipartRequest() throws Exception {
        UUID authorId = UUID.randomUUID();
        UUID spotId = UUID.randomUUID();
        UUID publicId = UUID.randomUUID();
        UUID idempotencyKey = UUID.randomUUID();
        var response = new CreateCheckInResponse(
                publicId, spotId, "PUBLIC", false, "PENDING", false,
                List.of(), List.of());
        given(service.create(any(), any(), any(), any()))
                .willReturn(response);

        var post = new MockMultipartFile("post", "post.json", MediaType.APPLICATION_JSON_VALUE,
                ("{\"spotId\":\"" + spotId + "\",\"visibility\":\"PUBLIC\"}")
                        .getBytes(StandardCharsets.UTF_8));
        var photo = new MockMultipartFile("photos", "check-in.jpg", MediaType.IMAGE_JPEG_VALUE,
                new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/v1/posts/check-ins")
                        .file(post)
                        .file(photo)
                        .header("Idempotency-Key", idempotencyKey)
                        .principal(UsernamePasswordAuthenticationToken.authenticated(
                                authorId, null, List.of())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/v1/posts/" + publicId))
                .andExpect(jsonPath("$.publicId").value(publicId.toString()))
                .andExpect(jsonPath("$.beenStatus").value("PENDING"));

        verify(service).create(eq(authorId), eq(idempotencyKey), any(), any());
    }
}
