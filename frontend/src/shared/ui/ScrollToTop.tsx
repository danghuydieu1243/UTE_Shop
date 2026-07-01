import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — cuộn về đầu trang mỗi khi đổi route (pathname).
 * React Router không tự reset scroll khi điều hướng (SPA), nên cần component này.
 * Chỉ phụ thuộc `pathname` để KHÔNG cuộn khi chỉ đổi query string
 * (vd lọc/tìm/phân trang ở catalog giữ nguyên vị trí cuộn).
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
