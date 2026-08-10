/**
 * Số liệu tổng hợp của địa điểm.
 *
 * <p>Module đọc: nó nằm trên {@code post} và {@code review}, đọc xuống qua cổng
 * của hai module đó, và không ai đọc ngược lên nó ngoài controller. Không sở hữu
 * bảng nào ở giai đoạn này — xem {@code SpotStats}.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"shared", "post :: api", "review :: api", "tag :: api"})
package com.vinhung.nookaapi.insight;
