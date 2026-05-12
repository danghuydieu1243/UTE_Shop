import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Chào mừng đến với UTEShop
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Nền tảng thương mại điện tử của bạn
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Đăng ký & Xác thực</h3>
            <p className="text-gray-600">Tạo tài khoản mới và xác thực email của bạn</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Quản lý Tài khoản</h3>
            <p className="text-gray-600">Xem và cập nhật thông tin hồ sơ của bạn</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Bảo mật</h3>
            <p className="text-gray-600">Phục hồi mật khẩu an toàn với OTP</p>
          </div>
        </div>

        <div className="mt-12">
          {localStorage.getItem('uteshop_token') ? (
            <Link
              to="/profile"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
            >
              Truy cập hồ sơ của bạn
            </Link>
          ) : (
            <Link
              to="/register"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
            >
              Bắt đầu ngay
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
