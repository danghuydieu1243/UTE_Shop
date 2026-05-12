import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getProfileAsync, clearProfile } from '../store/slices/userSlice'
import { selectProfile, selectUserLoading, selectUserError } from '../store/selectors/authSelectors'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ProfileEditForm from '../components/profile/ProfileEditForm'
import Alert from '../components/common/Alert'
import Spinner from '../components/common/Spinner'

const ProfilePage = () => {
  const dispatch = useDispatch()
  const profile = useSelector(selectProfile)
  const isLoading = useSelector(selectUserLoading)
  const error = useSelector(selectUserError)
  const [isEditing, setIsEditing] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  useEffect(() => {
    dispatch(getProfileAsync())
    return () => {
      dispatch(clearProfile())
    }
  }, [dispatch])

  const handleEditSuccess = () => {
    setIsEditing(false)
    setEditSuccess(true)
    setTimeout(() => setEditSuccess(false), 5000)
  }

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
      {editSuccess && (
        <Alert
          type="success"
          message="Cập nhật hồ sơ thành công!"
          className="mb-6"
        />
      )}

      <Card title="Thông tin hồ sơ">
        {!isEditing ? (
          <div>
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
                <dt className="text-sm font-medium text-gray-500">Số điện thoại</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.phone || 'Chưa cập nhật'}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Vai trò</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {profile.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
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

              <div>
                <dt className="text-sm font-medium text-gray-500">Ngày tạo</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
              >
                Chỉnh sửa
              </Button>
            </div>
          </div>
        ) : (
          <ProfileEditForm onSuccess={handleEditSuccess} />
        )}
      </Card>
    </div>
  )
}

export default ProfilePage
