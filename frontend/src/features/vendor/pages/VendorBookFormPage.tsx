import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VendorShell } from '../components/VendorShell';
import {
  useCreateVendorBookMutation,
  useUpdateVendorBookMutation,
  useGetVendorBookQuery,
} from '../vendorBooksApi';
import { useGetCategoriesQuery } from '../../catalog/catalogApi';

// ── Zod schema ─────────────────────────────────────────────────────────────────
const bookFormSchema = z.object({
  title: z
    .string()
    .min(2, 'Tên E-book phải có ít nhất 2 ký tự')
    .max(200, 'Tên E-book không được quá 200 ký tự'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  tableOfContents: z.string().optional(),
  price: z
    .number({ invalid_type_error: 'Giá bán phải là số' })
    .positive('Giá bán phải lớn hơn 0'),
  originalPrice: z.number().positive('Giá gốc phải lớn hơn 0').optional().or(z.literal('')),
  categoryId: z
    .number({ invalid_type_error: 'Vui lòng chọn danh mục' })
    .positive('Vui lòng chọn danh mục'),
  authorName: z.string().min(1, 'Tên tác giả không được để trống'),
  publisherName: z.string().optional(),
  publishYear: z.number().int().min(1000).max(9999).optional().or(z.literal('')),
  isbn: z.string().optional(),
  status: z.enum(['published', 'draft']),
});

type FormValues = z.infer<typeof bookFormSchema>;

// ── Design token constants ──────────────────────────────────────────────────
const T = {
  ink: '#16161A',
  ink2: '#6B6B73',
  ink3: '#A8A8AE',
  paper: '#FBFAF8',
  surface: '#FFFFFF',
  line: '#ECEAE5',
  accent: '#B8893B',
  coverBg: '#F4F2ED',
  pageBg: '#F4F3F0',
  success: '#2E7D4F',
  successBg: '#ECF6EE',
  danger: '#B43A3A',
  dangerBg: '#FBECEC',
};

// ── Helper: file size string ────────────────────────────────────────────────
function fileSizeStr(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

// ── Friendly API error messages ─────────────────────────────────────────────
function friendlyError(code?: string, fallback?: string): string {
  const map: Record<string, string> = {
    FILE_TOO_LARGE: 'File quá lớn. Ảnh bìa tối đa 5MB, file E-book tối đa 100MB.',
    FILE_TYPE_INVALID: 'Định dạng file không hợp lệ. Ảnh: PNG/JPG; E-book: PDF/EPUB.',
    CATEGORY_NOT_FOUND: 'Danh mục không tồn tại. Vui lòng chọn lại.',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.',
  };
  if (code && map[code]) return map[code];
  return fallback ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

// ── Card wrapper components ─────────────────────────────────────────────────
const Card = ({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.line}`,
      borderRadius: '2px',
      marginBottom: '16px',
    }}
  >
    <div
      style={{
        padding: '16px 20px 14px',
        borderBottom: `1px solid ${T.line}`,
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase' as const,
          color: T.ink3,
        }}
      >
        {label}
        {req && <span style={{ color: T.danger, marginLeft: '4px' }}>*</span>}
      </span>
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

const SideCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.line}`,
      borderRadius: '2px',
      marginBottom: '12px',
    }}
  >
    <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${T.line}` }}>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase' as const,
          color: T.ink3,
        }}
      >
        {label}
      </span>
    </div>
    <div style={{ padding: '16px' }}>{children}</div>
  </div>
);

// ── Field wrapper ───────────────────────────────────────────────────────────
const Field = ({
  label,
  req,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  req?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) => (
  <div style={{ marginBottom: '18px' }}>
    <div
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '.5px',
        textTransform: 'uppercase' as const,
        color: T.ink2,
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {label}
      {req && <span style={{ color: T.danger }}>*</span>}
      {optional && (
        <span
          style={{
            color: T.ink3,
            fontWeight: 400,
            letterSpacing: 0,
            textTransform: 'none' as const,
          }}
        >
          (tùy chọn)
        </span>
      )}
    </div>
    {children}
    {hint && (
      <div style={{ fontSize: '11px', color: T.ink3, marginTop: '4px' }}>{hint}</div>
    )}
    {error && (
      <div style={{ fontSize: '11px', color: T.danger, marginTop: '4px' }}>{error}</div>
    )}
  </div>
);

// ── Input styles ────────────────────────────────────────────────────────────
const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: '100%',
  height: '36px',
  padding: '0 12px',
  border: `1px solid ${hasError ? T.danger : T.line}`,
  borderRadius: '2px',
  background: T.surface,
  fontSize: '13px',
  fontFamily: "'Inter', sans-serif",
  color: T.ink,
  outline: 'none',
});

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '160px',
  padding: '12px',
  border: `1px solid ${T.line}`,
  borderRadius: '2px',
  background: T.surface,
  fontSize: '13px',
  fontFamily: "'Inter', sans-serif",
  color: T.ink,
  outline: 'none',
  resize: 'vertical',
  lineHeight: 1.55,
};

// ── Cover image item ────────────────────────────────────────────────────────
interface CoverItem {
  file?: File;
  previewUrl: string;
  name: string;
  size?: number;
  isExisting?: boolean;
}

// ── Main page component ─────────────────────────────────────────────────────
export const VendorBookFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const bookId = id ? Number(id) : undefined;

  // ── API hooks ──
  const { data: existingBook, isLoading: isLoadingBook } = useGetVendorBookQuery(
    { id: bookId! },
    { skip: !isEdit },
  );
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createVendorBook, { isLoading: isCreating }] = useCreateVendorBookMutation();
  const [updateVendorBook, { isLoading: isUpdating }] = useUpdateVendorBookMutation();

  const isSubmitting = isCreating || isUpdating;

  // ── Local file state ──
  const [coverItems, setCoverItems] = useState<CoverItem[]>([]);
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingFileSize, setExistingFileSize] = useState<number | null>(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [ebookDragOver, setEbookDragOver] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const ebookInputRef = useRef<HTMLInputElement>(null);

  // ── RHF ──
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      status: 'published',
      price: undefined,
    },
  });

  const titleValue = watch('title') ?? '';
  const descValue = watch('description') ?? '';
  const priceValue = watch('price');
  const originalPriceValue = watch('originalPrice');

  // ── Discount badge ──
  const discountPct =
    originalPriceValue &&
    typeof originalPriceValue === 'number' &&
    priceValue &&
    originalPriceValue > priceValue
      ? Math.round((1 - priceValue / originalPriceValue) * 100)
      : null;

  // ── Prefill edit mode ──
  useEffect(() => {
    if (isEdit && existingBook && !prefilled) {
      reset({
        title: existingBook.title,
        description: existingBook.description,
        tableOfContents: Array.isArray(existingBook.tableOfContents)
          ? existingBook.tableOfContents.join('\n')
          : '',
        price: existingBook.price,
        originalPrice: existingBook.originalPrice ?? undefined,
        categoryId: existingBook.categoryId ?? undefined,
        authorName: existingBook.authorName ?? '',
        publisherName: existingBook.publisherName ?? '',
        publishYear: existingBook.publishYear ?? undefined,
        isbn: existingBook.isbn ?? '',
        status: existingBook.status === 'draft' ? 'draft' : 'published',
      });
      // Prefill cover images from existing book
      if (existingBook.images && existingBook.images.length > 0) {
        setCoverItems(
          existingBook.images.map((img) => ({
            previewUrl: img.url,
            name: img.url.split('/').pop() ?? 'cover',
            isExisting: true,
          })),
        );
      } else if (existingBook.coverImageUrl) {
        setCoverItems([
          {
            previewUrl: existingBook.coverImageUrl,
            name: existingBook.coverImageUrl.split('/').pop() ?? 'cover',
            isExisting: true,
          },
        ]);
      }
      // Existing ebook file info
      if (existingBook.fileFormat && existingBook.fileSizeBytes) {
        setExistingFileName(`sach.${existingBook.fileFormat.toLowerCase()}`);
        setExistingFileSize(existingBook.fileSizeBytes);
      }
      setPrefilled(true);
    }
  }, [isEdit, existingBook, prefilled, reset]);

  // ── Cover image handlers ──
  const addCoverFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    setCoverItems((prev) => {
      const remaining = 5 - prev.length;
      const toAdd = arr.slice(0, remaining).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }));
      return [...prev, ...toAdd];
    });
  }, []);

  const removeCover = useCallback((idx: number) => {
    setCoverItems((prev) => {
      const item = prev[idx];
      if (item?.file) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  // ── E-book file handlers ──
  const setEbookFileHandler = useCallback((file: File) => {
    setEbookFile(file);
  }, []);

  const removeEbookFile = useCallback(() => {
    setEbookFile(null);
  }, []);

  // ── Build FormData and submit ──
  const buildAndSubmit = async (values: FormValues, statusOverride?: 'published' | 'draft') => {
    setApiError(null);

    const status = statusOverride ?? values.status;

    // Validation for create mode
    if (!isEdit) {
      if (coverItems.length === 0) {
        setApiError('Vui lòng tải lên ít nhất 1 ảnh bìa.');
        return;
      }
      if (!ebookFile) {
        setApiError('Vui lòng tải lên file E-book (PDF hoặc EPUB).');
        return;
      }
    }

    const fd = new FormData();
    fd.append('title', values.title);
    fd.append('description', values.description);
    if (values.tableOfContents) fd.append('tableOfContents', values.tableOfContents);
    fd.append('price', String(values.price));
    if (values.originalPrice && typeof values.originalPrice === 'number')
      fd.append('originalPrice', String(values.originalPrice));
    fd.append('categoryId', String(values.categoryId));
    fd.append('authorName', values.authorName);
    if (values.publisherName) fd.append('publisherName', values.publisherName);
    if (values.publishYear && typeof values.publishYear === 'number')
      fd.append('publishYear', String(values.publishYear));
    if (values.isbn) fd.append('isbn', values.isbn);
    fd.append('status', status);

    // Append new cover files (skip existing-only items)
    coverItems.forEach((item) => {
      if (item.file) fd.append('covers', item.file);
    });

    // Append ebook file
    if (ebookFile) fd.append('ebookFile', ebookFile);

    try {
      if (isEdit && bookId) {
        await updateVendorBook({ id: bookId, data: fd }).unwrap();
      } else {
        await createVendorBook(fd).unwrap();
      }
      navigate('/vendor/books');
    } catch (err: unknown) {
      const e = err as { data?: { code?: string; message?: string } };
      setApiError(friendlyError(e?.data?.code, e?.data?.message));
    }
  };

  const onSubmit = handleSubmit((values) => buildAndSubmit(values));
  const onSaveDraft = handleSubmit((values) => buildAndSubmit(values, 'draft'));
  const onPublish = handleSubmit((values) => buildAndSubmit(values, 'published'));

  // ── Topbar breadcrumb ──
  const breadcrumb = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.ink2, flex: 1 }}>
      <Link
        to="/vendor/books"
        style={{ color: T.ink2, textDecoration: 'none', transition: 'color .12s' }}
      >
        Quản lý E-book
      </Link>
      <span style={{ color: T.ink3, fontSize: '12px' }}>/</span>
      <span style={{ color: T.ink, fontWeight: 500 }}>
        {isEdit && existingBook
          ? `Sửa: ${existingBook.title}`
          : 'Thêm E-book mới'}
      </span>
    </div>
  );

  const topbarActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={isSubmitting}
        style={{
          height: '32px',
          padding: '0 14px',
          background: 'none',
          color: T.ink,
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '.5px',
          textTransform: 'uppercase' as const,
          border: `1px solid ${T.line}`,
          borderRadius: '2px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.4 : 1,
        }}
      >
        Lưu nháp
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={isSubmitting}
        style={{
          height: '32px',
          padding: '0 14px',
          background: T.ink,
          color: T.paper,
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '.5px',
          textTransform: 'uppercase' as const,
          border: 'none',
          borderRadius: '2px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.4 : 1,
        }}
      >
        Đăng sách
      </button>
    </div>
  );

  if (isEdit && isLoadingBook) {
    return (
      <VendorShell title={breadcrumb}>
        <div style={{ padding: '40px', textAlign: 'center', color: T.ink3, fontSize: '13px' }}>
          Đang tải...
        </div>
      </VendorShell>
    );
  }

  return (
    <VendorShell title={breadcrumb} actions={topbarActions}>
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ padding: '0 0 40px' }}
      >
        {/* API error */}
        {apiError && (
          <div
            style={{
              background: T.dangerBg,
              color: T.danger,
              border: `1px solid rgba(180,58,58,.18)`,
              borderRadius: '2px',
              padding: '10px 14px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r=".8" fill="currentColor" />
            </svg>
            {apiError}
          </div>
        )}

        {/* 2-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* ── Main column ── */}
          <div>
            {/* Thông tin cơ bản */}
            <Card label="Thông tin cơ bản">
              {/* Tên E-book */}
              <Field label="Tên E-book" req error={errors.title?.message}>
                <input
                  type="text"
                  placeholder="Nhập tên E-book..."
                  style={{ ...inputStyle(!!errors.title), height: '44px', fontSize: '16px', fontWeight: 500 }}
                  {...register('title')}
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: T.ink3,
                    textAlign: 'right',
                    marginTop: '4px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {titleValue.length} / 200
                </div>
              </Field>

              {/* Mô tả */}
              <Field label="Mô tả" req error={errors.description?.message}>
                <textarea
                  placeholder="Mô tả nội dung E-book..."
                  style={{ ...textareaStyle, borderColor: errors.description ? T.danger : T.line }}
                  {...register('description')}
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: T.ink3,
                    textAlign: 'right',
                    marginTop: '4px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {descValue.length} ký tự
                </div>
              </Field>

              {/* Mục lục */}
              <Field
                label="Mục lục"
                optional
                hint="Nhập từng chương trên 1 dòng: Chương 1: Tiêu đề"
              >
                <textarea
                  placeholder={'Chương 1: Tiêu đề\nChương 2: Tiêu đề'}
                  style={{ ...textareaStyle, minHeight: '100px' }}
                  {...register('tableOfContents')}
                />
              </Field>
            </Card>

            {/* Ảnh bìa */}
            <Card label="Ảnh bìa" req>
              {/* Preview thumbnails */}
              {coverItems.length > 0 && (
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {coverItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: `1px solid ${T.line}`,
                        borderRadius: '2px',
                        background: T.paper,
                      }}
                    >
                      <div
                        style={{
                          width: '60px',
                          height: '84px',
                          background: T.coverBg,
                          border: `1px solid ${T.line}`,
                          borderRadius: '1px',
                          flexShrink: 0,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {idx === 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              left: '-6px',
                              fontSize: '8px',
                              fontWeight: 700,
                              letterSpacing: '.5px',
                              textTransform: 'uppercase' as const,
                              background: T.ink,
                              color: T.paper,
                              padding: '2px 5px',
                              borderRadius: '2px',
                            }}
                          >
                            Chính
                          </span>
                        )}
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{item.name}</div>
                        {item.size && (
                          <div style={{ fontSize: '11px', color: T.ink3, marginTop: '2px' }}>
                            {fileSizeStr(item.size)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCover(idx)}
                        style={{
                          fontSize: '11px',
                          color: T.ink3,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropzone */}
              {coverItems.length < 5 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCoverDragOver(true);
                  }}
                  onDragLeave={() => setCoverDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCoverDragOver(false);
                    if (e.dataTransfer.files.length > 0) addCoverFiles(e.dataTransfer.files);
                  }}
                  style={{
                    border: `1.5px dashed ${coverDragOver ? T.ink3 : T.line}`,
                    borderRadius: '2px',
                    padding: '28px 20px',
                    textAlign: 'center',
                    background: coverDragOver ? T.coverBg : T.paper,
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div style={{ fontSize: '13px', color: T.ink2, marginBottom: '8px' }}>
                    Kéo thả ảnh vào đây
                  </div>
                  <div style={{ fontSize: '11px', color: T.ink3, marginTop: '4px' }}>
                    PNG, JPG · Tối đa 5MB · Tối đa 5 ảnh
                  </div>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    style={{
                      display: 'inline-block',
                      height: '28px',
                      padding: '0 12px',
                      border: `1px solid ${T.line}`,
                      borderRadius: '2px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: T.ink2,
                      background: T.surface,
                      cursor: 'pointer',
                      marginTop: '8px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Chọn từ máy tính
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        addCoverFiles(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              )}
            </Card>

            {/* File E-book */}
            <Card label="File E-book" req>
              {/* Selected file display */}
              {ebookFile ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: `1px solid ${T.line}`,
                      borderRadius: '2px',
                      background: T.paper,
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{ebookFile.name}</div>
                      <div style={{ fontSize: '11px', color: T.ink3 }}>{fileSizeStr(ebookFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={removeEbookFile}
                      style={{
                        fontSize: '11px',
                        color: T.ink3,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: T.ink3, marginTop: '4px' }}>
                    Chỉ nhận 1 file PDF hoặc EPUB · Tối đa 100MB
                  </div>
                </div>
              ) : existingFileName && isEdit ? (
                // Edit mode: show existing file
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: `1px solid ${T.line}`,
                      borderRadius: '2px',
                      background: T.paper,
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{existingFileName} (đã tải)</div>
                      {existingFileSize && (
                        <div style={{ fontSize: '11px', color: T.ink3 }}>
                          {fileSizeStr(existingFileSize)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => ebookInputRef.current?.click()}
                      style={{
                        fontSize: '11px',
                        color: T.ink2,
                        background: 'none',
                        border: `1px solid ${T.line}`,
                        borderRadius: '2px',
                        padding: '0 8px',
                        height: '24px',
                        cursor: 'pointer',
                      }}
                    >
                      Thay file
                    </button>
                    <input
                      ref={ebookInputRef}
                      type="file"
                      accept=".pdf,.epub,application/pdf,application/epub+zip"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setEbookFileHandler(e.target.files[0]);
                          setExistingFileName(null);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: T.ink3, marginTop: '4px' }}>
                    Chỉ nhận 1 file PDF hoặc EPUB · Tối đa 100MB
                  </div>
                </div>
              ) : (
                // Dropzone
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setEbookDragOver(true);
                    }}
                    onDragLeave={() => setEbookDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setEbookDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) setEbookFileHandler(file);
                    }}
                    style={{
                      border: `1.5px dashed ${ebookDragOver ? T.ink3 : T.line}`,
                      borderRadius: '2px',
                      padding: '28px 20px',
                      textAlign: 'center',
                      background: ebookDragOver ? T.coverBg : T.paper,
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: T.ink2, marginBottom: '8px' }}>
                      Kéo thả file E-book vào đây
                    </div>
                    <div style={{ fontSize: '11px', color: T.ink3, marginTop: '4px' }}>
                      PDF, EPUB · Tối đa 100MB
                    </div>
                    <button
                      type="button"
                      onClick={() => ebookInputRef.current?.click()}
                      style={{
                        display: 'inline-block',
                        height: '28px',
                        padding: '0 12px',
                        border: `1px solid ${T.line}`,
                        borderRadius: '2px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: T.ink2,
                        background: T.surface,
                        cursor: 'pointer',
                        marginTop: '8px',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Chọn từ máy tính
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: T.ink3, marginTop: '4px' }}>
                    Chỉ nhận 1 file PDF hoặc EPUB · Tối đa 100MB
                  </div>
                  <input
                    ref={ebookInputRef}
                    type="file"
                    accept=".pdf,.epub,application/pdf,application/epub+zip"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setEbookFileHandler(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* ── Sidebar column ── */}
          <div>
            <SideCard label="Thông tin xuất bản">
              {/* Giá bán */}
              <Field label="Giá bán" req error={errors.price?.message}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0"
                    min={1}
                    style={{
                      ...inputStyle(!!errors.price),
                      borderRadius: '2px 0 0 2px',
                      flex: 1,
                    }}
                    {...register('price', { valueAsNumber: true })}
                  />
                  <span
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      background: T.coverBg,
                      border: `1px solid ${T.line}`,
                      borderLeft: 'none',
                      borderRadius: '0 2px 2px 0',
                      fontSize: '13px',
                      color: T.ink3,
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    đ
                  </span>
                </div>
              </Field>

              {/* Giá gốc */}
              <Field
                label="Giá gốc"
                optional
                hint={
                  discountPct
                    ? <>Tự tính badge giảm giá: <strong>−{discountPct}%</strong></>
                    : 'Tự tính badge giảm giá khi nhập'
                }
                error={errors.originalPrice?.message as string | undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0"
                    min={1}
                    style={{
                      ...inputStyle(),
                      borderRadius: '2px 0 0 2px',
                      flex: 1,
                    }}
                    {...register('originalPrice', { valueAsNumber: true })}
                  />
                  <span
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      background: T.coverBg,
                      border: `1px solid ${T.line}`,
                      borderLeft: 'none',
                      borderRadius: '0 2px 2px 0',
                      fontSize: '13px',
                      color: T.ink3,
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    đ
                  </span>
                </div>
              </Field>

              {/* Danh mục */}
              <Field label="Danh mục" req error={errors.categoryId?.message}>
                <select
                  style={{ ...inputStyle(!!errors.categoryId), cursor: 'pointer' }}
                  {...register('categoryId', { valueAsNumber: true })}
                >
                  <option value="">Chọn danh mục...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Tác giả */}
              <Field label="Tác giả" req error={errors.authorName?.message}>
                <input
                  type="text"
                  placeholder="Tên tác giả"
                  style={inputStyle(!!errors.authorName)}
                  {...register('authorName')}
                />
              </Field>

              {/* Nhà xuất bản */}
              <Field label="Nhà xuất bản">
                <input
                  type="text"
                  placeholder="NXB Thông tin và Truyền thông"
                  style={inputStyle()}
                  {...register('publisherName')}
                />
              </Field>

              {/* Năm xuất bản */}
              <Field label="Năm xuất bản" error={errors.publishYear?.message as string | undefined}>
                <input
                  type="number"
                  placeholder="2026"
                  min={1000}
                  max={9999}
                  style={{ ...inputStyle(), width: '100px' }}
                  {...register('publishYear', { valueAsNumber: true })}
                />
              </Field>

              {/* ISBN */}
              <Field label="ISBN" optional>
                <input
                  type="text"
                  placeholder="978-604-..."
                  style={inputStyle()}
                  {...register('isbn')}
                />
              </Field>
            </SideCard>

            {/* Trạng thái */}
            <SideCard label="Trạng thái">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Công khai */}
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      value="published"
                      style={{ accentColor: T.ink }}
                      {...register('status')}
                    />
                    <span style={{ fontSize: '13px' }}>Công khai</span>
                  </label>
                </div>
                {/* Lưu nháp */}
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      value="draft"
                      style={{ accentColor: T.ink }}
                      {...register('status')}
                    />
                    <span style={{ fontSize: '13px' }}>Lưu nháp</span>
                  </label>
                  <div
                    style={{
                      fontSize: '11px',
                      color: T.ink3,
                      marginLeft: '22px',
                      marginTop: '-2px',
                    }}
                  >
                    Không hiển thị với khách hàng
                  </div>
                </div>
              </div>
            </SideCard>
          </div>
        </div>
      </form>
    </VendorShell>
  );
};
