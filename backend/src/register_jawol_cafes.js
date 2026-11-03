require('dotenv').config({ path: '/home/www/Ongjin_coupon/backend/.env' });
const pool = require('./config/database');
const bcrypt = require('bcryptjs');
const { hashPhone } = require('./utils/crypto');

const cafes = [
  {
    name: '자월담',
    owner_name: '자월담 대표',
    phone: '010-1383-3273',
    store_phone: '0507-1383-3273',
    username: 'jawoldam',
    category: '카페/베이커리',
    address: '인천광역시 옹진군 자월면 자월서로 110 1층 자월담',
    lat: 37.2508494,
    lng: 126.3118992,
    business_hours: '10:00 ~ 19:00',
    description: '자월도 바다를 바라보며 즐기는 갓 구운 베이커리와 스페셜티 커피 전문점',
    images: JSON.stringify(['https://ldb-phinf.pstatic.net/20260728_170/1785201956454azsHa_JPEG/image.jpg']),
    menus: [
      { name: '자월 소금빵', price: 3500, description: '겉바속촉 자월도 대표 수제 소금빵', is_signature: 1 },
      { name: '아메리카노', price: 5000, description: '고소하고 깔끔한 스페셜티 아메리카노', is_signature: 1 },
      { name: '카페라떼', price: 5500, description: '부드러운 우유와 에스프레소의 조화', is_signature: 0 }
    ]
  },
  {
    name: '자월달빛카페',
    owner_name: '자월달빛 대표',
    phone: '010-831-7031',
    store_phone: '032-831-7031',
    username: 'moonlight',
    category: '카페/베이커리',
    address: '인천광역시 옹진군 자월면 자월동로 1',
    lat: 37.2446696,
    lng: 126.3182676,
    business_hours: '09:00 ~ 18:00 (여객선 운항 시간 연동)',
    description: '자월도 선착장 바로 앞, 여행 전후 편안한 휴식을 제공하는 전망 좋은 카페',
    images: JSON.stringify(['https://ldb-phinf.pstatic.net/20260728_170/1785201956454azsHa_JPEG/image.jpg']),
    menus: [
      { name: '달빛 아메리카노', price: 4500, description: '선착장 뷰와 함께 즐기는 진한 아메리카노', is_signature: 1 },
      { name: '수제 유자차', price: 5000, description: '달콤 상큼한 따뜻한 전통 수제차', is_signature: 0 },
      { name: '헤이즐넛 아메리카노', price: 5000, description: '향긋한 헤이즐넛 풍미의 커피', is_signature: 0 }
    ]
  },
  {
    name: '써니하우스 카페',
    owner_name: '써니하우스 대표',
    phone: '010-858-0633',
    store_phone: '032-858-0633',
    username: 'sunnyhouse',
    category: '카페/베이커리',
    address: '인천광역시 옹진군 자월면 자월서로200번길 1',
    lat: 37.2536845,
    lng: 126.3035213,
    business_hours: '10:00 ~ 20:00',
    description: '아름다운 자연 속에서 즐기는 힐링 티타임과 향긋한 원두 커피',
    images: JSON.stringify(['https://ldb-phinf.pstatic.net/20200517_9/1589692361085kQ9fQ_JPEG/SZMV3cXoHCQWpp1qV9rC_Vmr.jpg']),
    menus: [
      { name: '써니 핸드드립', price: 6000, description: '정성껏 내린 풍부한 향의 핸드드립 커피', is_signature: 1 },
      { name: '바닐라 라떼', price: 5500, description: '달콤한 바닐라빈 시럽 라떼', is_signature: 0 },
      { name: '카모마일 허브티', price: 5000, description: '마음을 편안하게 해주는 허브티', is_signature: 0 }
    ]
  },
  {
    name: '온비치422',
    owner_name: '온비치422 대표',
    phone: '010-1324-1411',
    store_phone: '0507-1324-1411',
    username: 'onbeach422',
    category: '카페/베이커리',
    address: '인천광역시 옹진군 자월면 자월서로 94-1 온비치422 103,104호',
    lat: 37.2504181,
    lng: 126.3133108,
    business_hours: '10:00 ~ 21:00',
    description: '자월도 해변가에 위치한 트렌디한 오션뷰 디저트 카페 & 음료',
    images: JSON.stringify(['https://ldb-phinf.pstatic.net/20240729_231/1722216829093g5Y42_JPEG/20240717_195834.jpg']),
    menus: [
      { name: '온비치 시그니처 라떼', price: 6500, description: '부드러운 크림이 올라간 시그니처 음료', is_signature: 1 },
      { name: '오션 블루 에이드', price: 6000, description: '자월도 청정 바다를 담은 청량한 탄산 에이드', is_signature: 1 },
      { name: '플레인 크로플', price: 7000, description: '바삭하고 쫀득한 크로와상 와플', is_signature: 0 }
    ]
  },
  {
    name: '하늘다을천문공원카페',
    owner_name: '천문공원카페 대표',
    phone: '010-831-7032',
    store_phone: '032-831-7031',
    username: 'skycafe',
    category: '카페/베이커리',
    address: '인천광역시 옹진군 자월면 자월리 1511',
    lat: 37.2624683,
    lng: 126.2877302,
    business_hours: '10:00 ~ 22:00 (월요일 정기휴관)',
    description: '자월도 달빛바람 천문공원 내 위치한 뷰 맛집 전망 휴게 카페',
    images: JSON.stringify(['https://ldb-phinf.pstatic.net/20260728_170/1785201956454azsHa_JPEG/image.jpg']),
    menus: [
      { name: '은하수 에이드', price: 6000, description: '밤하늘 별빛을 형상화한 신비로운 시그니처 에이드', is_signature: 1 },
      { name: '별빛 아메리카노', price: 4500, description: '깔끔하고 깊은 풍미의 천문 아메리카노', is_signature: 0 },
      { name: '달빛 대추생강차', price: 5500, description: '천문대 관측 후 몸을 녹여주는 전통 수제차', is_signature: 0 }
    ]
  }
];

async function run() {
  console.log('🚀 자월도 카페 5개 가맹점 등록 시작...');
  const defaultPw = await bcrypt.hash('jawol1234!', 10);

  for (const cafe of cafes) {
    const cleanDigits = cafe.phone.replace(/\D/g, '');
    const phoneHash = hashPhone(cleanDigits);

    // 1. 이미 등록되어 있는지 확인
    const [existing] = await pool.execute(
      'SELECT id, name FROM merchants WHERE name = ? OR phone_hash = ? OR username = ?',
      [cafe.name, phoneHash, cafe.username]
    );

    let merchantId;
    if (existing.length > 0) {
      merchantId = existing[0].id;
      console.log(`ℹ️ [이미 존재함 - 정보 업데이트] ID: ${merchantId}, 상호: ${cafe.name}`);
      await pool.execute(
        `UPDATE merchants SET
          name = ?, owner_name = ?, phone = ?, phone_hash = ?, store_phone = ?,
          username = ?, password_hash = ?, category = ?, address = ?, lat = ?, lng = ?,
          business_hours = ?, description = ?, images = ?, status = 'approved',
          approved_at = NOW(), approved_by = 1
         WHERE id = ?`,
        [
          cafe.name, cafe.owner_name, cafe.phone, phoneHash, cafe.store_phone,
          cafe.username, defaultPw, cafe.category, cafe.address, cafe.lat, cafe.lng,
          cafe.business_hours, cafe.description, cafe.images, merchantId
        ]
      );
    } else {
      const [res] = await pool.execute(
        `INSERT INTO merchants (
          name, owner_name, phone, phone_hash, store_phone,
          username, password_hash, category, address, lat, lng,
          business_hours, description, images, status,
          applied_at, approved_at, approved_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 'approved',
          NOW(), NOW(), 1
        )`,
        [
          cafe.name, cafe.owner_name, cafe.phone, phoneHash, cafe.store_phone,
          cafe.username, defaultPw, cafe.category, cafe.address, cafe.lat, cafe.lng,
          cafe.business_hours, cafe.description, cafe.images
        ]
      );
      merchantId = res.insertId;
      console.log(`✅ [신규 등록 완료] ID: ${merchantId}, 상호: ${cafe.name}`);
    }

    // 2. 메뉴 등록 (기존 메뉴 삭제 후 재등록)
    await pool.execute('DELETE FROM merchant_menus WHERE merchant_id = ?', [merchantId]);
    for (let i = 0; i < cafe.menus.length; i++) {
      const menu = cafe.menus[i];
      await pool.execute(
        `INSERT INTO merchant_menus (
          merchant_id, name, price, description, is_signature, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, menu.name, menu.price, menu.description, menu.is_signature, i]
      );
    }
    console.log(`   -> 메뉴 ${cafe.menus.length}개 등록 완료`);
  }

  console.log('🎉 모든 자월도 카페 가맹점 및 메뉴 등록이 완료되었습니다!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ 등록 중 오류 발생:', err);
  process.exit(1);
});
