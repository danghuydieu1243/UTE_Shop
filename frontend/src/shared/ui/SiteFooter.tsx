/**
 * SiteFooter — 4-column footer + bottom bar matching home_static.html.
 */
export const SiteFooter = () => {
  return (
    <footer className="border-t border-line pb-9 pt-16">
      <div className="mx-auto max-w-container px-10">
        {/* 4-column grid */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 pb-14">
          {/* Brand column */}
          <div>
            <div className="mb-[18px] text-[18px] font-semibold uppercase tracking-[1px] text-ink">
              Athena
            </div>
            <p className="max-w-[320px] text-[13px] leading-[1.8] text-ink-2">
              Nền tảng E-book trực tuyến hàng đầu Việt Nam. Hơn 10.000 đầu sách điện tử từ các nhà
              xuất bản uy tín.
            </p>
          </div>

          {/* About */}
          <div>
            <h4 className="mb-5 text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3">
              Về Athena
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Giới thiệu
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Điều khoản
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Bảo mật
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Tuyển dụng
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-5 text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3">
              Hỗ trợ
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Hướng dẫn mua hàng
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Chính sách E-book
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  Liên hệ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-5 text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3">
              Liên hệ
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:support@athena.vn"
                  className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink"
                >
                  support@athena.vn
                </a>
              </li>
              <li>
                <a href="#" className="text-[13px] text-ink-2 transition-colors duration-[200ms] hover:text-ink">
                  1800 xxxx
                </a>
              </li>
              <li>
                <span className="text-[13px] text-ink-2">Hà Nội, Việt Nam</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-line pt-7 text-[12px] text-ink-3">
          <span>© 2024 Athena</span>
          <div className="flex gap-7">
            <a href="#" className="text-[12px] text-ink-3 transition-colors duration-[200ms] hover:text-ink">
              Bảo mật
            </a>
            <a href="#" className="text-[12px] text-ink-3 transition-colors duration-[200ms] hover:text-ink">
              Điều khoản
            </a>
            <a href="#" className="text-[12px] text-ink-3 transition-colors duration-[200ms] hover:text-ink">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
