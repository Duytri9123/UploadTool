/**
 * Internationalization (i18n) Module
 * Migrated from static/js/i18n.js into ES6 module.
 * Supports Vietnamese (vi) and English (en).
 *
 * @module i18n
 */

const TRANSLATIONS = {
  vi: {
    // Navigation
    nav_user: 'Tìm người dùng',
    nav_download: 'Tải xuống',
    nav_config: 'Cấu hình',
    nav_cookies: 'Cookies',
    nav_transcribe: 'Phiên âm',
    nav_history: 'Lịch sử',
    nav_process: 'Xử lý Video',

    // Page titles
    title_user: 'Tìm người dùng',
    title_download: 'Tải xuống',
    title_config: 'Cấu hình',
    title_cookies: 'Cookies',
    title_transcribe: 'Phiên âm',
    title_history: 'Lịch sử',
    title_process: 'Xử lý Video',

    // Buttons
    btn_search: 'Tìm kiếm',
    btn_start_tr: 'Bắt đầu phiên âm',
    btn_refresh: 'Làm mới',
    btn_clear_history: 'Xóa lịch sử',
    btn_clear_queue: 'Xóa hàng chờ',
    btn_add_queue: 'Thêm vào hàng chờ',
    btn_select_all: 'Chọn tất cả',
    btn_clear_sel: 'Bỏ chọn',
    btn_prev: 'Trước',
    btn_next: 'Tiếp',
    btn_process_video: 'Xử lý Video',

    // Labels
    lbl_history: 'Lịch sử tải xuống',
    lbl_no_history: 'Chưa có lịch sử',
    lbl_queue: 'Hàng chờ',
    lbl_selected: 'đã chọn',
    lbl_loading_user: 'Đang tải dữ liệu người dùng...',
    lbl_videos: 'Video',
    lbl_type: 'Loại',
    lbl_sort: 'Sắp xếp',
    lbl_search_title: 'Tìm tiêu đề',
    lbl_filter_all: 'Tất cả',
    lbl_filter_video: 'Video',
    lbl_filter_gallery: 'Ảnh',
    lbl_sort_newest: 'Mới nhất',
    lbl_sort_oldest: 'Cũ nhất',
    lbl_sort_play: 'Xem nhiều nhất',
    lbl_sort_like: 'Thích nhiều nhất',
    lbl_simplified: 'Chữ giản thể',
    lbl_cookie_default: 'Mặc định',
    lbl_cookie_custom: 'Tùy chỉnh',
    lbl_cookie_default_desc: 'Sử dụng cookies mặc định từ file cấu hình',
    lbl_cookie_custom_desc: 'Sử dụng cookies tùy chỉnh bạn đã nhập',

    // Table headers
    th_time: 'Thời gian',
    th_url: 'URL',
    th_type: 'Loại',
    th_total: 'Tổng',
    th_success: 'Thành công',

    // Toast messages
    toast_config_saved: 'Đã lưu cấu hình',
    toast_cookies_saved: 'Đã lưu cookies',
    toast_queue_cleared: 'Đã xóa hàng chờ',
    toast_history_cleared: 'Đã xóa lịch sử',
    toast_added_queue: 'Đã thêm vào hàng chờ',
    toast_tr_done: 'Phiên âm hoàn tất',
    toast_dl_error: 'Tải xuống có lỗi',

    // Confirm dialogs
    confirm_clear_queue: 'Xóa tất cả hàng chờ?',
    confirm_clear_history: 'Xóa toàn bộ lịch sử tải xuống?',
  },

  en: {
    // Navigation
    nav_user: 'Search User',
    nav_download: 'Download',
    nav_config: 'Config',
    nav_cookies: 'Cookies',
    nav_transcribe: 'Transcribe',
    nav_history: 'History',
    nav_process: 'Video Process',

    // Page titles
    title_user: 'Search User',
    title_download: 'Download',
    title_config: 'Configuration',
    title_cookies: 'Cookies',
    title_transcribe: 'Transcribe',
    title_history: 'History',
    title_process: 'Video Process',

    // Buttons
    btn_search: 'Search',
    btn_start_tr: 'Start Transcribe',
    btn_refresh: 'Refresh',
    btn_clear_history: 'Clear',
    btn_clear_queue: 'Clear Queue',
    btn_add_queue: 'Add to Queue',
    btn_select_all: 'Select All',
    btn_clear_sel: 'Deselect',
    btn_prev: 'Previous',
    btn_next: 'Next',
    btn_process_video: 'Process Video',

    // Labels
    lbl_history: 'Download History',
    lbl_no_history: 'No history yet',
    lbl_queue: 'Queue',
    lbl_selected: 'selected',
    lbl_loading_user: 'Loading user data...',
    lbl_videos: 'Videos',
    lbl_type: 'Type',
    lbl_sort: 'Sort',
    lbl_search_title: 'Search title',
    lbl_filter_all: 'All',
    lbl_filter_video: 'Video',
    lbl_filter_gallery: 'Gallery',
    lbl_sort_newest: 'Newest',
    lbl_sort_oldest: 'Oldest',
    lbl_sort_play: 'Most viewed',
    lbl_sort_like: 'Most liked',
    lbl_simplified: 'Simplified CN',
    lbl_cookie_default: 'Default',
    lbl_cookie_custom: 'Custom',
    lbl_cookie_default_desc: 'Use default cookies from config file',
    lbl_cookie_custom_desc: 'Use custom cookies you entered',

    // Table headers
    th_time: 'Time',
    th_url: 'URL',
    th_type: 'Type',
    th_total: 'Total',
    th_success: 'Success',

    // Toast messages
    toast_config_saved: 'Config saved',
    toast_cookies_saved: 'Cookies saved',
    toast_queue_cleared: 'Queue cleared',
    toast_history_cleared: 'History cleared',
    toast_added_queue: 'Added to queue',
    toast_tr_done: 'Transcription done',
    toast_dl_error: 'Download finished with errors',

    // Confirm dialogs
    confirm_clear_queue: 'Clear all queue items?',
    confirm_clear_history: 'Clear all download history?',
  },
};

const STORAGE_KEY = 'app-lang';
let _currentLang = 'vi';

/**
 * Initialize i18n — reads stored language preference
 */
export function initI18n() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) _currentLang = stored;
  } catch (_) {}
}

/**
 * Get current language
 * @returns {'vi'|'en'}
 */
export function getLang() {
  return _currentLang;
}

/**
 * Set language and persist preference
 * @param {'vi'|'en'} lang
 */
export function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _currentLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
}

/**
 * Toggle between vi and en
 * @returns {'vi'|'en'} new language
 */
export function toggleLang() {
  const next = _currentLang === 'vi' ? 'en' : 'vi';
  setLang(next);
  return next;
}

/**
 * Translate a key
 * @param {string} key
 * @param {string} [fallback] - Fallback text if key not found
 * @returns {string}
 */
export function t(key, fallback) {
  return TRANSLATIONS[_currentLang]?.[key]
    ?? TRANSLATIONS['vi']?.[key]
    ?? fallback
    ?? key;
}

/**
 * Apply translations to all elements with data-i18n attribute
 * @param {HTMLElement} [root=document]
 */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
}

export default { t, initI18n, getLang, setLang, toggleLang, applyI18n };
