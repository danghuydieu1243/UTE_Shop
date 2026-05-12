import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { forgotPasswordAsync, clearError } from '../../store/slices/authSlice'
import { selectAuthLoading, selectAuthError } from '../../store/selectors/authSelectors'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import Input from '../common/Input'
import Alert from '../common/Alert'

const ForgotPasswordForm = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = (data) => {
    dispatch(forgotPasswordAsync(data.email))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quên mật khẩu</h2>

        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => dispatch(clearError())}
            className="mb-4"
          />
        )}

        <p className="text-gray-600 mb-6">
          Nhập email của bạn và chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
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

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Gửi mã OTP
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

export default ForgotPasswordForm
