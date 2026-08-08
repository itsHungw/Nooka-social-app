/**
 * Danh mục thẻ mô tả địa điểm.
 *
 * <p>Module lá: không phụ thuộc module nghiệp vụ nào. Module khác tham chiếu
 * thẻ bằng {@code UUID} chứ không phải association, đúng luật "không tạo
 * cross-module JPA association" — khoá ngoại vẫn tồn tại ở tầng database.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = "shared")
package com.vinhung.nookaapi.tag;
