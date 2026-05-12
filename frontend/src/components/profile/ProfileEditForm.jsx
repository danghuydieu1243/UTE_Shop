import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { updateProfileAsync, clearError } from '../../store/slices/userSlice'
import { selectProfile, selectUserLoading, selectUserError } from '../../store/selectors/authSelectors'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import Input from '../common/Input'
import Alert from '../common/Alert'

const ProfileEditForm = ({ onSuccess }) => {
  const dispatch = useDispatch()
  const profile = useSelector(selectProfile)
  const isLoading = useSelector(selectUserLoading)
  const error = useSelector(selectUserError)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || ''
    }
  })

  const onSubmit = (data) => {
    dispatch(updateProfileAsync(data)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => dispatch(clearError())}
          className="mb-4"
        />
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-4">
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
        </div>

        <div className="sm:col-span-4">
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
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  )
}

export default ProfileEditForm
