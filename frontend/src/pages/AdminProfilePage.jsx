import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getProfileAsync, clearProfile } from '../store/slices/userSlice'
import { selectProfile, selectUserLoading, selectUserError } from '../store/selectors/authSelectors'
import Card from '../components/common/Card'
import Alert from '../components/common/Alert'
import Spinner from '../components/common/Spinner'

const AdminProfilePage = () => {
  const dispatch = useDispatch()
  const profile = useSelector(selectProfile)
  const isLoading = useSelector(selectUserLoading)
  const error = useSelector(selectUserError)

  useEffect(() => {
    dispatch(getProfileAsync())
    return () => {
      dispatch(clearProfile())
    }
  }, [dispatch])

  if (isLoading && !profile) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-500">Đang tải thông tin...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <Alert
            type="error"
            message={error}
            className="mb-0"
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Card title="Hồ sơ Quản trị viên">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Họ và tên</dt>
            <dd className="mt-1 text-sm text-gray-900">{profile.full_name}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Vai trò</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Quản trị viên
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Trạng thái xác thực</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {profile.is_verified ? (
                <span className="text-green-600">✓ Đã xác thực</span>
              ) : (
                <span className="text-red-600">✗ Chưa xác thực</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Tính năng quản trị" className="mt-6">
        <p className="text-gray-600 mb-4">
          Các tính năng quản trị sẽ được thêm vào đây trong các phiên bản tiếp theo:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Quản lý người dùng</li>
          <li>Quản lý sản phẩm</li>
          <li>Quản lý đơn hàng</li>
          <li>Dashboard thống kê</li>
        </ul>
      </Card>
    </div>
  )
}

export default AdminProfilePage
