import sanitizeHtml from 'sanitize-html';

/**
 * Whitelist các tag được phép trong nội dung blog (viết tay HTML từ admin editor).
 * Mọi tag khác — kể cả script/iframe/object/embed/form — bị loại bỏ hoàn toàn
 * kèm nội dung bên trong (disallowedTagsModes: 'discard').
 */
const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'code',
  'pre',
  'span',
];

/**
 * Chỉ cho phép thuộc tính an toàn theo từng tag. Mọi thuộc tính khác —
 * bao gồm toàn bộ event handler (on*) và style — tự động bị strip.
 */
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'rel'],
  img: ['src', 'alt'],
};

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  // href của <a>: http/https/mailto; src của <img>: chỉ https
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  /**
   * <script>, <iframe>, <object>, <embed>, <form> (và các tag mặc định) bị xóa
   * HOÀN TOÀN kèm nội dung bên trong. nonTextTags là cơ chế per-tag duy nhất
   * đạt được điều này — `disallowedTagsMode` chỉ là chế độ toàn cục.
   */
  nonTextTags: [
    'script',
    'style',
    'textarea',
    'option',
    'xmp',
    'noscript',
    'iframe',
    'object',
    'embed',
    'form',
  ],
  // Ép mọi <a> có rel chống tabnabbing; loại img nào mất src sau khi lọc scheme
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer nofollow' },
    }),
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
};

/**
 * Làm sạch HTML của nội dung blog trước khi render qua dangerouslySetInnerHTML.
 * Chạy được cả ở node (SSR/test) và trong bundle trình duyệt — sanitize-html
 * xử lý thuần chuỗi, không cần DOM.
 */
export function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
