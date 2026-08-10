package com.vinhung.nookaapi.media.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.media.api.IncomingImage;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ImageSanitizerTest {

    private final ImageSanitizer sanitizer = new ImageSanitizer();

    @Test
    void reencodesJpegWithoutExifMetadata() throws Exception {
        BufferedImage image = new BufferedImage(4, 3, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, Color.ORANGE.getRGB());
        ByteArrayOutputStream jpeg = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", jpeg);
        byte[] originalWithExif = insertExifSegment(jpeg.toByteArray(),
                "Exif\0\0GPSLatitude=10.777;GPSLongitude=106.700");

        ImageSanitizer.SanitizedImage sanitized = sanitizer.sanitize(
                new IncomingImage(originalWithExif, "image/jpeg", "iphone-live-still.jpg"));

        assertThat(sanitized.contentType()).isEqualTo("image/jpeg");
        assertThat(sanitized.width()).isEqualTo(4);
        assertThat(sanitized.height()).isEqualTo(3);
        assertThat(new String(sanitized.content(), StandardCharsets.ISO_8859_1))
                .doesNotContain("Exif")
                .doesNotContain("GPSLatitude")
                .doesNotContain("GPSLongitude");
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(sanitized.content())))
                .isNotNull();
    }

    private static byte[] insertExifSegment(byte[] jpeg, String value) {
        byte[] payload = value.getBytes(StandardCharsets.ISO_8859_1);
        int segmentLength = payload.length + 2;
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(jpeg, 0, 2);
        output.write(0xff);
        output.write(0xe1);
        output.write((segmentLength >>> 8) & 0xff);
        output.write(segmentLength & 0xff);
        output.writeBytes(payload);
        output.write(jpeg, 2, jpeg.length - 2);
        return output.toByteArray();
    }
}
