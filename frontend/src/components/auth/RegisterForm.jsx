import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { registerAsync, clearError } from '../../store/slices/authSlice'
import { selectAuthLoading, selectAuthError } from '../../store/selectors/authSelectors'
import Button from '../common/Button'
import Input from '../common/Input'
import Alert from '../common/Alert'

const RegisterForm = () => {
  const dispatch = useDispatch()
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
      password: '',
      confirmPassword: '',
      full_name: '',
      phone: ''
    }
  })

  const password = watch('password')

  const onSubmit = (data) => {
    const { confirmPassword, ...registerData } = data
    dispatch(registerAsync(registerData))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Đăng ký tài khoản</h2>

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
            label="Họ và tên"
            name="full_name"
            type="text"
            placeholder="Nhập họ và tên"
            registration={register('full_name', {
              required: 'Họ và tên là bắt buộc',
              minLength: {
                value: 2,
                message: 'Họ và tên phải có ít nhất 2 ký tự'
              },
              maxLength: {
                value: 100,
                message: 'Họ và tên không được vượt quá 100 ký tự'
              }
            })}
            error={errors.full_name?.message}
            disabled={isLoading}
          />

          <Input
            label="Số điện thoại"
            name="phone"
            type="tel"
            placeholder="Nhập số điện thoại (tùy chọn)"
            registration={register('phone', {
              pattern: {
                value: /^[0-9]{10,11}$/,
                message: 'Số điện thoại không hợp lệ (10-11 số)'
              }
            })}
            error={errors.phone?.message}
            disabled={isLoading}
          />

          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu"
            registration={register('password', {
              required: 'Mật khẩu là bắt buộc',
              minLength: {
                value: 6,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
              }
            })}
            error={errors.password?.message}
            disabled={isLoading}
          />

          <Input
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu"
            registration={register('confirmPassword', {
              required: 'Xác nhận mật khẩu là bắt buộc',
              validate: (value) => value === password || 'Mật khẩu không khớp'
            })}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-4"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Đăng ký
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm
