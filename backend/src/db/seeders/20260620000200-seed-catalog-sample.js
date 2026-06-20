'use strict';
require('dotenv').config();
const bcrypt = require('bcrypt');

const VENDOR_EMAIL = 'vendor@uteshop.com';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // ── 1. Categories ────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('categories', [
      { name: 'Văn học',          slug: 'van-hoc',          parent_id: null, sort_order: 1, created_at: now },
      { name: 'Kinh tế - Kỹ năng', slug: 'kinh-te-ky-nang', parent_id: null, sort_order: 2, created_at: now },
      { name: 'Khoa học - Công nghệ', slug: 'khoa-hoc-cong-nghe', parent_id: null, sort_order: 3, created_at: now },
      { name: 'Thiếu nhi',        slug: 'thieu-nhi',        parent_id: null, sort_order: 4, created_at: now },
    ]);

    // ── 2. Authors ───────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('authors', [
      { name: 'Dale Carnegie',    slug: 'dale-carnegie',    bio: 'Nhà văn & diễn giả người Mỹ nổi tiếng với các tác phẩm phát triển bản thân.', created_at: now },
      { name: 'Napoleon Hill',    slug: 'napoleon-hill',    bio: 'Tác giả của kiệt tác Nghĩ giàu làm giàu.', created_at: now },
      { name: 'Nam Quốc Cường',   slug: 'nam-quoc-cuong',   bio: null, created_at: now },
      { name: 'Nguyễn Nhật Ánh', slug: 'nguyen-nhat-anh',  bio: 'Nhà văn Việt Nam nổi tiếng với văn học thiếu nhi và tuổi trẻ.', created_at: now },
    ]);

    // ── 3. Publishers ────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('publishers', [
      { name: 'NXB Trẻ',        slug: 'nxb-tre',        created_at: now },
      { name: 'NXB Tổng Hợp',   slug: 'nxb-tong-hop',   created_at: now },
      { name: 'Alpha Books',    slug: 'alpha-books',    created_at: now },
    ]);

    // ── 4. Demo vendor user (find-or-create) ─────────────────────────────────
    const [existingVendors] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: VENDOR_EMAIL }, type: Sequelize.QueryTypes.SELECT },
    );

    let vendorUserId;
    if (existingVendors) {
      vendorUserId = existingVendors.id;
    } else {
      const vendorHash = await bcrypt.hash('Vendor@12345', 10);
      await queryInterface.bulkInsert('users', [
        {
          email: VENDOR_EMAIL,
          password_hash: vendorHash,
          role: 'vendor',
          full_name: 'Demo Vendor',
          status: 'active',
          email_verified_at: now,
          created_at: now,
          updated_at: now,
        },
      ]);
      const [newVendor] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = :email LIMIT 1`,
        { replacements: { email: VENDOR_EMAIL }, type: Sequelize.QueryTypes.SELECT },
      );
      vendorUserId = newVendor.id;

      await queryInterface.bulkInsert('vendors', [
        {
          user_id: vendorUserId,
          shop_name: 'Athena Demo Store',
          shop_slug: 'athena-demo-store',
          description: 'Cửa hàng sách điện tử mẫu cho Athena.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    // ── 5. Fetch IDs for FK references ───────────────────────────────────────
    const fetchId = async (table, slug) => {
      const [row] = await queryInterface.sequelize.query(
        `SELECT id FROM ${table} WHERE slug = :slug LIMIT 1`,
        { replacements: { slug }, type: Sequelize.QueryTypes.SELECT },
      );
      return row ? row.id : null;
    };

    const catVanHoc      = await fetchId('categories', 'van-hoc');
    const catKinhTe      = await fetchId('categories', 'kinh-te-ky-nang');
    const catKhoaHoc     = await fetchId('categories', 'khoa-hoc-cong-nghe');
    const catThieuNhi    = await fetchId('categories', 'thieu-nhi');

    const authDale       = await fetchId('authors', 'dale-carnegie');
    const authNapoleon   = await fetchId('authors', 'napoleon-hill');
    const authNamCuong   = await fetchId('authors', 'nam-quoc-cuong');
    const authNhatanh    = await fetchId('authors', 'nguyen-nhat-anh');

    const pubNxbTre      = await fetchId('publishers', 'nxb-tre');
    const pubNxbTongHop  = await fetchId('publishers', 'nxb-tong-hop');
    const pubAlpha       = await fetchId('publishers', 'alpha-books');

    // ── 6. Books ─────────────────────────────────────────────────────────────
    const publishedAt = new Date('2024-01-15');
    await queryInterface.bulkInsert('books', [
      {
        vendor_user_id: vendorUserId,
        title: 'Đắc Nhân Tâm',
        slug: 'dac-nhan-tam',
        author_id: authDale,
        publisher_id: pubAlpha,
        category_id: catKinhTe,
        description: 'Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử của Dale Carnegie.',
        price: 89000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 13002342,
        cover_image_url: '/uploads/covers/dac-nhan-tam.jpg',
        status: 'published',
        purchase_count: 2341,
        view_count: 15200,
        rating_avg: 4.80,
        rating_count: 1248,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Nghĩ Giàu Làm Giàu',
        slug: 'nghi-giau-lam-giau',
        author_id: authNapoleon,
        publisher_id: pubAlpha,
        category_id: catKinhTe,
        description: 'Cuốn sách nổi tiếng nhất của Napoleon Hill về tư duy thành công và làm giàu.',
        price: 75000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 9800000,
        cover_image_url: '/uploads/covers/nghi-giau-lam-giau.jpg',
        status: 'published',
        purchase_count: 1890,
        view_count: 12400,
        rating_avg: 4.70,
        rating_count: 980,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Tôi Tài Giỏi Bạn Cũng Thế',
        slug: 'toi-tai-gioi-ban-cung-the',
        author_id: authNamCuong,
        publisher_id: pubNxbTongHop,
        category_id: catKinhTe,
        description: 'Cuốn sách kỹ năng học tập và phát triển bản thân dành cho học sinh, sinh viên.',
        price: 65000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 7500000,
        cover_image_url: '/uploads/covers/toi-tai-gioi.jpg',
        status: 'published',
        purchase_count: 1230,
        view_count: 8900,
        rating_avg: 4.50,
        rating_count: 720,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Mắt Biếc',
        slug: 'mat-biec',
        author_id: authNhatanh,
        publisher_id: pubNxbTre,
        category_id: catVanHoc,
        description: 'Câu chuyện tình yêu đẹp và buồn của Ngạn dành cho Hà Lan qua nhiều năm tháng tuổi thơ.',
        price: 55000,
        currency: 'VND',
        file_format: 'EPUB',
        file_size_bytes: 3200000,
        cover_image_url: '/uploads/covers/mat-biec.jpg',
        status: 'published',
        purchase_count: 1560,
        view_count: 11200,
        rating_avg: 4.90,
        rating_count: 1100,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ',
        slug: 'cho-toi-xin-mot-ve-di-tuoi-tho',
        author_id: authNhatanh,
        publisher_id: pubNxbTre,
        category_id: catVanHoc,
        description: 'Chuyến hành trình về tuổi thơ ngây thơ, vô tư với những trò chơi, trí tưởng tượng phong phú.',
        price: 50000,
        currency: 'VND',
        file_format: 'EPUB',
        file_size_bytes: 2800000,
        cover_image_url: '/uploads/covers/ve-di-tuoi-tho.jpg',
        status: 'published',
        purchase_count: 1320,
        view_count: 9600,
        rating_avg: 4.85,
        rating_count: 890,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Đất Rừng Phương Nam',
        slug: 'dat-rung-phuong-nam',
        author_id: null,
        publisher_id: pubNxbTre,
        category_id: catVanHoc,
        description: 'Tác phẩm kinh điển của văn học Việt Nam, kể về cậu bé An lưu lạc ở vùng đất Nam Bộ hoang dã.',
        price: 60000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 5400000,
        cover_image_url: '/uploads/covers/dat-rung-phuong-nam.jpg',
        status: 'published',
        purchase_count: 980,
        view_count: 7200,
        rating_avg: 4.75,
        rating_count: 640,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Lập Trình Python Cơ Bản',
        slug: 'lap-trinh-python-co-ban',
        author_id: null,
        publisher_id: pubNxbTongHop,
        category_id: catKhoaHoc,
        description: 'Hướng dẫn lập trình Python từ cơ bản đến nâng cao, phù hợp cho người mới bắt đầu.',
        price: 120000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 18500000,
        cover_image_url: '/uploads/covers/python-co-ban.jpg',
        status: 'published',
        purchase_count: 760,
        view_count: 6300,
        rating_avg: 4.60,
        rating_count: 520,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Nhà Giả Kim',
        slug: 'nha-gia-kim',
        author_id: null,
        publisher_id: pubNxbTre,
        category_id: catVanHoc,
        description: 'Tiểu thuyết huyền thoại của Paulo Coelho kể về hành trình theo đuổi giấc mơ.',
        price: 72000,
        currency: 'VND',
        file_format: 'EPUB',
        file_size_bytes: 2100000,
        cover_image_url: '/uploads/covers/nha-gia-kim.jpg',
        status: 'published',
        purchase_count: 2100,
        view_count: 14800,
        rating_avg: 4.92,
        rating_count: 1620,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Atomic Habits',
        slug: 'atomic-habits',
        author_id: null,
        publisher_id: pubAlpha,
        category_id: catKinhTe,
        description: 'Cuốn sách về việc xây dựng thói quen tốt và phá vỡ thói quen xấu của James Clear.',
        price: 95000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 11200000,
        cover_image_url: '/uploads/covers/atomic-habits.jpg',
        status: 'published',
        purchase_count: 1780,
        view_count: 13100,
        rating_avg: 4.88,
        rating_count: 1450,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
      {
        vendor_user_id: vendorUserId,
        title: 'Doraemon Tập 1',
        slug: 'doraemon-tap-1',
        author_id: null,
        publisher_id: pubNxbTre,
        category_id: catThieuNhi,
        description: 'Phiêu lưu cùng Doraemon và Nobita với những món đồ chơi kỳ diệu từ tương lai.',
        price: 35000,
        currency: 'VND',
        file_format: 'PDF',
        file_size_bytes: 4500000,
        cover_image_url: '/uploads/covers/doraemon-1.jpg',
        status: 'published',
        purchase_count: 3200,
        view_count: 21500,
        rating_avg: 4.95,
        rating_count: 2100,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Delete in reverse FK order
    const bookSlugs = [
      'dac-nhan-tam', 'nghi-giau-lam-giau', 'toi-tai-gioi-ban-cung-the',
      'mat-biec', 'cho-toi-xin-mot-ve-di-tuoi-tho', 'dat-rung-phuong-nam',
      'lap-trinh-python-co-ban', 'nha-gia-kim', 'atomic-habits', 'doraemon-tap-1',
    ];
    await queryInterface.bulkDelete('books', {
      slug: { [Sequelize.Op.in]: bookSlugs },
    });
    await queryInterface.bulkDelete('authors', {
      slug: { [Sequelize.Op.in]: ['dale-carnegie', 'napoleon-hill', 'nam-quoc-cuong', 'nguyen-nhat-anh'] },
    });
    await queryInterface.bulkDelete('publishers', {
      slug: { [Sequelize.Op.in]: ['nxb-tre', 'nxb-tong-hop', 'alpha-books'] },
    });
    await queryInterface.bulkDelete('categories', {
      slug: { [Sequelize.Op.in]: ['van-hoc', 'kinh-te-ky-nang', 'khoa-hoc-cong-nghe', 'thieu-nhi'] },
    });
    // Remove demo vendor user + vendor row if created by this seeder
    const [vendorUser] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: 'vendor@uteshop.com' }, type: Sequelize.QueryTypes.SELECT },
    );
    if (vendorUser) {
      await queryInterface.bulkDelete('vendors', { user_id: vendorUser.id });
      await queryInterface.bulkDelete('users', { id: vendorUser.id });
    }
  },
};
