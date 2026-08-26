/**
 * Vietnamese presentation layer for the knowledge base.
 *
 * The corpus in `lib/rag/corpus.ts` stays English because BM25 scores exact
 * terms against it — translating the index would break lexical retrieval. These
 * translations are display-only: retrieval runs on the English text, and the UI
 * renders whichever language the reader chose.
 */

export type LocalizedDocument = {
  title: string;
  source: string;
  text: string;
};

export const corpusVi: Record<string, LocalizedDocument> = {
  "OPS-17": {
    title: "Thử nghiệm bảo trì dự đoán: báo cáo hiện trường Q2",
    source: "Vận hành / Độ tin cậy đội xe",
    text: "Một thử nghiệm 12 tuần trên 84 xe đông lạnh đã giảm 18% thời gian dừng ngoài kế hoạch và 11% sự cố dọc đường. Độ chính xác đạt 0,82 với hỏng máy nén, nhưng chỉ 0,61 với mòn phanh. Kết quả tốt nhất đến từ các xe có ít nhất chín tháng telemetry sạch. Báo cáo khuyến nghị triển khai theo giai đoạn, bắt đầu từ hệ thống làm lạnh, kèm cổng duyệt của con người cho mọi khuyến nghị bảo trì.",
  },
  "FIN-08": {
    title: "Luận chứng kinh doanh cho trí tuệ đội xe",
    source: "Tài chính / Ủy ban Đầu tư",
    text: "Đợt triển khai châu Âu được đề xuất tốn €1,4 triệu trong năm đầu, gồm cảm biến, tích hợp, đào tạo và giám sát. Ở mức giảm downtime thận trọng 12% của thử nghiệm, thời gian hoàn vốn mô hình hóa là 19 tháng. Triển khai đồng loạt diện rộng đẩy thời gian hoàn vốn vượt 30 tháng vì 37% đội xe thiếu telemetry đáng tin cậy. Triển khai ưu tiên xe đông lạnh được dự báo đạt dòng tiền dương ở tháng thứ 14.",
  },
  "RISK-12": {
    title: "Rà soát rủi ro mô hình: khuyến nghị bảo trì",
    source: "Rủi ro & Tuân thủ",
    text: "Khuyến nghị bảo trì tự động có thể tạo rủi ro an toàn và trách nhiệm pháp lý khi dữ liệu huấn luyện không đại diện cho tuổi xe, khí hậu hay tập quán từng trạm. Bộ phận Rủi ro yêu cầu con người phê duyệt các lệnh công việc liên quan an toàn, kiểm tra trôi dạt hằng tháng theo nhóm xe, nhật ký quyết định bất biến, và một đường quay lui tức thời. Mô hình không được tự ý hoãn lịch bảo trì.",
  },
  "LEGAL-04": {
    title: "Bản ghi nhớ kiểm soát triển khai tại EU",
    source: "Pháp lý / Quản lý số",
    text: "Telemetry dùng cho sức khỏe thiết bị có thể gián tiếp hé lộ hành vi tài xế. Đợt triển khai EU phải thực thi giới hạn mục đích, thời gian lưu tối thiểu, phân quyền theo vai trò và thông báo cho người lao động. Hệ thống được định vị là hỗ trợ quyết định cho bảo trì thiết bị, không phải chấm điểm hiệu suất nhân viên. Pháp lý khuyến nghị lập đánh giá tác động có hồ sơ trước khi mở rộng ra ngoài các nước thử nghiệm.",
  },
  "ENG-23": {
    title: "Kiến trúc vận hành FleetSense",
    source: "Kỹ thuật / Hồ sơ quyết định kiến trúc",
    text: "FleetSense nạp telemetry qua hàng đợi theo vùng, tính đặc trưng trong pipeline luồng, và phục vụ điểm rủi ro qua API có phiên bản. Mỗi dự đoán đều ghi lại phiên bản mô hình, độ tươi đặc trưng, độ tin cậy và người vận hành đã phê duyệt. Đánh giá song song chạy hai tuần trước khi thăng cấp. Công tắc ngắt theo vùng và triển khai mô hình blue-green giữ thời gian quay lui dưới năm phút.",
  },
  "DATA-05": {
    title: "Kiểm toán mức sẵn sàng telemetry",
    source: "Nền tảng Dữ liệu / Hội đồng Chất lượng",
    text: "Sáu mươi ba phần trăm đội xe châu Âu đạt ngưỡng vận hành là 95% độ đầy đủ cảm biến. Xe đông lạnh đạt 88% mức sẵn sàng; xe tải khô đời cũ chỉ đạt 41%. Đức và Hà Lan có độ phủ mạnh nhất. Kiểm toán khuyến nghị chặn suy luận của mô hình khi độ tươi đặc trưng vượt 15 phút và công bố điểm chất lượng dữ liệu bên cạnh mọi khuyến nghị.",
  },
  "SRE-19": {
    title: "Mục tiêu độ tin cậy dịch vụ AI",
    source: "SRE Nền tảng / Sổ tay Dịch vụ",
    text: "Dịch vụ hỗ trợ quyết định khi vận hành đặt mục tiêu 99,9% khả dụng hằng tháng và thời gian phản hồi p95 dưới 800 ms. Bất kỳ đợt tăng đột biến âm tính giả liên quan an toàn nào cũng kích hoạt xử lý mức nghiêm trọng một trong vòng 15 phút. Các nhóm phải theo dõi trôi dạt đầu vào, phân phối đầu ra, tỷ lệ ghi đè và thời gian tới lượt con người xem xét, ngoài các chỉ số hạ tầng tiêu chuẩn.",
  },
  "PEOPLE-03": {
    title: "Phỏng vấn mức chấp nhận tại trạm",
    source: "Nghiên cứu Sản phẩm / Vận hành Hiện trường",
    text: "Quản lý trạm đánh giá cao cảnh báo sớm nhưng bỏ qua những cảnh báo thiếu giải thích bằng ngôn ngữ đời thường hoặc thiếu lịch sử linh kiện. Mức chấp nhận tăng từ 46% lên 79% khi mỗi cảnh báo hiển thị xu hướng cảm biến hỗ trợ và cho phép người vận hành ghi lại lý do ghi đè. Quản lý đề nghị đào tạo theo vai trò và các buổi phản hồi hằng tuần trong quá trình triển khai.",
  },
};
