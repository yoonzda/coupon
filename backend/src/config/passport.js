const passport = require('passport');
const KakaoStrategy = require('passport-kakao').Strategy;
const NaverStrategy = require('passport-naver').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateSocialUser } = require('../services/authService');

function normalizeKoreanPhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  const domestic = digits.startsWith('82') ? '0' + digits.slice(2) : digits;
  if (/^01[0-9]{8,9}$/.test(domestic)) {
    return domestic.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  }
  return null;
}

function initPassport() {
  // ── 카카오 ────────────────────────────────────
  if (process.env.KAKAO_CLIENT_ID) {
    const kakaoStrategy = new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET || 'kakao',
        callbackURL: process.env.KAKAO_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const rawKakaoName = profile._json?.kakao_account?.name
            || profile.displayName
            || profile._json?.kakao_account?.profile?.nickname
            || profile._json?.properties?.nickname
            || profile.username
            || (profile._json?.kakao_account?.email ? profile._json.kakao_account.email.split('@')[0] : null);

          const rawKakaoPhone = profile._json?.kakao_account?.phone_number;
          const kakaoPhone = normalizeKoreanPhone(rawKakaoPhone);

          const user = await findOrCreateSocialUser({
            provider: 'kakao',
            providerId: String(profile.id),
            nickname: rawKakaoName,
            email: profile._json?.kakao_account?.email || null,
            phone: kakaoPhone,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    );

    // KAKAO_CLIENT_SECRET이 없는 경우 카카오 API로 client_secret 파라미터 전송 방지 (Bad client credentials 방지)
    if (!process.env.KAKAO_CLIENT_SECRET) {
      const querystring = require('querystring');
      kakaoStrategy._oauth2.getOAuthAccessToken = function (code, params, callback) {
        params = params || {};
        params['client_id'] = this._clientId;
        // 카카오에 client_secret을 보내지 않음
        const codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
        params[codeParam] = code;

        const post_data = querystring.stringify(params);
        const post_headers = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };

        this._request("POST", this._getAccessTokenUrl(), post_headers, post_data, null, function (error, data, response) {
          if (error) {
            callback(error);
          } else {
            let results;
            try {
              results = JSON.parse(data);
            } catch (e) {
              results = querystring.parse(data);
            }
            const access_token = results["access_token"];
            const refresh_token = results["refresh_token"];
            delete results["refresh_token"];
            callback(null, access_token, refresh_token, results);
          }
        });
      };
    }

    passport.use(kakaoStrategy);
  }

  // ── 네이버 ────────────────────────────────────
  if (process.env.NAVER_CLIENT_ID) {
    const naverStrategy = new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: process.env.NAVER_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 실명(name) > 닉네임(nickname) > 이메일 ID 순
          const rawName = profile._json?.name || profile.name || profile.displayName || profile._json?.nickname || null;
          const rawNaverPhone = profile._json?.mobile || profile.mobile;
          const naverPhone = normalizeKoreanPhone(rawNaverPhone);

          const user = await findOrCreateSocialUser({
            provider: 'naver',
            providerId: String(profile.id),
            nickname: rawName,
            email: profile.email || profile.emails?.[0]?.value || profile._json?.email || null,
            phone: naverPhone,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    );

    // 네이버 사용자 프로필 API에서 실명(name) 및 전체 필드가 누락되지 않도록 userProfile 오버라이드
    naverStrategy.userProfile = function (accessToken, done) {
      this._oauth2.get(this._profileURL, accessToken, (err, body) => {
        if (err) return done(err);
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsed.resultcode !== '00') {
            return done(new Error(parsed.message || '네이버 프로필 조회 실패'));
          }
          const res = parsed.response || {};
          const profile = {
            provider: 'naver',
            id: res.id,
            displayName: res.name || res.nickname || (res.email ? res.email.split('@')[0] : '네이버 회원'),
            name: res.name,
            emails: res.email ? [{ value: res.email }] : [],
            mobile: res.mobile || null,
            _json: res,
          };
          done(null, profile);
        } catch (e) {
          done(e);
        }
      });
    };

    passport.use(naverStrategy);
  }

  // ── 구글 ─────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const rawName = profile.displayName || profile.name?.givenName || (profile.emails?.[0]?.value ? profile.emails[0].value.split('@')[0] : null);
          const user = await findOrCreateSocialUser({
            provider: 'google',
            providerId: String(profile.id),
            nickname: rawName,
            email: profile.emails?.[0]?.value || null,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    ));
  }
}

module.exports = { initPassport };
