package com.vinhung.nookaapi.media.service;

import com.vinhung.nookaapi.media.api.IncomingImage;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.Set;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ImageSanitizer {

    private static final long MAX_PIXELS = 40_000_000L;
    private static final Set<String> ALLOWED_FORMATS = Set.of("JPEG", "PNG");

    public SanitizedImage sanitize(IncomingImage incoming) {
        try (ImageInputStream stream = ImageIO.createImageInputStream(
                new ByteArrayInputStream(incoming.content()))) {
            if (stream == null) {
                throw invalid("Photo is not a readable image");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) {
                throw invalid("Only JPEG and PNG photos are supported");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                String format = reader.getFormatName().toUpperCase(java.util.Locale.ROOT);
                if (!ALLOWED_FORMATS.contains(format)) {
                    throw invalid("Only JPEG and PNG photos are supported");
                }
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if ((long) width * height > MAX_PIXELS) {
                    throw invalid("Photo exceeds the 40 megapixel limit");
                }
                BufferedImage decoded = reader.read(0);
                String outputFormat = format.equals("PNG") ? "png" : "jpg";
                String contentType = format.equals("PNG") ? "image/png" : "image/jpeg";
                BufferedImage safePixels = outputFormat.equals("jpg")
                        ? withoutAlpha(decoded) : decoded;
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                if (!ImageIO.write(safePixels, outputFormat, output)) {
                    throw invalid("Photo could not be encoded safely");
                }
                byte[] content = output.toByteArray();
                return new SanitizedImage(content, contentType, width, height, sha256(content));
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalid("Photo is corrupt or unreadable", exception);
        }
    }

    private static BufferedImage withoutAlpha(BufferedImage source) {
        if (!source.getColorModel().hasAlpha() && source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }
        BufferedImage rgb = new BufferedImage(
                source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rgb.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return rgb;
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required by the JDK", exception);
        }
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException invalid(String message, Exception cause) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message, cause);
    }

    public record SanitizedImage(
            byte[] content, String contentType, int width, int height, String checksum) {
    }
}
