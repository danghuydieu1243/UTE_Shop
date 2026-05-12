import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { resetPasswordAsync, clearError } from '../../store/slices/authSlice'
import { selectAuthLoading, selectAuthError } from '../../store/selectors/authSelectors'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import Input from '../common/Input'
import Alert from '../common/Alert'

const ResetPasswordForm = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: '',
      token: '',
      new_password: '',
      confirm_password: ''
    }
  })

  const newPassword = watch('new_password')

  const onSubmit = (data) => {
    const { confirm_password, ...resetData } = data
    dispatch(resetPasswordAsync(resetData))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Đặt lại mật khẩu</h2>

        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => dispatch(clearError())}
            className="mb-4"
          />
        )}

        <p className="text-gray-600 mb-6">
          Nhập email, mã OTP và mật khẩu mới của bạn.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Nhập email của bạn"
            registration={register('email', {
              required: 'Email là bắt buộc',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email không hợp lệ'
              }
            })}
            error={errors.email?.message}
            disabled={isLoading}
          />

          <Input
            label="Mã OTP"
            name="token"
            type="text"
            placeholder="Nhập mã 6 chữ số"
            registration={register('token', {
              required: 'Mã OTP là bắt buộc',
              pattern: {
                value: /^[0-9]{6}$/,
                message: 'Mã OTP phải là 6 chữ số'
              }
            })}
            error={errors.token?.message}
            disabled={isLoading}
          />

          <Input
            label="Mật khẩu mới"
            name="new_password"
            type="password"
            placeholder="Nhập mật khẩu mới"
            registration={register('new_password', {
              required: 'Mật khẩu mới là bắt buộc',
              minLength: {
                value: 6,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
              }
            })}
            error={errors.new_password?.message}
            disabled={isLoading}
          />

          <Input
            label="Xác nhận mật khẩu mới"
            name="confirm_password"
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            registration={register('confirm_password', {
              required: 'Xác nhận mật khẩu là bắt buộc',
              validate: (value) => value === newPassword || 'Mật khẩu không khớp'
            })}
            error={errors.confirm_password?.message}
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-4"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Đặt lại mật khẩu
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Đã nhớ mật khẩu?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Quay lại đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordForm
