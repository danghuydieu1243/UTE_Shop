import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { loginAsync, clearError } from '../../store/slices/authSlice'
import { selectAuthLoading, selectAuthError } from '../../store/selectors/authSelectors'
import Button from '../common/Button'
import Input from '../common/Input'
import Alert from '../common/Alert'

const LoginForm = () => {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = (data) => {
    dispatch(loginAsync(data))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Đăng nhập</h2>

        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => dispatch(clearError())}
            className="mb-4"
          />
        )}

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
            label="Mật khẩu"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu"
            registration={register('password', {
              required: 'Mật khẩu là bắt buộc'
            })}
            error={errors.password?.message}
            disabled={isLoading}
          />

          <div className="mb-4">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Đăng nhập
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
