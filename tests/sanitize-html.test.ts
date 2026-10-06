import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtmlContent } from '@/lib/sanitize';

// Case 1: HTML hợp lệ trong whitelist giữ nguyên
test('keeps whitelisted paragraph and strong markup intact', () => {
  const input = '<p>Chào <strong>bánh</strong></p>';

  assert.equal(sanitizeHtmlContent(input), input);
});

// Case 2: on* attribute bị strip, img + src hợp lệ được giữ
test('strips onerror from img while keeping the tag and https src', () => {
  const output = sanitizeHtmlContent('<img src="https://x/y.png" onerror="alert(1)">');

  assert.ok(!output.includes('onerror'));
  assert.ok(!output.includes('alert(1)'));
  assert.ok(output.includes('<img'));
  assert.ok(output.includes('src="https://x/y.png"'));
});

// Case 3: script bị bỏ hoàn toàn kèm nội dung
test('removes script tag together with its content', () => {
  const output = sanitizeHtmlContent('Trước<script>alert(1)</script>Sau');

  assert.equal(output, 'TrướcSau');
});

// Case 4: onclick bị strip, rel="noopener noreferrer nofollow" được thêm vào a
test('strips onclick from anchor and enforces rel noopener noreferrer nofollow', () => {
  const output = sanitizeHtmlContent('<a href="https://x" onclick="h()">Liên kết</a>');

  assert.ok(!output.includes('onclick'));
  assert.ok(!output.includes('h()'));
  assert.ok(output.includes('href="https://x"'));
  assert.ok(output.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(output.includes('Liên kết'));
});

// Case 5: img src không phải https bị loại (chỉ cho phép https)
test('drops img whose src is not https', () => {
  const output = sanitizeHtmlContent('<p>Ảnh</p><img src="http://insecure/x.png">');

  assert.ok(!output.includes('<img'));
  assert.ok(!output.includes('insecure'));
  assert.equal(output, '<p>Ảnh</p>');
});

// Case 6: text tiếng Việt có dấu giữ nguyên
test('preserves Vietnamese diacritics in text content', () => {
  const input = '<p>Bánh mì Phương Loan — giòn rụm, thơm lừng</p>';

  assert.equal(sanitizeHtmlContent(input), input);
});

// Case 7: iframe / embed / object bị bỏ hoàn toàn
test('removes iframe, embed and object tags entirely', () => {
  const output = sanitizeHtmlContent(
    '<iframe src="https://evil.example"></iframe><p>Nội dung</p><embed src="https://evil.example/x"><object data="https://evil.example/o">fallback</object>'
  );

  assert.equal(output, '<p>Nội dung</p>');
});

// Whitelist: style attribute không được cho qua
test('strips style attributes from whitelisted tags', () => {
  const output = sanitizeHtmlContent('<p style="color:red;position:fixed">Bánh</p>');

  assert.ok(!output.includes('style'));
  assert.ok(!output.includes('color:red'));
  assert.equal(output, '<p>Bánh</p>');
});

// Whitelist: blog HTML thông thường (heading, bảng, blockquote) giữ nguyên
test('keeps legitimate blog HTML: headings, tables, blockquote, figure', () => {
  const input =
    '<h2>Cách làm bánh</h2>' +
    '<blockquote>Ghi chú quan trọng</blockquote>' +
    '<table><thead><tr><th>Nguyên liệu</th></tr></thead><tbody><tr><td>Bột mì</td></tr></tbody></table>' +
    '<figure><img src="https://res.cloudinary.com/demo/banh.png" alt="Bánh" /><figcaption>Bánh thành phẩm</figcaption></figure>';

  assert.equal(sanitizeHtmlContent(input), input);
});
