# GoingTool

Bộ công cụ online cho lập trình viên, chạy hoàn toàn trên trình duyệt (dữ liệu không gửi lên server).

| Đường dẫn | Công cụ |
| --- | --- |
| `/` | JSON Parser: format, minify, kiểm tra, dạng cây, so sánh, chuyển sang JS/PHP/Python/XML/Markdown |
| `/json-to-type` | Sinh type TypeScript, Go, Kotlin, Swift, C#, Java, Python từ JSON |
| `/html-online` | Viết và xem trước HTML trong iframe sandbox |
| `/compare` | So sánh hai văn bản theo dòng |
| `/lunar-calendar` | Lịch âm dương, đổi ngày âm ↔ dương |
| `/dem-ngay` | Đếm ngày giữa hai mốc |

## Phát triển

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit test (vitest) cho lib/
npm run lint
npm run build
```

Dự án dùng Next.js 16 (App Router). API của bản này khác các bản cũ, xem `node_modules/next/dist/docs/` trước khi sửa.

## Đa ngôn ngữ

Hỗ trợ 5 ngôn ngữ: tiếng Anh (mặc định, URL không tiền tố), tiếng Việt `/vi`, tiếng Trung giản thể `/zh`, tiếng Nhật `/ja`, tiếng Hàn `/ko`:

| Tiếng Anh | Tiếng Việt | 中文 | 日本語 | 한국어 |
| --- | --- | --- | --- | --- |
| `/` | `/vi` | `/zh` | `/ja` | `/ko` |
| `/compare` | `/vi/compare` | `/zh/compare` | `/ja/compare` | `/ko/compare` |

- `proxy.ts` rewrite URL không tiền tố sang `/en/...`, chuyển hướng 308 `/en/...` về URL không tiền tố, và gắn header `x-locale`.
- Mỗi trang có canonical + `hreflang` (en, vi, x-default); `sitemap.xml` liệt kê cả hai ngôn ngữ.
- Chuỗi giao diện nằm trong `lib/i18n/en.ts` (bản gốc, định nghĩa cấu trúc) và `vi.ts`, `zh.ts`, `ja.ts`, `ko.ts` (bị kiểm tra kiểu theo bản gốc; thiếu key là build lỗi).
- Component client lấy chuỗi qua `useI18n()` → `{ t, n, intl, href, locale }`.
- Thêm ngôn ngữ: thêm mã vào `LOCALES` và `LOCALE_LABELS` (`lib/i18n/config.ts`) và `LOCALES` trong `proxy.ts`, tạo file từ điển, đăng ký trong `lib/i18n/index.ts`, thêm locale của react-day-picker vào `PICKER_LOCALES` ở Đếm ngày và Lịch âm.

## Cấu trúc

- `app/[lang]/layout.tsx`: root layout (một bản cho mỗi ngôn ngữ, sinh tĩnh).
- `app/[lang]/<tool>/page.tsx`: server component, chỉ khai báo `metadata` theo ngôn ngữ và render component client.
- `app/[lang]/<tool>/<Tool>.tsx`: giao diện (client component).
- `app/global-not-found.tsx`: trang 404 cho URL không khớp route nào (theo ngôn ngữ của URL).
- `app/components/`: phần dùng chung (topbar, nav, chuyển ngôn ngữ, công tắc giao diện, editor, lỗi JSON, quảng cáo).
- `lib/`: logic thuần, có unit test:
  - `json.ts`: parse JSON, vị trí lỗi, đường dẫn
  - `converters.ts`: JS/PHP/Python/XML/Markdown
  - `diff.ts`: so sánh theo dòng (LCS, có giới hạn kích thước)
  - `storage.ts`: localStorage và clipboard an toàn
  - `hooks.ts`: media query, kéo đổi kích thước
  - `theme.ts`, `layout.ts`: sáng/tối, độ rộng workspace
  - `i18n/`: cấu hình ngôn ngữ, từ điển, metadata
  - `site.ts`: tên site, URL, danh sách công cụ (dùng cho nav và sitemap)

Thêm công cụ mới: tạo route trong `app/[lang]/`, thêm một dòng vào `TOOLS` trong `lib/site.ts`, thêm nhãn/mô tả/metadata vào hai file từ điển.

## Cấu hình

| Biến môi trường | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://goingtool.com` | URL gốc cho canonical và sitemap |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | publisher ID hiện tại | AdSense client |
| `NEXT_PUBLIC_ADSENSE_SLOT` | _(trống)_ | Slot quảng cáo; để trống thì không hiện khối quảng cáo |
