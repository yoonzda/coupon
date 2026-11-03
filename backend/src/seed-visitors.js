const pool = require('./config/database');

async function reseed() {
  console.log('🚀 [Seed] visitor_logs UTF-8 데이터 정리 및 재적재 시작...');

  await pool.execute('DELETE FROM visitor_logs');
  console.log('🗑️ 기존 visitor_logs 삭제 완료');

  const logs = [
    // 7일 전
    { vid: 'v_user_101', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://search.naver.com', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 7, addHours: 2 },
    { vid: 'v_user_102', uid: null, role: 'guest', name: null, url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '211.234.56.78', ua: 'Mozilla/5.0 (Linux; Android 14; Galaxy S24)', dev: 'mobile', os: 'Android', br: 'Samsung Internet', minusDays: 7, addHours: 3 },
    { vid: 'v_user_103', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://m.daum.net', ip: '175.201.88.99', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', dev: 'desktop', os: 'Windows 10/11', br: 'Chrome', minusDays: 7, addHours: 5 },

    // 6일 전
    { vid: 'v_user_101', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/mypage.html', title: '마이페이지 (내 쿠폰함)', ref: '', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 6, addHours: 1 },
    { vid: 'v_user_104', uid: 2, role: 'tourist', name: '김옹진', url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://www.google.com', ip: '58.120.33.12', ua: 'Mozilla/5.0 (Linux; Android 13; Galaxy Note)', dev: 'mobile', os: 'Android', br: 'Chrome', minusDays: 6, addHours: 3 },
    { vid: 'v_user_105', uid: null, role: 'guest', name: null, url: '/tourist/about-pass.html', title: '옹진 아일랜드 패스 안내', ref: '', ip: '210.99.14.88', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', dev: 'desktop', os: 'macOS', br: 'Whale', minusDays: 6, addHours: 7 },

    // 5일 전
    { vid: 'v_user_106', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://search.naver.com', ip: '220.78.90.11', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 5, addHours: 2 },
    { vid: 'v_user_107', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 5, addHours: 4 },
    { vid: 'v_user_108', uid: null, role: 'guest', name: null, url: '/merchant/index.html', title: '가맹점 관리자 포털', ref: '', ip: '112.187.65.43', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', dev: 'desktop', os: 'Windows 10/11', br: 'Edge', minusDays: 5, addHours: 6 },

    // 4일 전
    { vid: 'v_user_109', uid: 2, role: 'tourist', name: '김옹진', url: '/tourist/mypage.html', title: '마이페이지 (내 쿠폰함)', ref: '', ip: '58.120.33.12', ua: 'Mozilla/5.0 (Linux; Android 13)', dev: 'mobile', os: 'Android', br: 'KakaoTalk', minusDays: 4, addHours: 1 },
    { vid: 'v_user_110', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: '', ip: '218.150.22.88', ua: 'Mozilla/5.0 (Linux; Android 14)', dev: 'mobile', os: 'Android', br: 'Chrome', minusDays: 4, addHours: 4 },
    { vid: 'v_user_111', uid: null, role: 'guest', name: null, url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '182.222.11.44', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1)', dev: 'tablet', os: 'iOS', br: 'Safari', minusDays: 4, addHours: 5 },

    // 3일 전
    { vid: 'v_user_112', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://instagram.com', ip: '125.180.77.66', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 3, addHours: 3 },
    { vid: 'v_user_113', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/index.html', title: '관광객 메인 홈', ref: '', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 3, addHours: 4 },
    { vid: 'v_user_114', uid: null, role: 'guest', name: null, url: '/tourist/about-pass.html', title: '옹진 아일랜드 패스 안내', ref: '', ip: '211.55.88.99', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', dev: 'desktop', os: 'Windows 10/11', br: 'Whale', minusDays: 3, addHours: 6 },

    // 2일 전
    { vid: 'v_user_115', uid: 2, role: 'tourist', name: '김옹진', url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '58.120.33.12', ua: 'Mozilla/5.0 (Linux; Android 13)', dev: 'mobile', os: 'Android', br: 'Chrome', minusDays: 2, addHours: 1 },
    { vid: 'v_user_116', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://search.naver.com', ip: '118.235.12.34', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 2, addHours: 4 },
    { vid: 'v_user_117', uid: null, role: 'guest', name: null, url: '/tourist/kiosk-demo.html', title: '키오스크 발권 체험', ref: '', ip: '121.160.44.55', ua: 'Mozilla/5.0 (Windows NT 10.0)', dev: 'desktop', os: 'Windows 10/11', br: 'Chrome', minusDays: 2, addHours: 7 },

    // 어제
    { vid: 'v_user_120', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://search.naver.com', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 1, addHours: 2 },
    { vid: 'v_user_121', uid: 2, role: 'tourist', name: '김옹진', url: '/tourist/mypage.html', title: '마이페이지 (내 쿠폰함)', ref: '', ip: '58.120.33.12', ua: 'Mozilla/5.0 (Linux; Android 13)', dev: 'mobile', os: 'Android', br: 'Chrome', minusDays: 1, addHours: 3 },
    { vid: 'v_user_122', uid: null, role: 'guest', name: null, url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '211.234.56.78', ua: 'Mozilla/5.0 (Linux; Android 14)', dev: 'mobile', os: 'Android', br: 'Samsung Internet', minusDays: 1, addHours: 5 },
    { vid: 'v_user_123', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: '', ip: '175.201.88.99', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', dev: 'desktop', os: 'Windows 10/11', br: 'Chrome', minusDays: 1, addHours: 6 },
    { vid: 'v_user_124', uid: null, role: 'guest', name: null, url: '/tourist/about-pass.html', title: '옹진 아일랜드 패스 안내', ref: 'https://m.daum.net', ip: '220.78.90.11', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 1, addHours: 8 },

    // 오늘 (시간대별)
    { vid: 'v_today_01', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://search.naver.com', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 0, addHours: -3 },
    { vid: 'v_today_01', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 0, addHours: -2 },
    { vid: 'v_today_02', uid: 2, role: 'tourist', name: '김옹진', url: '/tourist/mypage.html', title: '마이페이지 (내 쿠폰함)', ref: '', ip: '58.120.33.12', ua: 'Mozilla/5.0 (Linux; Android 14; Galaxy S24)', dev: 'mobile', os: 'Android', br: 'Chrome', minusDays: 0, addHours: -2 },
    { vid: 'v_today_03', uid: null, role: 'guest', name: null, url: '/tourist/index.html', title: '관광객 메인 홈', ref: 'https://m.daum.net', ip: '211.234.56.78', ua: 'Mozilla/5.0 (Linux; Android 14)', dev: 'mobile', os: 'Android', br: 'Samsung Internet', minusDays: 0, addHours: -1 },
    { vid: 'v_today_04', uid: null, role: 'guest', name: null, url: '/tourist/about-pass.html', title: '옹진 아일랜드 패스 안내', ref: 'https://google.com', ip: '175.201.88.99', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', dev: 'desktop', os: 'Windows 10/11', br: 'Whale', minusDays: 0, addHours: -1 },
    { vid: 'v_today_05', uid: null, role: 'guest', name: null, url: '/tourist/map.html', title: '가맹점 지도 검색', ref: '', ip: '220.78.90.11', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 0, addHours: 0 },

    // 오늘 실시간 (최근 10분 이내)
    { vid: 'v_today_rt1', uid: 3, role: 'tourist', name: 'poorbear', url: '/tourist/index.html', title: '관광객 메인 홈', ref: '', ip: '121.134.12.45', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', dev: 'mobile', os: 'iOS', br: 'Safari', minusDays: 0, addMinutes: -4 },
    { vid: 'v_today_rt2', uid: null, role: 'guest', name: null, url: '/tourist/map.html', title: '가맹점 지도 검색', ref: 'https://m.search.naver.com', ip: '182.222.11.44', ua: 'Mozilla/5.0 (iPad; CPU OS 17_2)', dev: 'tablet', os: 'iOS', br: 'Safari', minusDays: 0, addMinutes: -2 },
    { vid: 'v_today_rt3', uid: null, role: 'guest', name: null, url: '/admin/visitor-stats.html', title: '접속자 통계 분석', ref: '', ip: '127.0.0.1', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', dev: 'desktop', os: 'Windows 10/11', br: 'Edge', minusDays: 0, addMinutes: -1 }
  ];

  for (const item of logs) {
    let dateExpr;
    if (item.addMinutes !== undefined) {
      dateExpr = `NOW() - INTERVAL ${Math.abs(item.addMinutes)} MINUTE`;
    } else if (item.minusDays === 0) {
      dateExpr = `NOW() - INTERVAL ${Math.abs(item.addHours || 1)} HOUR`;
    } else {
      dateExpr = `NOW() - INTERVAL ${item.minusDays} DAY + INTERVAL ${item.addHours || 0} HOUR`;
    }

    await pool.execute(
      `INSERT INTO visitor_logs 
        (visitor_id, user_id, user_role, user_identifier, page_url, page_title, referrer, ip_address, user_agent, device_type, os, browser, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${dateExpr})`,
      [
        item.vid,
        item.uid,
        item.role,
        item.name,
        item.url,
        item.title,
        item.ref || null,
        item.ip,
        item.ua,
        item.dev,
        item.os,
        item.br
      ]
    );
  }

  console.log(`✅ [Seed] 총 ${logs.length}건 UTF-8 한글 시드 데이터 적재 성공!`);
  process.exit(0);
}

reseed().catch(err => {
  console.error('❌ 시드 에러:', err);
  process.exit(1);
});
